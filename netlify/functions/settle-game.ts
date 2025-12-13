import { Handler } from '@netlify/functions';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const PROGRAM_ID = new PublicKey("6AyQbmH2bSeip2vZWR82NpJ637SQRtrAU4bt2j2yVPwN");
const WEAVE_MINT = new PublicKey("S3Eqjw8eFu2w11KDKQ7SWuynmvBpjHH4cNeMgXFRvsQ");

export const handler: Handler = async (event) => {
  // CORS Headers (Allows your frontend to call this)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { userPubkey, requestedAmount } = JSON.parse(event.body || '{}');

    if (!userPubkey || requestedAmount === undefined) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    // --- LOAD SECRET KEY ---
    const authKeyString = process.env.GAME_AUTHORITY_KEY;
    if (!authKeyString) {
        throw new Error("Server Missing GAME_AUTHORITY_KEY");
    }
    const secretKey = Uint8Array.from(JSON.parse(authKeyString));
    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);

    const userKey = new PublicKey(userPubkey);

    // --- SERVER AUTHZ (DEVNET SAFE DEFAULTS) ---
    // For now, the server "authorizes" a full withdraw-all with a safety cap based on on-chain vault + treasury.
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    const [playerStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_state"), userKey.toBuffer()],
      PROGRAM_ID
    );
    const playerVaultAta = await getAssociatedTokenAddress(WEAVE_MINT, playerStatePda, true);

    let vaultAmount = 0n;
    try {
      const bal = await connection.getTokenAccountBalance(playerVaultAta);
      vaultAmount = BigInt(bal.value.amount);
    } catch {
      vaultAmount = 0n;
    }

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      PROGRAM_ID
    );
    const treasuryAta = await getAssociatedTokenAddress(WEAVE_MINT, treasuryPda, true);

    let treasuryAmount = 0n;
    try {
      const bal = await connection.getTokenAccountBalance(treasuryAta);
      treasuryAmount = BigInt(bal.value.amount);
    } catch {
      treasuryAmount = 0n;
    }

    const maxMultiplier = BigInt(process.env.MAX_PAYOUT_MULTIPLIER || "20");
    const requested = BigInt(requestedAmount);
    const capByMultiplier = vaultAmount * maxMultiplier;
    const capByLiquidity = vaultAmount + treasuryAmount;
    const authorizedAmount = [requested, capByMultiplier, capByLiquidity].reduce(
      (min, v) => (v < min ? v : min),
      requested
    );

    // --- NONCE + EXPIRY (anti-replay) ---
    // Nonce must monotonically increase per player (we use millis + random suffix).
    const nowMs = BigInt(Date.now());
    const rand = BigInt(Math.floor(Math.random() * 65536));
    const nonce = (nowMs << 16n) + rand;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 120); // +120s

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        signature: Array.from(signature), // Send as number array
        authorizedAmount: authorizedAmount.toString(),
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        refereePubkey: new PublicKey(keypair.publicKey).toBase58(),
        status: 'approved'
      }),
    };

  } catch (error) {
    console.error("Signing Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
