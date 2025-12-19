import { requireEnv } from './env';

const supabaseBaseUrl = () => requireEnv('SUPABASE_URL').replace(/\/$/, '');
const supabaseServiceKey = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabaseHeaders = () => {
  const key = supabaseServiceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
};

export const supabaseRpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const url = `${supabaseBaseUrl()}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, { method: 'POST', headers: supabaseHeaders(), body: JSON.stringify(args) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase rpc/${fn} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
};

export const supabaseGet = async <T>(pathAndQuery: string): Promise<T> => {
  const url = `${supabaseBaseUrl()}/rest/v1/${pathAndQuery.replace(/^\//, '')}`;
  const res = await fetch(url, { method: 'GET', headers: supabaseHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase GET ${pathAndQuery} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
};

export const supabasePost = async <T>(pathAndQuery: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> => {
  const url = `${supabaseBaseUrl()}/rest/v1/${pathAndQuery.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders(), ...(extraHeaders || {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase POST ${pathAndQuery} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
};

export const supabasePatch = async <T>(
  pathAndQuery: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> => {
  const url = `${supabaseBaseUrl()}/rest/v1/${pathAndQuery.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), ...(extraHeaders || {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase PATCH ${pathAndQuery} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
};

export const supabaseDelete = async (pathAndQuery: string): Promise<void> => {
  const url = `${supabaseBaseUrl()}/rest/v1/${pathAndQuery.replace(/^\//, '')}`;
  const res = await fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase DELETE ${pathAndQuery} failed: ${res.status} ${text}`);
  void text;
};
