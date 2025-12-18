import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseGet } from './lib/supabase';

type Row = { id: string; wager_raw: number | string; multiplier_milli: number; payout_raw: number | string; ended_at: string };

const toUiIntFromRaw = (raw: bigint) => (raw / 1000000000n).toString();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'GET') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = await requireSession(event);
    const rows = await supabaseGet<Row[]>(
      `rounds?wallet=eq.${encodeURIComponent(wallet)}&status=eq.settled&select=id,wager_raw,multiplier_milli,payout_raw,ended_at&order=ended_at.desc&limit=10`
    );

    const items = (rows || []).map((r) => {
      const wagerRaw = BigInt(String(r.wager_raw));
      const payoutRaw = BigInt(String(r.payout_raw));
      return {
        id: r.id,
        endedAt: r.ended_at,
        wagerUi: toUiIntFromRaw(wagerRaw),
        payoutUi: toUiIntFromRaw(payoutRaw),
        multiplier: r.multiplier_milli / 1000,
      };
    });

    return withCors({ statusCode: 200, body: JSON.stringify({ wallet, items }) });
  } catch (e: any) {
    return withCors({ statusCode: 401, body: JSON.stringify({ error: e?.message || 'history failed' }) });
  }
};
