import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseRpc } from './lib/supabase';
import { getVaultAmounts } from './lib/solana';

type SyncRow = { play_balance_raw: number | string; escrow_observed_raw: number | string; needs_finalization: boolean };
type StateRow = {
  play_balance_raw: number | string;
  escrow_observed_raw: number | string;
  needs_finalization: boolean;
  active_round_id: string | null;
  active_expires_at: string | null;
};

const toUi = (raw: bigint) => {
  const DECIMALS = 9n;
  const scale = 10n ** DECIMALS;
  const whole = raw / scale;
  const frac = raw % scale;
  // show up to 6 decimals
  const fracStr = frac.toString().padStart(Number(DECIMALS), '0').slice(0, 6).replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = await requireSession(event);

    const { vaultAmount } = await getVaultAmounts(wallet);

    // First, reconcile escrow vs. DB.
    await supabaseRpc<SyncRow[]>('sync_escrow', { p_wallet: wallet, p_escrow_raw: vaultAmount.toString() });

    // Then fetch current state (includes active round info).
    const rows = await supabaseRpc<StateRow[]>('session_state', { p_wallet: wallet });
    const row = rows?.[0];
    if (!row) throw new Error('Session state not found');

    const playBalanceRaw = BigInt(String(row.play_balance_raw));
    const escrowObservedRaw = BigInt(String(row.escrow_observed_raw));

    return withCors({
      statusCode: 200,
      body: JSON.stringify({
        wallet,
        playBalanceRaw: playBalanceRaw.toString(),
        playBalanceUi: toUi(playBalanceRaw),
        escrowObservedRaw: escrowObservedRaw.toString(),
        needsFinalization: !!row.needs_finalization,
        activeRoundId: row.active_round_id,
        activeExpiresAt: row.active_expires_at,
      }),
    });
  } catch (e: any) {
    return withCors({ statusCode: 401, body: JSON.stringify({ error: e?.message || 'session-state failed' }) });
  }
};
