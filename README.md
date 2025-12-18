## StreamWeave (Protocol V1) — Devnet

This repo contains:
- A Vite/React frontend (Three.js game + Solana wallet integration)
- Netlify Functions that act as the **referee server**
- An Anchor program deployed to devnet (`weave_contract/`)

### Why Supabase exists

Gameplay is fast/off-chain, but balances must be consistent across devices and can’t be trusted client-side.

Supabase stores an **authoritative play balance** and enforces a **single active round per wallet**:
- Prevents “lose on mobile, withdraw on desktop” exploits
- Enables history + leaderboard

The on-chain vault still holds tokens, but the UI uses Supabase as the source of truth for the **playable** balance.

## Setup (local)

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

Copy `.env.example` → `.env` and fill:

- `GAME_AUTHORITY_KEY` (secret key array JSON)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not commit `.env` (it’s gitignored).

### 3) Apply Supabase schema

In Supabase Dashboard → SQL Editor, run:

- `supabase/schema.sql`

### 4) Run frontend + functions

```bash
npm run dev:netlify
```

Open:
- App: `http://localhost:8888`
- Functions: `http://localhost:8888/.netlify/functions/<name>`

## Wallet auth (one-time per device)

When you connect a wallet, the app may ask you to **sign a login message** once. This creates a short-lived server session token so rounds can start/end rapidly without wallet popups every round.

## Deployed addresses (devnet)

- Program ID: `6AyQbmH2bSeip2vZWR82NpJ637SQRtrAU4bt2j2yVPwN`
- WEAVE Mint: `S3Eqjw8eFu2w11KDKQ7SWuynmvBpjHH4cNeMgXFRvsQ`
