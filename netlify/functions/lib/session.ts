import type { HandlerEvent } from '@netlify/functions';
import { supabaseGet } from './supabase';

export type Session = { wallet: string; expires_at: string };

const bearerTokenFrom = (event: HandlerEvent): string | null => {
  const raw = event.headers.authorization || event.headers.Authorization;
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const requireSession = async (event: HandlerEvent): Promise<{ token: string; wallet: string }> => {
  const token = bearerTokenFrom(event);
  if (!token) throw new Error('Missing Authorization bearer token');

  const rows = await supabaseGet<Session[]>(
    `sessions?token=eq.${encodeURIComponent(token)}&select=wallet,expires_at&limit=1`
  );
  const row = rows?.[0];
  if (!row) throw new Error('Invalid session token');

  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) throw new Error('Session expired');

  return { token, wallet: row.wallet };
};
