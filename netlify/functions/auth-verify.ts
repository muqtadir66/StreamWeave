import type { Handler } from '@netlify/functions';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { randomUUID } from 'node:crypto';
import { withCors } from './lib/cors';
import { supabaseDelete, supabaseGet, supabasePost } from './lib/supabase';

type ChallengeRow = { nonce: string; expires_at: string };

const parseMessage = (message: string) => {
  const lines = message.split('\n').map((l) => l.trim());
  const walletLine = lines.find((l) => l.startsWith('Wallet: '));
  const nonceLine = lines.find((l) => l.startsWith('Nonce: '));
  const expiresLine = lines.find((l) => l.startsWith('Expires: '));
  return {
    wallet: walletLine?.slice('Wallet: '.length),
    nonce: nonceLine?.slice('Nonce: '.length),
    expiresAt: expiresLine?.slice('Expires: '.length),
  };
};

const toUint8 = (sig: unknown): Uint8Array => {
  if (Array.isArray(sig)) return Uint8Array.from(sig as number[]);
  if (typeof sig === 'string') {
    // base64
    const buf = Buffer.from(sig, 'base64');
    return new Uint8Array(buf);
  }
  throw new Error('Invalid signature format');
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet, message, signature } = JSON.parse(event.body || '{}') as {
      wallet?: string;
      message?: string;
      signature?: unknown;
    };

    if (!wallet || !message || !signature) {
      return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Missing wallet/message/signature' }) });
    }

    new PublicKey(wallet);

    const parsed = parseMessage(message);
    if (parsed.wallet !== wallet) throw new Error('Message wallet mismatch');
    if (!parsed.nonce || !parsed.expiresAt) throw new Error('Malformed message');

    const rows = await supabaseGet<ChallengeRow[]>(
      `auth_challenges?wallet=eq.${encodeURIComponent(wallet)}&select=nonce,expires_at&limit=1`
    );
    const row = rows?.[0];
    if (!row) throw new Error('No active challenge for wallet');
    if (row.nonce !== parsed.nonce) throw new Error('Nonce mismatch');

    const expiresAt = Date.parse(row.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) throw new Error('Challenge expired');

    const sigBytes = toUint8(signature);
    const msgBytes = new TextEncoder().encode(message);
    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, new PublicKey(wallet).toBytes());
    if (!ok) throw new Error('Invalid signature');

    // Consume challenge and issue session token
    await supabaseDelete(`auth_challenges?wallet=eq.${encodeURIComponent(wallet)}`);

    const token = randomUUID() + randomUUID(); // opaque (not a JWT)
    const sessionExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12h

    await supabasePost(
      'sessions',
      { token, wallet, expires_at: sessionExpiresAt },
      { Prefer: 'return=minimal' }
    );

    // Ensure player row exists
    await supabasePost('players?on_conflict=wallet', { wallet }, { Prefer: 'resolution=merge-duplicates,return=minimal' });

    return withCors({ statusCode: 200, body: JSON.stringify({ token, wallet, expiresAt: sessionExpiresAt }) });
  } catch (e: any) {
    return withCors({ statusCode: 401, body: JSON.stringify({ error: e?.message || 'Auth verify failed' }) });
  }
};

