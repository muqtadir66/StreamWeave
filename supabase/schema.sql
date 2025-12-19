-- StreamWeave Supabase schema (authoritative session state + history/leaderboard)
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- Wallet sessions (opaque bearer token issued after a 1-time wallet message signature).
create table if not exists public.sessions (
  token text primary key,
  wallet text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists sessions_wallet_idx on public.sessions (wallet);

-- Short-lived auth challenges (prevents replays for login).
create table if not exists public.auth_challenges (
  wallet text primary key,
  nonce text not null,
  expires_at timestamptz not null
);

-- Per-player authoritative session state.
-- Amounts are in token "raw units" (u64-like): WEAVE has 9 decimals, so 1 WEAVE = 1_000_000_000 raw.
create table if not exists public.players (
  wallet text primary key,
  play_balance_raw bigint not null default 0,
  escrow_observed_raw bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Prevents double-withdraw: one pending withdrawal request per wallet (idempotent nonce/expiry).
-- The backend will re-use the same nonce while a request is pending so on-chain replay protection
-- (player_auth.last_nonce) can reject duplicate submissions.
create table if not exists public.withdraw_requests (
  wallet text primary key references public.players(wallet) on delete cascade,
  authorized_amount_raw bigint not null,
  nonce_raw bigint not null,
  expiry_unix bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-round history.
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  wallet text not null references public.players(wallet) on delete cascade,
  status text not null default 'active', -- active|settled|expired
  wager_raw bigint not null,
  multiplier_milli integer not null default 0,
  payout_raw bigint not null default 0,
  streaks_ms integer[] not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '6 hours')
);

-- At most one active round per wallet at a time.
create unique index if not exists rounds_one_active_per_wallet
  on public.rounds (wallet)
  where status = 'active';

create index if not exists rounds_wallet_ended_idx
  on public.rounds (wallet, ended_at desc)
  where status = 'settled';

create index if not exists rounds_leaderboard_idx
  on public.rounds (payout_raw desc, ended_at desc)
  where status = 'settled';

-- Expire any stale active round (treat as loss: wager already deducted at start, so no refund).
create or replace function public.expire_stale_round(p_wallet text)
returns void
language plpgsql
security definer
as $$
begin
  update public.rounds
    set status = 'expired',
        ended_at = now()
  where wallet = p_wallet
    and status = 'active'
    and expires_at < now();
end;
$$;

-- Sync escrow observation (server reads on-chain vault amount and passes it here).
-- If escrow increases, credit delta into play_balance.
-- If escrow decreases, reset play_balance to 0 (withdraw/finalize happened).
create or replace function public.sync_escrow(p_wallet text, p_escrow_raw bigint)
returns table(play_balance_raw bigint, escrow_observed_raw bigint, needs_finalization boolean)
language plpgsql
security definer
as $$
declare
  v_play bigint;
  v_escrow bigint;
begin
  insert into public.players(wallet) values (p_wallet)
    on conflict do nothing;

  perform public.expire_stale_round(p_wallet);

  select players.play_balance_raw, players.escrow_observed_raw
    into v_play, v_escrow
  from public.players as players
  where players.wallet = p_wallet
  for update;

  if p_escrow_raw > v_escrow then
    v_play := v_play + (p_escrow_raw - v_escrow);
    v_escrow := p_escrow_raw;
  elsif p_escrow_raw < v_escrow then
    -- escrow decreased (withdraw/finalize): clear play balance.
    v_play := 0;
    v_escrow := p_escrow_raw;
    -- Withdrawal completed (or finalized) => clear any pending withdrawal request.
    delete from public.withdraw_requests where wallet = p_wallet;
  end if;

  update public.players as p
    set play_balance_raw = v_play,
        escrow_observed_raw = v_escrow,
        updated_at = now()
  where p.wallet = p_wallet;

  play_balance_raw := v_play;
  escrow_observed_raw := v_escrow;
  needs_finalization := (v_play = 0 and v_escrow > 0);
  return next;
end;
$$;

-- Idempotent "withdraw prepare": returns a stable nonce/expiry while a withdrawal is pending.
-- Calling it multiple times during the TTL returns the same row (so only one signature is valid).
create or replace function public.withdraw_prepare(
  p_wallet text,
  p_amount_raw bigint,
  p_ttl_seconds integer default 120
)
returns table(authorized_amount_raw bigint, nonce_raw bigint, expiry_unix bigint)
language plpgsql
security definer
as $$
declare
  v_now_unix bigint := floor(extract(epoch from now()))::bigint;
  v_nonce bigint;
  v_expiry bigint;
begin
  if p_amount_raw < 0 then
    raise exception 'amount must be >= 0';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 10 then
    p_ttl_seconds := 10;
  end if;

  insert into public.players(wallet) values (p_wallet)
    on conflict do nothing;

  -- Generate a u64-safe nonce: (epoch_ms << 16) + random16
  v_nonce := (floor(extract(epoch from clock_timestamp()) * 1000)::bigint << 16)
            + floor(random() * 65536)::bigint;
  v_expiry := v_now_unix + p_ttl_seconds::bigint;

  -- Insert new request; if one already exists and is still valid, keep it.
  return query
    with upsert as (
      insert into public.withdraw_requests(wallet, authorized_amount_raw, nonce_raw, expiry_unix, updated_at)
      values (p_wallet, p_amount_raw, v_nonce, v_expiry, now())
      on conflict (wallet) do update
        set authorized_amount_raw = excluded.authorized_amount_raw,
            nonce_raw = excluded.nonce_raw,
            expiry_unix = excluded.expiry_unix,
            updated_at = now()
        where public.withdraw_requests.expiry_unix <= v_now_unix
      returning public.withdraw_requests.authorized_amount_raw,
                public.withdraw_requests.nonce_raw,
                public.withdraw_requests.expiry_unix
    )
    select * from upsert;

  if not found then
    return query
      select wr.authorized_amount_raw, wr.nonce_raw, wr.expiry_unix
      from public.withdraw_requests wr
      where wr.wallet = p_wallet and wr.expiry_unix > v_now_unix;
  end if;
end;
$$;

-- Current session view (also expires stale rounds).
create or replace function public.session_state(p_wallet text)
returns table(
  play_balance_raw bigint,
  escrow_observed_raw bigint,
  needs_finalization boolean,
  active_round_id uuid,
  active_expires_at timestamptz
)
language plpgsql
security definer
as $$
begin
  insert into public.players(wallet) values (p_wallet)
    on conflict do nothing;

  perform public.expire_stale_round(p_wallet);

  return query
    select
      p.play_balance_raw,
      p.escrow_observed_raw,
      (p.play_balance_raw = 0 and p.escrow_observed_raw > 0) as needs_finalization,
      r.id as active_round_id,
      r.expires_at as active_expires_at
    from public.players p
    left join public.rounds r
      on r.wallet = p.wallet and r.status = 'active'
    where p.wallet = p_wallet;
end;
$$;

-- Start a round: debit play balance and open an active round.
create or replace function public.round_start(p_wallet text, p_wager_raw bigint)
returns table(round_id uuid, play_balance_raw bigint, expires_at timestamptz, wager_raw bigint)
language plpgsql
security definer
as $$
declare
  v_play bigint;
  v_round_id uuid;
  v_expires timestamptz;
  v_active record;
begin
  if p_wager_raw <= 0 then
    raise exception 'wager must be > 0';
  end if;
  if (p_wager_raw % 1000000000) <> 0 then
    raise exception 'wager must be whole WEAVE (multiple of 1e9 raw)';
  end if;

  insert into public.players(wallet) values (p_wallet)
    on conflict do nothing;

  perform public.expire_stale_round(p_wallet);

  -- Idempotency: if there's already an active round, return it (do NOT double-debit).
  select r.id, r.wager_raw, r.expires_at
    into v_active
  from public.rounds as r
  where r.wallet = p_wallet and r.status = 'active'
  limit 1
  for update;

  if found then
    select p.play_balance_raw into v_play
      from public.players as p
      where p.wallet = p_wallet
      for update;

    round_id := v_active.id;
    play_balance_raw := v_play;
    expires_at := v_active.expires_at;
    wager_raw := v_active.wager_raw;
    return next;
  end if;

  select p.play_balance_raw into v_play
    from public.players as p
    where p.wallet = p_wallet
    for update;

  if v_play < p_wager_raw then
    raise exception 'insufficient play balance';
  end if;

  v_expires := now() + interval '6 hours';

  insert into public.rounds(wallet, status, wager_raw, expires_at)
    values (p_wallet, 'active', p_wager_raw, v_expires)
    returning id into v_round_id;

  v_play := v_play - p_wager_raw;
  update public.players as p
    set play_balance_raw = v_play,
        updated_at = now()
  where p.wallet = p_wallet;

  round_id := v_round_id;
  play_balance_raw := v_play;
  expires_at := v_expires;
  wager_raw := p_wager_raw;
  return next;
end;
$$;

-- End a round: compute multiplier from streaks, compute payout, credit play balance, and close the round.
-- If you previously deployed an older `round_end` overload (with a defaulted 4th parameter),
-- it can cause PostgREST RPC ambiguity. Drop it explicitly.
drop function if exists public.round_end(text, uuid, integer[], integer);

create or replace function public.round_end(
  p_wallet text,
  p_round_id uuid,
  p_streaks_ms integer[]
)
returns table(multiplier_milli integer, payout_raw bigint, play_balance_raw bigint)
language plpgsql
security definer
as $$
declare
  v_wager_raw bigint;
  v_play bigint;
  v_mult integer := 0;
  v_s integer;
  v_wager_ui bigint;
  v_payout_ui bigint;
  v_payout_raw bigint;
  v_existing record;
begin
  perform public.expire_stale_round(p_wallet);

  select wager_raw into v_wager_raw
    from public.rounds
    where id = p_round_id and wallet = p_wallet and status = 'active'
    for update;

  if v_wager_raw is null then
    -- Idempotency: if this round already ended, return stored values instead of error.
    select r.status, r.multiplier_milli, r.payout_raw
      into v_existing
    from public.rounds as r
    where r.id = p_round_id and r.wallet = p_wallet
    limit 1;

    if not found then
      raise exception 'no round found';
    end if;

    select p.play_balance_raw into v_play
      from public.players as p
      where p.wallet = p_wallet
      for update;

    if v_existing.status = 'settled' then
      multiplier_milli := v_existing.multiplier_milli;
      payout_raw := v_existing.payout_raw;
      play_balance_raw := v_play;
      return next;
    end if;

    -- expired (loss): payout already 0 by definition.
    multiplier_milli := 0;
    payout_raw := 0;
    play_balance_raw := v_play;
    return next;
  end if;

  if p_streaks_ms is null then
    p_streaks_ms := '{}'::integer[];
  end if;

  if array_length(p_streaks_ms, 1) is not null and array_length(p_streaks_ms, 1) > 128 then
    raise exception 'too many streaks';
  end if;

  foreach v_s in array p_streaks_ms loop
    if v_s < 0 or v_s > 600000 then
      raise exception 'invalid streak duration';
    end if;
    if v_s >= 50000 then
      v_mult := v_mult + 20000;
    elsif v_s >= 40000 then
      v_mult := v_mult + 8000;
    elsif v_s >= 30000 then
      v_mult := v_mult + 3500;
    elsif v_s >= 20000 then
      v_mult := v_mult + 1500;
    elsif v_s >= 10000 then
      v_mult := v_mult + 500;
    end if;
  end loop;

  -- No payout cap: multipliers stack until crash.

  -- Match current frontend semantics:
  -- payout_ui = floor(wager_ui * multiplier)
  v_wager_ui := v_wager_raw / 1000000000;
  v_payout_ui := (v_wager_ui * v_mult) / 1000; -- integer division floors
  v_payout_raw := v_payout_ui * 1000000000;

  update public.rounds
    set status = 'settled',
        streaks_ms = p_streaks_ms,
        multiplier_milli = v_mult,
        payout_raw = v_payout_raw,
        ended_at = now()
  where id = p_round_id and wallet = p_wallet and status = 'active';

  select p.play_balance_raw into v_play
    from public.players as p
    where p.wallet = p_wallet
    for update;

  v_play := v_play + v_payout_raw;
  update public.players as p
    set play_balance_raw = v_play,
        updated_at = now()
  where p.wallet = p_wallet;

  multiplier_milli := v_mult;
  payout_raw := v_payout_raw;
  play_balance_raw := v_play;
  return next;
end;
$$;

-- Abort any active round immediately (used to unstick clients if settlement fails).
create or replace function public.abort_active_round(p_wallet text)
returns void
language plpgsql
security definer
as $$
begin
  update public.rounds as r
    set status = 'expired',
        ended_at = now()
  where r.wallet = p_wallet
    and r.status = 'active';
end;
$$;
