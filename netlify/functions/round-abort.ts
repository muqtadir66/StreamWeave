import type { Handler } from '@netlify/functions';
import { withCors } from './lib/cors';
import { requireSession } from './lib/session';
import { supabaseRpc } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return withCors({ statusCode: 200, body: '' });
  if (event.httpMethod !== 'POST') return withCors({ statusCode: 405, body: 'Method Not Allowed' });

  try {
    const { wallet } = await requireSession(event);
    await supabaseRpc('abort_active_round', { p_wallet: wallet });
    return withCors({ statusCode: 200, body: JSON.stringify({ ok: true }) });
  } catch (e: any) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: e?.message || 'round-abort failed' }) });
  }
};

