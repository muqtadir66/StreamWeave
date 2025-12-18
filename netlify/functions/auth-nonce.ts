import type { Handler } from '@netlify/functions';
import { PublicKey } from '@solana/web3.js';
import { randomUUID } from 'node:crypto';
import { withCors } from './lib/cors';
import { supabaseGet, supabasePost } from './lib/supabase';

type ChallengeRow = { nonce: string; expires_at: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = JSON.parse(event.body || '{}') as { wallet?: string };
    if (!wallet) return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Missing wallet' }) });

    // Validate base58 pubkey
    new PublicKey(wallet);

    // If there is an unexpired challenge already, reuse it. This prevents rapid re-prompts from
    // invalidating the nonce between "sign" and "verify".
    const existing = await supabaseGet<ChallengeRow[]>(
      `auth_challenges?wallet=eq.${encodeURIComponent(wallet)}&select=nonce,expires_at&limit=1`
    );
    const row = existing?.[0];

    let nonce = row?.nonce;
    let expiresAt = row?.expires_at;
    const expiresMs = expiresAt ? Date.parse(expiresAt) : 0;

    if (!nonce || !expiresAt || !Number.isFinite(expiresMs) || expiresMs < Date.now()) {
      nonce = randomUUID();
      expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5m
      await supabasePost(
        'auth_challenges?on_conflict=wallet',
        { wallet, nonce, expires_at: expiresAt },
        { Prefer: 'resolution=merge-duplicates,return=minimal' }
      );
    }

    const message = `StreamWeave Login\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${expiresAt}`;

    return withCors({
      statusCode: 200,
      body: JSON.stringify({ wallet, nonce, expiresAt, message }),
    });
  } catch (e: any) {
    return withCors({ statusCode: 500, body: JSON.stringify({ error: e?.message || 'Auth nonce failed' }) });
  }
};
