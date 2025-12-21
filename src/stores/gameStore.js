import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Program, AnchorProvider, BN, utils, web3 } from '@coral-xyz/anchor'
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PROGRAM_ID, WEAVE_MINT } from '../utils/constants'
import idl from '../utils/idl.json'

const NETWORK = "https://api.devnet.solana.com"
const PROGRAM_ID_STR = typeof PROGRAM_ID === 'string'
  ? PROGRAM_ID
  : (idl?.address || idl?.metadata?.address || '').toString()
const DECIMALS = 9; 
const SCALE = new BN(10).pow(new BN(DECIMALS));

const getFunctionsBaseUrl = () =>
  import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8888' : '');
const fnUrl = (name) => `${getFunctionsBaseUrl()}/.netlify/functions/${name}`;
const tokenStorageKey = (walletPk) => `streamweaveSessionToken:${walletPk}`;

let authInFlightWallet = null;
let authInFlightPromise = null;

const isSessionAuthErrorMessage = (msg) => {
  const s = (msg || '').toString().toLowerCase();
  return (
    s.includes('session expired') ||
    s.includes('invalid session token') ||
    s.includes('missing authorization') ||
    s.includes('missing authorization bearer token')
  );
};

const parseUiAmountToBN = (uiAmount) => {
  if (BN.isBN(uiAmount)) return uiAmount;
  const str = (uiAmount ?? '').toString().trim();
  if (!str) throw new Error('Invalid amount');
  const [wholePart, fracPart = ''] = str.split('.');
  const whole = new BN(wholePart || '0');
  const fracPadded = (fracPart + '0'.repeat(DECIMALS)).slice(0, DECIMALS);
  const frac = new BN(fracPadded || '0');
  return whole.mul(SCALE).add(frac);
};

