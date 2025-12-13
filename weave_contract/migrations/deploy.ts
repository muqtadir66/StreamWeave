// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import fs from "node:fs";
import path from "node:path";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const program = anchor.workspace.weaveContract as anchor.Program;

  // --- Idempotent on-chain initialization (devnet) ---
  // Creates:
  // - Config PDA storing admin + referee pubkey + mint + burn_bps
  // - Treasury PDA ATA (holds bankroll used for payouts)
  //
  // Safe to run multiple times: if config exists, we skip.
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const existingConfig = await provider.connection.getAccountInfo(configPda);
  if (existingConfig) {
    console.log(`[migrate] Config already exists: ${configPda.toBase58()}`);
    return;
  }

  // WEAVE mint (devnet mock mint)
  const mint = new anchor.web3.PublicKey(
    process.env.WEAVE_MINT || "S3Eqjw8eFu2w11KDKQ7SWuynmvBpjHH4cNeMgXFRvsQ"
  );

  // Treasury PDA + its ATA
  const [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );
  const treasuryTokenAccount = anchor.utils.token.associatedAddress({
    mint,
    owner: treasuryPda,
  });

  // Referee pubkey loaded from root `referee.json` (same bytes as GAME_AUTHORITY_KEY).
  const refereePath = path.resolve(__dirname, "..", "..", "referee.json");
  if (!fs.existsSync(refereePath)) {
    throw new Error(
      `Missing ${refereePath}. Create it with: solana-keygen new -o referee.json --no-bip39-passphrase`
    );
  }
  const refereeSecret = Uint8Array.from(
    JSON.parse(fs.readFileSync(refereePath, "utf8"))
  );
  const referee = anchor.web3.Keypair.fromSecretKey(refereeSecret);

  console.log(`[migrate] Initializing config: ${configPda.toBase58()}`);
  console.log(`[migrate] Admin: ${provider.wallet.publicKey.toBase58()}`);
  console.log(`[migrate] Referee pubkey: ${referee.publicKey.toBase58()}`);
  console.log(`[migrate] Mint: ${mint.toBase58()}`);
  console.log(`[migrate] Treasury PDA: ${treasuryPda.toBase58()}`);
  console.log(`[migrate] Treasury ATA: ${treasuryTokenAccount.toBase58()}`);

  await program.methods
    .initialize(referee.publicKey, 0) // burn_bps = 0 for now
    .accounts({
      admin: provider.wallet.publicKey,
      config: configPda,
      mint,
      treasuryPda,
      treasuryTokenAccount,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("[migrate] Initialize complete.");
};
