import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Program, AnchorProvider, BN, utils, web3 } from '@coral-xyz/anchor'
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PROGRAM_ID, WEAVE_MINT, TREASURY_ADDRESS } from '../utils/constants'
import idl from '../utils/idl.json'

const NETWORK = "https://api.devnet.solana.com"
const PROGRAM_ID_STR = typeof PROGRAM_ID === 'string'
  ? PROGRAM_ID
  : (idl?.address || idl?.metadata?.address || '').toString()
const DECIMALS = 9; // Standard Solana Token Decimals
const SCALE = new BN(10).pow(new BN(DECIMALS));

// Convert UI amount (string/number) to raw BN without float rounding.
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

// Convert raw BN to a UI string, trimming zeros and limiting precision.
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
  // Pass programId explicitly to avoid relying on idl.address if bundler mangles it
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
      wager: 1000, // This is now in UI UNITS (e.g., 1000 WEAVE)
      lastWager: 0,
      payout: 0,
      bankedMultiplier: 0.0,
      
      fuel: 100, maxFuel: 100, fuelDrain: 8, fuelRegen: 15,
      boostStreak: 0, currentTier: 0, isBoosting: false,
      speed: 22, maxSpeed: 80, shipPos: { x: 0, y: 0, z: 0 }, shake: 0, runId: 0,

      setShipPos: (pos) => set({ shipPos: pos }),
      setShake: (v) => set({ shake: v }),
      setWager: (amount) => set({ wager: amount }),

      // 1. SYNC SESSION
      syncSession: async (wallet) => {
        if (!wallet || !wallet.publicKey) return;
        
        try {
          const connection = new web3.Connection(NETWORK, "confirmed");
          const { program, programId, anchorWallet } = buildProgram(connection, wallet);
          const walletPk = anchorWallet.publicKey.toBase58();

          const [playerStatePda] = web3.PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("player_state"), anchorWallet.publicKey.toBuffer()],
            programId
          );

          const account = await program.account.playerState.fetchNullable(playerStatePda);
          
          if (account) {
            const escrowRaw = account.balance;
            const uiEscrowStr = formatRawToUiString(escrowRaw, 6);

            set((s) => {
              const ownerChanged = s.sessionOwner && s.sessionOwner !== walletPk;

              // If wallet changed, reset local session and show escrow as the starting balance.
              if (ownerChanged) {
                return {
                  sessionOwner: walletPk,
                  sessionDirty: false,
                  needsFinalization: false,
                  escrowRaw,
                  balanceRaw: escrowRaw,
                  balance: Number(uiEscrowStr),
                };
              }

              if (s.sessionDirty) {
                const localAtZero = BN.isBN(s.balanceRaw) && s.balanceRaw.eq(new BN(0));
                const needsFinalization = localAtZero && escrowRaw.gt(new BN(0));
                return {
                  sessionOwner: walletPk,
                  escrowRaw,
                  needsFinalization,
                };
              }

              return {
                sessionOwner: walletPk,
                sessionDirty: false,
                needsFinalization: false,
                escrowRaw,
                balanceRaw: escrowRaw,
                balance: Number(uiEscrowStr),
              };
            });

            const { sessionDirty, balanceRaw } = get();
            const needsFinalization =
              sessionDirty && BN.isBN(balanceRaw) && balanceRaw.eq(new BN(0)) && escrowRaw.gt(new BN(0));

            if (needsFinalization) {
              console.log(`⚠️ Unsettled escrow detected: ${uiEscrowStr} (finalize session to sweep losses).`);
            } else {
              console.log("✅ Synced Escrow:", uiEscrowStr);
            }
          } else {
            console.log("🆕 New User: 0 Balance");
            set((s) => {
              const ownerChanged = s.sessionOwner && s.sessionOwner !== walletPk;
              if (ownerChanged || !s.sessionDirty) {
                return {
                  sessionOwner: walletPk,
                  sessionDirty: false,
                  needsFinalization: false,
                  escrowRaw: new BN(0),
                  balanceRaw: new BN(0),
                  balance: 0,
                };
              }
              return { sessionOwner: walletPk, escrowRaw: new BN(0), needsFinalization: false };
            });
          }
        } catch (e) {
          console.log("Sync Log:", e.message);
        }
      },

      // 2. DEPOSIT FUNDS (Fixed Math)
      depositFunds: async (walletCtx, amount) => {
        const wallet = walletCtx;
        try {
          if (!wallet || !wallet.publicKey) return alert("Connect wallet.");

          const { sessionDirty, balanceRaw } = get();
          if (sessionDirty && BN.isBN(balanceRaw) && balanceRaw.eq(new BN(0))) {
            return alert("You have an unfinished session. Click FINALIZE SESSION before depositing again.");
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

          // Create ATAs if needed
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

          // Convert UI amount to raw BN precisely
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

          // Patch instruction metas (The workaround from previous agent)
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
          
          // Optimistic Update (raw + ui)
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

      // 3. WITHDRAW FUNDS (Backend Integrated)
      withdrawFunds: async (walletCtx) => {
        const wallet = walletCtx;
        try {
          if (!wallet || !wallet.publicKey) return alert("Connect wallet.");
          
          const connection = new web3.Connection(NETWORK, "confirmed");
          const { program, programId, anchorWallet } = buildProgram(connection, wallet);
          const { balance, balanceRaw } = get();

          // 1. Convert current session UI balance to raw precisely.
          // `balanceRaw` is treated as the session raw balance (kept in sync with gameplay updates).
          const requestedRawAmount = balanceRaw && BN.isBN(balanceRaw)
            ? balanceRaw
            : parseUiAmountToBN(balance);
          const requestedUi = formatRawToUiString(requestedRawAmount, 6);
          console.log(`Withdrawing ${requestedUi} WEAVE (${requestedRawAmount.toString()} units)...`);

          // If the player is at 0 locally, they may still have escrowed funds on-chain
          // (because losses are only swept to treasury during settlement). In that case,
          // we allow a "withdraw 0" which finalizes the session and sweeps the remainder to the house.
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

          // 2. FETCH SIGNATURE FROM BACKEND
          // Local dev: run `netlify dev` (default `http://localhost:8888`) so `/.netlify/functions/*` works.
          // Prod: keep it relative so Netlify serves the function.
          const FUNCTIONS_BASE_URL =
            import.meta.env.VITE_FUNCTIONS_BASE_URL ||
            (import.meta.env.DEV ? "http://localhost:8888" : "");
          const API_URL = `${FUNCTIONS_BASE_URL}/.netlify/functions/settle-game`;
          
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userPubkey: anchorWallet.publicKey.toBase58(),
              requestedAmount: requestedRawAmount.toString(), // Send Raw String
            })
          });

          if (!response.ok) {
             const err = await response.json();
             throw new Error(err.error || "Server declined withdrawal");
          }

          const { signature, authorizedAmount, nonce, expiry, refereePubkey } = await response.json();
          console.log("✅ Received Server Settlement");

          const authorizedRawAmount = new BN(authorizedAmount);
          const nonceBn = new BN(nonce);
          const expiryBn = new BN(expiry);

          // 3. Build ed25519 verify instruction
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

          // 4. EXECUTE ON-CHAIN (withdrawV2)
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

          // Check for ATA creation (User might have deleted their wallet?)
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

          // Must be immediately before the program instruction
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
        }
      },

      // --- GAMEPLAY LOGIC (Standard) ---
      start: () => {
        const { balance, balanceRaw, wager, runId } = get()
        if (balance < wager) { // Wager is now in UI Units, Balance is UI Units. Safe to compare.
            alert("INSUFFICIENT FUNDS. Please Deposit $WEAVE.");
            return;
        }
        const wagerRaw = parseUiAmountToBN(wager);
        const nextRaw = (balanceRaw ?? new BN(0)).sub(wagerRaw);
        set({ 
          status: 'running', 
          sessionDirty: true,
          balance: balance - wager, 
          balanceRaw: nextRaw,
          lastWager: wager,
          payout: 0,
          bankedMultiplier: 0.0,
          boostStreak: 0, currentTier: 0, fuel: 100, speed: 22,
          runId: runId + 1 
        })
      },
      setBoosting: (active) => {
        const { status, boostStreak, bankedMultiplier } = get()
        if (status !== 'running') return
        if (active) {
          set({ isBoosting: true })
        } else {
          let addedMult = 0.0;
          if (boostStreak >= 50) addedMult = 20.0; else if (boostStreak >= 40) addedMult = 8.0; else if (boostStreak >= 30) addedMult = 3.5; else if (boostStreak >= 20) addedMult = 1.5; else if (boostStreak >= 10) addedMult = 0.5;
          set({ isBoosting: false, boostStreak: 0, currentTier: 0, bankedMultiplier: bankedMultiplier + addedMult })
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
      crash: () => {
        const { lastWager, bankedMultiplier, balance, balanceRaw } = get()
        const winAmount = Math.floor(lastWager * bankedMultiplier);
        const winRaw = parseUiAmountToBN(winAmount);
        const nextRaw = (balanceRaw ?? new BN(0)).add(winRaw);
        set({
          status: 'crashed',
          isBoosting: false,
          payout: winAmount,
          balance: balance + winAmount,
          balanceRaw: nextRaw,
          // If the player busted to exactly 0, require a finalize sweep before new deposits.
          needsFinalization: nextRaw.eq(new BN(0)),
        })
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
      }),
      merge: (persistedState, currentState) => {
        const next = { ...currentState, ...(persistedState || {}) };
        // Rehydrate BN fields serialized by bn.js as hex strings.
        if (typeof next.balanceRaw === 'string') next.balanceRaw = new BN(next.balanceRaw, 16);
        if (typeof next.escrowRaw === 'string') next.escrowRaw = new BN(next.escrowRaw, 16);
        return next;
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
)
