import { PublicKey, Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const PROGRAM_ID = new PublicKey('6AyQbmH2bSeip2vZWR82NpJ637SQRtrAU4bt2j2yVPwN');
const WEAVE_MINT = new PublicKey('S3Eqjw8eFu2w11KDKQ7SWuynmvBpjHH4cNeMgXFRvsQ');

export const getConnection = () => {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
};

export const getPlayerStatePda = (user: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('player_state'), user.toBuffer()], PROGRAM_ID)[0];

export const getTreasuryPda = () => PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID)[0];

export const getVaultAmounts = async (userPubkeyBase58: string) => {
  const connection = getConnection();
  const userKey = new PublicKey(userPubkeyBase58);

  const playerStatePda = getPlayerStatePda(userKey);
  const playerVaultAta = await getAssociatedTokenAddress(WEAVE_MINT, playerStatePda, true);

  let vaultAmount = 0n;
  try {
    const bal = await connection.getTokenAccountBalance(playerVaultAta);
    vaultAmount = BigInt(bal.value.amount);
  } catch {
    vaultAmount = 0n;
  }

  const treasuryPda = getTreasuryPda();
  const treasuryAta = await getAssociatedTokenAddress(WEAVE_MINT, treasuryPda, true);

  let treasuryAmount = 0n;
  try {
    const bal = await connection.getTokenAccountBalance(treasuryAta);
    treasuryAmount = BigInt(bal.value.amount);
  } catch {
    treasuryAmount = 0n;
  }

  return { vaultAmount, treasuryAmount };
};

