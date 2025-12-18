import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseRpc } from './lib/supabase';

type Row = { multiplier_milli: number; payout_raw: number | string; play_balance_raw: number | string };

const toUiIntFromRaw = (raw: bigint) => (raw / 1000000000n).toString();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = await requireSession(event);
    const { roundId, streaksMs } = JSON.parse(event.body || '{}') as { roundId?: string; streaksMs?: number[] };
    if (!roundId) throw new Error('Missing roundId');
    const streaks = Array.isArray(streaksMs) ? streaksMs.map((x) => Math.floor(Number(x))) : [];

    const rows = await supabaseRpc<Row[]>('round_end', {
      p_wallet: wallet,
      p_round_id: roundId,
      p_streaks_ms: streaks,
    });
    const row = rows?.[0];
    if (!row) throw new Error('round_end failed');

    const payoutRaw = BigInt(String(row.payout_raw));
    const playBalanceRaw = BigInt(String(row.play_balance_raw));

    return withCors({
      statusCode: 200,
      body: JSON.stringify({
        wallet,
        roundId,
        multiplierMilli: row.multiplier_milli,
        multiplier: row.multiplier_milli / 1000,
        payoutRaw: payoutRaw.toString(),
        payoutUi: toUiIntFromRaw(payoutRaw),
        playBalanceRaw: playBalanceRaw.toString(),
        playBalanceUi: toUiIntFromRaw(playBalanceRaw),
      }),
    });
  } catch (e: any) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: e?.message || 'round-end failed' }) });
  }
};
