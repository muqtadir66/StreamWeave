import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseRpc } from './lib/supabase';

type Row = { round_id: string; play_balance_raw: number | string; expires_at: string; wager_raw?: number | string };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = await requireSession(event);
    const { wagerUi } = JSON.parse(event.body || '{}') as { wagerUi?: number };

    if (!Number.isFinite(wagerUi)) throw new Error('Missing wagerUi');
    const wagerUiInt = Math.floor(Number(wagerUi));
    if (wagerUiInt <= 0) throw new Error('wagerUi must be > 0');

    const wagerRaw = (BigInt(wagerUiInt) * 1000000000n).toString();

    const rows = await supabaseRpc<Row[]>('round_start', { p_wallet: wallet, p_wager_raw: wagerRaw });
    const row = rows?.[0];
    if (!row) throw new Error('round_start failed');

    const wagerRawOut = row.wager_raw != null ? BigInt(String(row.wager_raw)) : BigInt(wagerRaw);
    const wagerUiOut = Number(wagerRawOut / 1000000000n);

    return withCors({
      statusCode: 200,
      body: JSON.stringify({
        wallet,
        roundId: row.round_id,
        playBalanceRaw: String(row.play_balance_raw),
        expiresAt: row.expires_at,
        wagerUi: wagerUiOut,
      }),
    });
  } catch (e: any) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: e?.message || 'round-start failed' }) });
  }
};
