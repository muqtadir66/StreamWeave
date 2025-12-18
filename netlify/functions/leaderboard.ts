import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { supabaseGet } from './lib/supabase';

type Row = { wallet: string; wager_raw: number | string; multiplier_milli: number; payout_raw: number | string; ended_at: string };

const toUiIntFromRaw = (raw: bigint) => (raw / 1000000000n).toString();
const shorten = (w: string) => (w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w);

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'GET') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const rows = await supabaseGet<Row[]>(
      `rounds?status=eq.settled&select=wallet,wager_raw,multiplier_milli,payout_raw,ended_at&order=payout_raw.desc,ended_at.desc&limit=25`
    );

    const items = (rows || []).map((r) => {
      const wagerRaw = BigInt(String(r.wager_raw));
      const payoutRaw = BigInt(String(r.payout_raw));
      return {
        wallet: shorten(r.wallet),
        endedAt: r.ended_at,
        wagerUi: toUiIntFromRaw(wagerRaw),
        payoutUi: toUiIntFromRaw(payoutRaw),
        multiplier: r.multiplier_milli / 1000,
      };
    });

    return withCors({ statusCode: 200, body: JSON.stringify({ items }) });
  } catch (e: any) {
    return withCors({ statusCode: 500, body: JSON.stringify({ error: e?.message || 'leaderboard failed' }) });
  }
};
