import { Handler } from '@netlify/functions';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseRpc } from './lib/supabase';
import { getVaultAmounts } from './lib/solana';

type StateRow = {
  play_balance_raw: number | string;
  escrow_observed_raw: number | string;
  needs_finalization: boolean;
  active_round_id: string | null;
  active_expires_at: string | null;
};

type WithdrawPrepareRow = {
  authorized_amount_raw: number | string;
  nonce_raw: number | string;
  expiry_unix: number | string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    // Auth: require a session token so the server can use authoritative DB state.
    const session = await requireSession(event);
    const userPubkey = session.wallet;

    // --- LOAD SECRET KEY ---
    const authKeyString = process.env.GAME_AUTHORITY_KEY;
    if (!authKeyString) {
      throw new Error("Server Missing GAME_AUTHORITY_KEY");
    }
    const secretKey = Uint8Array.from(JSON.parse(authKeyString));
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);

    const userKey = new PublicKey(userPubkey);

    // Reconcile escrow with DB before reading play balance (so deposits reflect immediately).
    const { vaultAmount, treasuryAmount } = await getVaultAmounts(userPubkey);
    await supabaseRpc('sync_escrow', { p_wallet: userPubkey, p_escrow_raw: vaultAmount.toString() });

    // Authoritative amount comes from DB (play balance), not from the client.
    const rows = await supabaseRpc<StateRow[]>('session_state', { p_wallet: userPubkey });
    const row = rows?.[0];
    if (!row) throw new Error('Session state not found');
    if (row.active_round_id) throw new Error('Active round in progress (end/expire round before withdrawing)');

    const playBalanceRaw = BigInt(String(row.play_balance_raw));
    const requested = playBalanceRaw; // withdraw-all of current play balance

    // --- NONCE + EXPIRY (anti-replay) ---
    // IMPORTANT: This must be idempotent to prevent double-withdraw.
    // If the user clicks withdraw twice quickly, we must return the same nonce/expiry so the
    // on-chain nonce check rejects the duplicate submission.
    const prepared = await supabaseRpc<WithdrawPrepareRow[]>('withdraw_prepare', {
      p_wallet: userPubkey,
      p_amount_raw: requested.toString(),
      p_ttl_seconds: 120,
    });
    const prep = prepared?.[0];
    if (!prep) throw new Error('withdraw_prepare returned no rows');
    const authorizedAmount = BigInt(String(prep.authorized_amount_raw));
    const nonce = BigInt(String(prep.nonce_raw));
    const expiry = BigInt(String(prep.expiry_unix));

    // Never authorize more than current DB balance (safety).
    if (authorizedAmount > requested) {
      throw new Error('Withdrawal authorization out of sync (try again in ~2 minutes)');
    }

    // --- SERVER AUTHZ (DEVNET SAFE DEFAULTS) ---
    // Cap only by on-chain vault + treasury liquidity.
    const capByLiquidity = vaultAmount + treasuryAmount;
    if (authorizedAmount > capByLiquidity) {
      throw new Error(
        `Insufficient house liquidity to pay ${authorizedAmount.toString()} units (available: ${capByLiquidity.toString()})`
      );
    }
    const U64_MAX = (1n << 64n) - 1n;
    if (authorizedAmount < 0n || authorizedAmount > U64_MAX) {
      throw new Error(`Authorized amount out of range for u64: ${authorizedAmount.toString()}`);
    }

    // --- CONSTRUCT MESSAGE ---
    // [user_pubkey(32) | authorized_amount(u64 LE) | nonce(u64 LE) | expiry(u64 LE)]
    const userBytes = userKey.toBuffer();
    const amountBytes = new Uint8Array(8);
    const nonceBytes = new Uint8Array(8);
    const expiryBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      amountBytes[i] = Number((authorizedAmount >> BigInt(i * 8)) & 0xffn);
      nonceBytes[i] = Number((nonce >> BigInt(i * 8)) & 0xffn);
      expiryBytes[i] = Number((expiry >> BigInt(i * 8)) & 0xffn);
    }

    const message = new Uint8Array(32 + 8 + 8 + 8);
    message.set(userBytes);
    message.set(amountBytes, 32);
    message.set(nonceBytes, 40);
    message.set(expiryBytes, 48);

    // --- SIGN ---
    const signature = nacl.sign.detached(message, keypair.secretKey);

    return withCors({
      statusCode: 200,
      body: JSON.stringify({
        signature: Array.from(signature),
        authorizedAmount: authorizedAmount.toString(),
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        refereePubkey: new PublicKey(keypair.publicKey).toBase58(),
        status: 'approved',
      }),
    });

  } catch (error) {
    console.error("Signing Error:", error);
    return withCors({ statusCode: 500, body: JSON.stringify({ error: (error as any).message }) });
  }
};
