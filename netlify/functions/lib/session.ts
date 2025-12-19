import type { HandlerEvent } from '@netlify/functions';
import { supabaseGet, supabasePatch } from './supabase';

export type Session = { wallet: string; expires_at: string; last_seen_at?: string };

const bearerTokenFrom = (event: HandlerEvent): string | null => {
  const raw = event.headers.authorization || event.headers.Authorization;
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d
const EXTEND_WHEN_WITHIN_MS = 7 * 24 * 60 * 60 * 1000; // extend when < 7d remaining
const TOUCH_MIN_INTERVAL_MS = 60 * 1000; // at most 1 write/minute (session-state polls frequently)

export const requireSession = async (event: HandlerEvent): Promise<{ token: string; wallet: string }> => {
  const token = bearerTokenFrom(event);
  if (!token) throw new Error('Missing Authorization bearer token');

  const rows = await supabaseGet<Session[]>(
    `sessions?token=eq.${encodeURIComponent(token)}&select=wallet,expires_at,last_seen_at&limit=1`
  );
  const row = rows?.[0];
  if (!row) throw new Error('Invalid session token');

  const now = Date.now();
  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt < now) throw new Error('Session expired');

  // Sliding sessions: extend for active users, but avoid DB write amplification.
  const lastSeenAt = row.last_seen_at ? Date.parse(row.last_seen_at) : NaN;
  const shouldTouch =
    !Number.isFinite(lastSeenAt) || now - lastSeenAt > TOUCH_MIN_INTERVAL_MS;
  const shouldExtend =
    expiresAt - now < EXTEND_WHEN_WITHIN_MS;

  if (shouldTouch || shouldExtend) {
    const patch: Record<string, string> = { last_seen_at: new Date(now).toISOString() };
    if (shouldExtend) patch.expires_at = new Date(now + SESSION_TTL_MS).toISOString();
    await supabasePatch(
      `sessions?token=eq.${encodeURIComponent(token)}`,
      patch,
      { Prefer: 'return=minimal' }
    );
  }

  return { token, wallet: row.wallet };
};