const formatRawToUiString = (rawAmount, maxFractionDigits = 6) => {
  const bn = BN.isBN(rawAmount) ? rawAmount : new BN(rawAmount.toString());
  const neg = bn.isNeg();
  const digits = neg ? bn.abs().toString(10) : bn.toString(10);
  const padded = digits.padStart(DECIMALS + 1, '0');
  const whole = padded.slice(0, -DECIMALS);
  let frac = padded.slice(-DECIMALS);
  if (maxFractionDigits != null) {
    frac = frac.slice(0, maxFractionDigits);
  }
  frac = frac.replace(/0+$/, '');
  const ui = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${ui}` : ui;
};

const buildAnchorWallet = (wallet) => {
  if (!wallet) return null;
  const { publicKey, signTransaction, signAllTransactions } = wallet;
  if (!publicKey || !signTransaction) return null;
  return {
    publicKey: new web3.PublicKey(publicKey.toBase58()),
    signTransaction: signTransaction.bind(wallet),
    signAllTransactions: signAllTransactions ? signAllTransactions.bind(wallet) : undefined,
  };
};

const buildProgram = (connection, wallet) => {
  const anchorWallet = buildAnchorWallet(wallet);
  if (!anchorWallet || !anchorWallet.publicKey) throw new Error("Wallet missing signer or publicKey");
  if (!PROGRAM_ID_STR || typeof PROGRAM_ID_STR !== 'string') throw new Error("PROGRAM_ID is missing");
  const programId = new web3.PublicKey(PROGRAM_ID_STR);
  const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
  const program = new Program(idl, programId, provider);
  return { program, programId, anchorWallet };
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      status: 'idle',
      sessionOwner: null,
      sessionDirty: false,
      needsFinalization: false,
      escrowRaw: new BN(0),
      balanceRaw: new BN(0),
      balance: 0,
      sessionToken: null,
      sessionTokenWallet: null,
      authCooldownUntil: 0,
      withdrawInFlight: false,
      startInFlight: false,
      roundEndInFlight: false,
      activeRoundId: null,
      activeExpiresAt: null,
      streaksMs: [],
      wager: 1000, 
      lastWager: 0,
      payout: 0,
      bankedMultiplier: 0.0,
      
      fuel: 100, maxFuel: 100, fuelDrain: 8, fuelRegen: 15,
      boostStreak: 0, currentTier: 0, isBoosting: false,
      speed: 22, maxSpeed: 100, shipPos: { x: 0, y: 0, z: 0 }, shake: 0, runId: 0,
      
      // --- Bounce/Collision State ---
      bounceVelocity: { x: 0, y: 0, z: 0 }, 
      
      soundEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      setShipPos: (pos) => set({ shipPos: pos }),
      setShake: (v) => set({ shake: v }),
      setWager: (amount) => set({ wager: amount }),

      clearSessionToken: (walletPk) => {
        try { localStorage.removeItem(tokenStorageKey(walletPk)); } catch {}
        const { sessionTokenWallet } = get();
        if (sessionTokenWallet === walletPk) {
          set({ sessionToken: null, sessionTokenWallet: null, sessionOwner: null });
        }
      },

      ensureSession: async (wallet) => {
        if (!wallet?.publicKey) throw new Error('Connect wallet');
        const walletPk = wallet.publicKey.toBase58();

        const { authCooldownUntil } = get();
        if (authCooldownUntil && Date.now() < authCooldownUntil) {
          throw new Error('Login pending/canceled; waiting before retry.');
        }

        if (authInFlightPromise && authInFlightWallet === walletPk) return await authInFlightPromise;

        const { sessionToken, sessionTokenWallet } = get();
        if (sessionToken && sessionTokenWallet === walletPk) return sessionToken;

        const stored = localStorage.getItem(tokenStorageKey(walletPk));
        if (stored) {
          set({ sessionToken: stored, sessionTokenWallet: walletPk, sessionOwner: walletPk });
          return stored;
        }

        if (!wallet.signMessage) throw new Error('Wallet must support message signing to play');

        authInFlightWallet = walletPk;
        authInFlightPromise = (async () => {
          try {
            const nonceRes = await fetch(fnUrl('auth-nonce'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: walletPk }),
            });
            if (!nonceRes.ok) {
              const err = await nonceRes.json().catch(() => ({}));
              throw new Error(err.error || 'Auth nonce failed');
            }

            const { message } = await nonceRes.json();
            const signature = await wallet.signMessage(new TextEncoder().encode(message));

            const verifyRes = await fetch(fnUrl('auth-verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: walletPk, message, signature: Array.from(signature) }),
            });
            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}));
              throw new Error(err.error || 'Auth verify failed');
            }

            const verified = await verifyRes.json();
            const token = verified.token;
            if (!token) throw new Error('Auth verify returned no token');

            localStorage.setItem(tokenStorageKey(walletPk), token);
            set({ sessionToken: token, sessionTokenWallet: walletPk, sessionOwner: walletPk, authCooldownUntil: 0 });
            return token;
          } catch (e) {
            const msg = (e?.message || String(e)).toLowerCase();
            const likelyUserCancel =
              msg.includes('reject') || msg.includes('declin') || msg.includes('cancel') || msg.includes('user');
            if (likelyUserCancel) {
              set({ authCooldownUntil: Date.now() + 30_000 });
            }
            throw e;
          } finally {
            authInFlightWallet = null;
            authInFlightPromise = null;
          }
        })();

        return await authInFlightPromise;
      },

      refreshSession: async () => {
        const { sessionToken, sessionOwner } = get();
        if (!sessionToken || !sessionOwner) return;

        const res = await fetch(fnUrl('session-state'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || 'session-state failed';
          if (isSessionAuthErrorMessage(msg)) {
            get().clearSessionToken(sessionOwner);
            throw new Error('Session expired');
          }
          throw new Error(msg);
        }

        const data = await res.json();
        const playBalanceRaw = new BN(data.playBalanceRaw);
        const escrowObservedRaw = new BN(data.escrowObservedRaw);
        const uiBalanceStr = formatRawToUiString(playBalanceRaw, 6);

        set({
          needsFinalization: !!data.needsFinalization,
          escrowRaw: escrowObservedRaw,
          balanceRaw: playBalanceRaw,
          balance: Number(uiBalanceStr),
          activeRoundId: data.activeRoundId,
          activeExpiresAt: data.activeExpiresAt,
        });
      },

      abortActiveRound: async (walletCtx) => {
        const wallet = walletCtx;
        if (!wallet?.publicKey) throw new Error('Connect wallet');
        const token = await get().ensureSession(wallet);
        const res = await fetch(fnUrl('round-abort'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to clear active round');

        set({ activeRoundId: null, activeExpiresAt: null });
        await get().refreshSession();
      },

      syncSession: async (wallet, opts = { interactive: false }) => {
        if (!wallet || !wallet.publicKey) return;
        try {
          const walletPk = wallet.publicKey.toBase58();
          const { sessionToken, sessionTokenWallet } = get();

          if (!sessionToken || sessionTokenWallet !== walletPk) {
            const stored = localStorage.getItem(tokenStorageKey(walletPk));
            if (stored) set({ sessionToken: stored, sessionTokenWallet: walletPk, sessionOwner: walletPk });
          }

          if (!get().sessionToken && opts?.interactive) {
            await get().ensureSession(wallet);
          }

          await get().refreshSession();
        } catch (e) {
          console.log("Sync Log:", e.message);
        }
      },

      depositFunds: async (walletCtx, amount) => {
        // ... (depositFunds implementation remains unchanged) ...
        const wallet = walletCtx;
        try {
          if (!wallet || !wallet.publicKey) return alert("Connect wallet.");
          if (get().needsFinalization) {
            return alert("Finalize the session first (sweeps escrowed losses to the house).");
          }
          
          const connection = new web3.Connection(NETWORK, "confirmed");
          const { program, programId, anchorWallet } = buildProgram(connection, wallet);
          const mintPk = new web3.PublicKey(WEAVE_MINT);

          const [playerStatePda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("player_state"), anchorWallet.publicKey.toBuffer()],
            programId
          );

          const playerTokenAccount = await getAssociatedTokenAddress(mintPk, anchorWallet.publicKey);
          const playerPdaTokenAccount = await getAssociatedTokenAddress(mintPk, playerStatePda, true);

          const createAtaIxs = [];
          if (!(await connection.getAccountInfo(playerTokenAccount))) {
             createAtaIxs.push(createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey, playerTokenAccount, anchorWallet.publicKey, mintPk, TOKEN_PROGRAM_ID
             ));
          }
          if (!(await connection.getAccountInfo(playerPdaTokenAccount))) {
             createAtaIxs.push(createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey, playerPdaTokenAccount, playerStatePda, mintPk, TOKEN_PROGRAM_ID
             ));
          }

          const rawAmount = parseUiAmountToBN(amount);
          console.log(`Depositing ${amount} WEAVE (${rawAmount.toString()} units)...`);

          const tx = await program.methods
            .deposit(rawAmount)
            .accounts({
              player: anchorWallet.publicKey,
              playerState: playerStatePda,
              playerTokenAccount: playerTokenAccount,
              playerPdaTokenAccount: playerPdaTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId, 
            })
            .preInstructions(createAtaIxs)
            .transaction();

          const ix = tx.instructions[tx.instructions.length - 1];
          ix.keys = ix.keys.map((k) => {
            const pk = k.pubkey.toBase58();
            if (pk === anchorWallet.publicKey.toBase58()) return { ...k, isSigner: true, isWritable: true };
            if (pk === playerStatePda.toBase58()) return { ...k, isWritable: true };
            if (pk === playerTokenAccount.toBase58()) return { ...k, isWritable: true };
            if (pk === playerPdaTokenAccount.toBase58()) return { ...k, isWritable: true };
            return k;
          });

          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = anchorWallet.publicKey;

          const signedTx = await anchorWallet.signTransaction(tx);
          const sig = await connection.sendRawTransaction(signedTx.serialize());
          
          console.log("Deposit TX:", sig);
          
          set((s) => {
            const nextRaw = (s.balanceRaw ?? new BN(0)).add(rawAmount);
            const nextUiStr = formatRawToUiString(nextRaw, 6);
            return { balanceRaw: nextRaw, balance: Number(nextUiStr) };
          });
          
          await connection.confirmTransaction(sig);
          get().syncSession(wallet);
          
        } catch (e) {
          console.error("Deposit Error:", e);
          alert("Deposit Failed: " + e.message);
        }
      },

      withdrawFunds: async (walletCtx) => {
         // ... (withdrawFunds implementation remains unchanged) ...
         const wallet = walletCtx;
        if (get().withdrawInFlight) return;
        set({ withdrawInFlight: true });
        try {
          if (!wallet || !wallet.publicKey) return alert("Connect wallet.");
          
          const connection = new web3.Connection(NETWORK, "confirmed");
          const { program, programId, anchorWallet } = buildProgram(connection, wallet);
          const { balance, balanceRaw } = get();

          const requestedRawAmount = balanceRaw && BN.isBN(balanceRaw)
            ? balanceRaw
            : parseUiAmountToBN(balance);
          const requestedUi = formatRawToUiString(requestedRawAmount, 6);
          console.log(`Withdrawing ${requestedUi} WEAVE (${requestedRawAmount.toString()} units)...`);

          if (requestedRawAmount.eq(new BN(0))) {
            const [playerStatePda] = web3.PublicKey.findProgramAddressSync(
              [utils.bytes.utf8.encode("player_state"), anchorWallet.publicKey.toBuffer()],
              programId
            );
            const mintPk = new web3.PublicKey(WEAVE_MINT);
            const playerPdaTokenAccount = await getAssociatedTokenAddress(mintPk, playerStatePda, true);
            let vaultAmount = 0n;
            try {
              const bal = await connection.getTokenAccountBalance(playerPdaTokenAccount);
              vaultAmount = BigInt(bal.value.amount);
            } catch {
              vaultAmount = 0n;
            }
            if (vaultAmount === 0n) return alert("Nothing to withdraw/finalize.");
            console.log(`[Withdraw] Finalizing session: sweeping ${vaultAmount.toString()} escrow units to the house.`);
          }

          const FUNCTIONS_BASE_URL =
            import.meta.env.VITE_FUNCTIONS_BASE_URL ||
            (import.meta.env.DEV ? "http://localhost:8888" : "");
          const API_URL = `${FUNCTIONS_BASE_URL}/.netlify/functions/settle-game`;
          let token = await get().ensureSession(wallet);

          const attempt = async (t) => {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
              body: JSON.stringify({
                userPubkey: anchorWallet.publicKey.toBase58(),
                requestedAmount: requestedRawAmount.toString(), 
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Server declined withdrawal");
            return payload;
          };

          let settlement;
          try {
            settlement = await attempt(token);
          } catch (e) {
            if (isSessionAuthErrorMessage(e?.message)) {
              const walletPk = wallet.publicKey.toBase58();
              get().clearSessionToken(walletPk);
              token = await get().ensureSession(wallet);
              settlement = await attempt(token);
            } else {
              throw e;
            }
          }

          const { signature, authorizedAmount, nonce, expiry, refereePubkey } = settlement;
          console.log("✅ Received Server Settlement");

          const authorizedRawAmount = new BN(authorizedAmount);
          const nonceBn = new BN(nonce);
          const expiryBn = new BN(expiry);

          const userBytes = anchorWallet.publicKey.toBytes();
          const toU64LE = (value) => {
            let x = BigInt(value);
            const bytes = new Uint8Array(8);
            for (let i = 0; i < 8; i++) {
              bytes[i] = Number((x >> BigInt(i * 8)) & 0xffn);
            }
            return bytes;
          };
          const msg = new Uint8Array(32 + 8 + 8 + 8);
          msg.set(userBytes);
          msg.set(toU64LE(BigInt(authorizedAmount)), 32);
          msg.set(toU64LE(BigInt(nonce)), 40);
          msg.set(toU64LE(BigInt(expiry)), 48);

          const ed25519Ix = web3.Ed25519Program.createInstructionWithPublicKey({
            publicKey: new web3.PublicKey(refereePubkey).toBytes(),
            message: msg,
            signature: Uint8Array.from(signature),
          });

          const mintPk = new web3.PublicKey(WEAVE_MINT);

          const [configPda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("config")],
            programId
          );
          const [treasuryPda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("treasury")],
            programId
          );
          const [playerAuthPda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("player_auth"), anchorWallet.publicKey.toBuffer()],
            programId
          );

          const [playerStatePda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("player_state"), anchorWallet.publicKey.toBuffer()],
            programId
          );

          const playerTokenAccount = await getAssociatedTokenAddress(mintPk, anchorWallet.publicKey);
          const playerPdaTokenAccount = await getAssociatedTokenAddress(mintPk, playerStatePda, true);
          const treasuryTokenAccount = await getAssociatedTokenAddress(mintPk, treasuryPda, true);

          const createAtaIxs = [];
          if (!(await connection.getAccountInfo(playerTokenAccount))) {
             createAtaIxs.push(createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey, playerTokenAccount, anchorWallet.publicKey, mintPk, TOKEN_PROGRAM_ID
             ));
          }

          const tx = await program.methods
            .withdrawV2(authorizedRawAmount, nonceBn, expiryBn)
            .accounts({
              player: anchorWallet.publicKey,
              playerState: playerStatePda,
              playerAuth: playerAuthPda,
              playerTokenAccount: playerTokenAccount,
              playerPdaTokenAccount: playerPdaTokenAccount,
              config: configPda,
              treasuryPda: treasuryPda,
              treasuryTokenAccount: treasuryTokenAccount,
              mint: mintPk,
              instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
              rent: web3.SYSVAR_RENT_PUBKEY,
            })
            .preInstructions(createAtaIxs)
            .transaction();

          tx.instructions.splice(tx.instructions.length - 1, 0, ed25519Ix);

          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = anchorWallet.publicKey;

          const signedTx = await anchorWallet.signTransaction(tx);
          const sig = await connection.sendRawTransaction(signedTx.serialize());

          console.log("Withdraw TX:", sig);
          set({
            sessionDirty: false,
            needsFinalization: false,
            escrowRaw: new BN(0),
            balanceRaw: new BN(0),
            balance: 0,
          });
          await connection.confirmTransaction(sig);
          get().syncSession(wallet);

        } catch (e) {
          console.error("Withdraw Error:", e);
          alert("Withdraw Failed: " + e.message);
        } finally {
          set({ withdrawInFlight: false });
        }
      },

      start: async (walletCtx) => {
         // ... (start implementation remains unchanged) ...
         const wallet = walletCtx;
        if (get().startInFlight) return;
        const { balance, wager, runId, needsFinalization, activeRoundId } = get();
        if (needsFinalization) return alert("Finalize the session first.");
        if (activeRoundId) return alert("A round is already active (possibly on another device).");
        if (balance < wager) return alert("INSUFFICIENT FUNDS. Please Deposit $WEAVE.");
        if (!wallet || !wallet.publicKey) return alert("Connect wallet.");

        set({ startInFlight: true });
        try {
          let token = await get().ensureSession(wallet);

          const attempt = async (t) => {
            const res = await fetch(fnUrl('round-start'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
              body: JSON.stringify({ wagerUi: wager }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'round-start failed');
            return data;
          };

          let data;
          try {
            data = await attempt(token);
          } catch (e) {
            if (isSessionAuthErrorMessage(e?.message)) {
              const walletPk = wallet.publicKey.toBase58();
              get().clearSessionToken(walletPk);
              token = await get().ensureSession(wallet);
              data = await attempt(token);
            } else {
              throw e;
            }
          }

          const playBalanceRaw = new BN(data.playBalanceRaw);
          const uiBalanceStr = formatRawToUiString(playBalanceRaw, 6);
          const wagerUi = Number.isFinite(data.wagerUi) ? Number(data.wagerUi) : wager;

          set({
            status: 'running',
            sessionDirty: true,
            activeRoundId: data.roundId,
            activeExpiresAt: data.expiresAt,
            balanceRaw: playBalanceRaw,
            balance: Number(uiBalanceStr),
            lastWager: wagerUi,
            payout: 0,
            bankedMultiplier: 0.0,
            streaksMs: [],
            boostStreak: 0,
            currentTier: 0,
            fuel: 100,
            speed: 22,
            runId: runId + 1,
            bounceVelocity: { x: 0, y: 0, z: 0 }, // Reset bounce
          });
        } catch (e) {
          alert(e.message || String(e));
        } finally {
          set({ startInFlight: false });
        }
      },
      setBoosting: (active) => {
        const { status, boostStreak, bankedMultiplier, streaksMs } = get()
        if (status !== 'running') return
        if (active) {
          set({ isBoosting: true })
        } else {
          const durationMs = Math.floor(boostStreak * 1000);
          let addedMult = 0.0;
          if (boostStreak >= 50) addedMult = 20.0; else if (boostStreak >= 40) addedMult = 8.0; else if (boostStreak >= 30) addedMult = 3.5; else if (boostStreak >= 20) addedMult = 1.5; else if (boostStreak >= 10) addedMult = 0.5;
          set({
            isBoosting: false,
            boostStreak: 0,
            currentTier: 0,
            bankedMultiplier: bankedMultiplier + addedMult,
            streaksMs: durationMs > 0 ? [ ...(streaksMs || []), durationMs ] : (streaksMs || []),
          })
        }
      },
      tickGameLoop: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        let newFuel = s.isBoosting ? Math.min(s.maxFuel, s.fuel + s.fuelRegen * delta) : s.fuel - s.fuelDrain * delta
        if (newFuel <= 0) { get().crash(); return { fuel: 0 } }
        let newStreak = s.isBoosting ? s.boostStreak + delta : 0
        let newTier = s.isBoosting ? (s.boostStreak + delta >= 50 ? 5 : s.boostStreak + delta >= 40 ? 4 : s.boostStreak + delta >= 30 ? 3 : s.boostStreak + delta >= 20 ? 2 : s.boostStreak + delta >= 10 ? 1 : 0) : 0
        return { fuel: newFuel, boostStreak: newStreak, currentTier: newTier }
      }),
      tickPacing: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        return { speed: s.isBoosting ? Math.min(s.maxSpeed, s.speed + s.maxSpeed * 0.5 * delta) : Math.max(22, s.speed - s.maxSpeed * 1.5 * delta) }
      }),

      // [NEW] Trigger Collision (Bounce) Phase
      triggerCollision: (velocity) => {
        if (get().status === 'collided' || get().status === 'crashed') return;
        set({ status: 'collided', bounceVelocity: velocity, isBoosting: false });
        
        // Wait 0.8s for the bounce animation, then explode
        setTimeout(() => {
             // Only crash if we are still in collided state (game hasn't reset)
            if (get().status === 'collided') {
                get().crash();
            }
        }, 800);
      },

      crash: async () => {
         // ... (crash implementation remains unchanged) ...
         if (get().roundEndInFlight) return;
        const { activeRoundId, streaksMs, sessionToken } = get();
        set({ status: 'crashed', isBoosting: false });
        if (!activeRoundId) return;
        if (!sessionToken) return alert("Session auth missing. Reconnect wallet.");
        set({ roundEndInFlight: true });

        try {
          const res = await fetch(fnUrl('round-end'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
            body: JSON.stringify({ roundId: activeRoundId, streaksMs: streaksMs || [] }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'round-end failed');
          }
          const data = await res.json();
          const playBalanceRaw = new BN(data.playBalanceRaw);
          const uiBalanceStr = formatRawToUiString(playBalanceRaw, 6);

          set({
            activeRoundId: null,
            activeExpiresAt: null,
            streaksMs: [],
            bankedMultiplier: Number(data.multiplier) || 0,
            payout: Number(data.payoutUi) || 0,
            balanceRaw: playBalanceRaw,
            balance: Number(uiBalanceStr),
          });

          await get().refreshSession();
        } catch (e) {
          const msg = (e?.message || String(e));
          if (msg.toLowerCase().includes('no active round found')) {
            set({ activeRoundId: null, activeExpiresAt: null, streaksMs: [] });
            try { await get().refreshSession(); } catch {}
            return;
          }
          console.error("Round settlement failed:", e);
          alert(`Round settlement failed: ${e.message || e}`);
        } finally {
          set({ roundEndInFlight: false });
        }
      },
      reset: () => set((s) => ({ status: 'idle' })),
      refill: () => alert("Please use the 'Deposit' button to add funds."), 
    }),
    {
      name: 'streamweave-storage',
      partialize: (state) => ({
        wager: state.wager,
        sessionOwner: state.sessionOwner,
        sessionDirty: state.sessionDirty,
        needsFinalization: state.needsFinalization,
        escrowRaw: state.escrowRaw,
        balanceRaw: state.balanceRaw,
        balance: state.balance,
        sessionToken: state.sessionToken,
        sessionTokenWallet: state.sessionTokenWallet,
        authCooldownUntil: state.authCooldownUntil,
        soundEnabled: state.soundEnabled,
      }),
      merge: (persistedState, currentState) => {
        const next = { ...currentState, ...(persistedState || {}) };
        if (typeof next.balanceRaw === 'string') next.balanceRaw = new BN(next.balanceRaw, 16);
        if (typeof next.escrowRaw === 'string') next.escrowRaw = new BN(next.escrowRaw, 16);
        return next;
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
)