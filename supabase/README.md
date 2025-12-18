# Supabase (StreamWeave)

This project uses Supabase as an **authoritative session state store** to prevent multi-device desync/exploits and to support history/leaderboards.

## 1) Required environment variables

Set these locally in `.env` (repo root) and in Netlify (production):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (keep secret; server-only)

The existing Netlify function signing key remains:

- `GAME_AUTHORITY_KEY` (keep secret; server-only)

## 2) Apply the schema

In Supabase Dashboard → SQL Editor → New query, paste and run:

- `supabase/schema.sql`

If you previously ran an older/shorter schema, re-running `supabase/schema.sql` is the supported way to update functions (it uses `CREATE OR REPLACE`).

## 3) Notes

- The frontend never directly talks to Supabase. All reads/writes go through Netlify Functions so we don’t ship secrets to the browser.
- If you rotate keys, update Netlify env vars and redeploy.
