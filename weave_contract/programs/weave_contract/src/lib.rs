use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::sysvar;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

// ⚠️ REPLACE THIS STRING WITH YOUR OWN PROGRAM ID IF IT CHANGED
declare_id!("6AyQbmH2bSeip2vZWR82NpJ637SQRtrAU4bt2j2yVPwN"); 

#[program]
pub mod weave_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, referee_pubkey: Pubkey, burn_bps: u16) -> Result<()> {
        require!(burn_bps <= 10_000, WeaveError::InvalidBurnBps);
        ctx.accounts.config.admin = ctx.accounts.admin.key();
        ctx.accounts.config.referee_pubkey = referee_pubkey;
        ctx.accounts.config.mint = ctx.accounts.mint.key();
        ctx.accounts.config.burn_bps = burn_bps;
        Ok(())
    }

    pub fn set_referee_pubkey(ctx: Context<SetConfig>, referee_pubkey: Pubkey) -> Result<()> {
        ctx.accounts.config.referee_pubkey = referee_pubkey;
        Ok(())
    }

    pub fn set_burn_bps(ctx: Context<SetConfig>, burn_bps: u16) -> Result<()> {
        require!(burn_bps <= 10_000, WeaveError::InvalidBurnBps);
        ctx.accounts.config.burn_bps = burn_bps;
        Ok(())
    }

    // 1. DEPOSIT: Player moves tokens from Wallet -> PDA Vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.player_token_account.to_account_info(),
            to: ctx.accounts.player_pda_token_account.to_account_info(),
            authority: ctx.accounts.player.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;
        
        // Update the on-chain ledger
        ctx.accounts.player_state.balance = ctx.accounts.player_state.balance.checked_add(amount).unwrap();
        Ok(())
    }

    // Deprecated: do not use (kept to avoid breaking older clients).
    pub fn withdraw(_ctx: Context<Withdraw>, _amount: u64, _server_sig: [u8; 64]) -> Result<()> {
        err!(WeaveError::DeprecatedInstruction)
    }

    // V2 WITHDRAW: settle whole session balance (authorized by referee signature).
    // The transaction MUST include an ed25519 verify instruction immediately before this instruction.
    pub fn withdraw_v2(ctx: Context<WithdrawV2>, authorized_amount: u64, nonce: u64, expiry: u64) -> Result<()> {
        // 1) expiry check
        let now = Clock::get()?.unix_timestamp;
        require!(
            now <= expiry as i64,
            WeaveError::SettlementExpired
        );

        // 2) anti-replay
        require!(nonce > ctx.accounts.player_auth.last_nonce, WeaveError::NonceAlreadyUsed);
        ctx.accounts.player_auth.last_nonce = nonce;

        // 3) verify ed25519 instruction (referee signature)
        let mut msg: Vec<u8> = Vec::with_capacity(32 + 8 + 8 + 8);
        msg.extend_from_slice(ctx.accounts.player.key().as_ref());
        msg.extend_from_slice(&authorized_amount.to_le_bytes());
        msg.extend_from_slice(&nonce.to_le_bytes());
        msg.extend_from_slice(&expiry.to_le_bytes());

        let current_ix = load_current_index_checked(&ctx.accounts.instructions.to_account_info())?;
        require!(current_ix > 0, WeaveError::MissingEd25519Instruction);
        let ed_ix = load_instruction_at_checked(
            (current_ix - 1) as usize,
            &ctx.accounts.instructions.to_account_info(),
        )?;
        verify_ed25519_ix(&ed_ix, &ctx.accounts.config.referee_pubkey, &msg)?;

        // 4) settle funds
        let vault_amount = ctx.accounts.player_pda_token_account.amount;

        let player_seeds: &[&[u8]] = &[
            b"player_state".as_ref(),
            ctx.accounts.player.key.as_ref(),
            &[ctx.bumps.player_state],
        ];
        let player_signer = &[player_seeds];

        let treasury_seeds: &[&[u8]] = &[b"treasury".as_ref(), &[ctx.bumps.treasury_pda]];
        let treasury_signer = &[treasury_seeds];

        if authorized_amount <= vault_amount {
            // Pay user from their vault
            transfer_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.player_pda_token_account.to_account_info(),
                ctx.accounts.player_token_account.to_account_info(),
                ctx.accounts.player_state.to_account_info(),
                player_signer,
                authorized_amount,
            )?;

            // Sweep losses to treasury
            let loss = vault_amount - authorized_amount;
            if loss > 0 {
                transfer_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.player_pda_token_account.to_account_info(),
                    ctx.accounts.treasury_token_account.to_account_info(),
                    ctx.accounts.player_state.to_account_info(),
                    player_signer,
                    loss,
                )?;

                // Optional burn from treasury
                let burn_bps = ctx.accounts.config.burn_bps as u64;
                if burn_bps > 0 {
                    let burn_amt = loss.saturating_mul(burn_bps) / 10_000;
                    if burn_amt > 0 {
                        let burn_accounts = Burn {
                            mint: ctx.accounts.mint.to_account_info(),
                            from: ctx.accounts.treasury_token_account.to_account_info(),
                            authority: ctx.accounts.treasury_pda.to_account_info(),
                        };
                        token::burn(
                            CpiContext::new_with_signer(
                                ctx.accounts.token_program.to_account_info(),
                                burn_accounts,
                                treasury_signer,
                            ),
                            burn_amt,
                        )?;
                    }
                }
            }
        } else {
            // Drain vault to user
            if vault_amount > 0 {
                transfer_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.player_pda_token_account.to_account_info(),
                    ctx.accounts.player_token_account.to_account_info(),
                    ctx.accounts.player_state.to_account_info(),
                    player_signer,
                    vault_amount,
                )?;
            }

            // Pay extra from treasury
            let extra = authorized_amount - vault_amount;
            if extra > 0 {
                transfer_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.treasury_token_account.to_account_info(),
                    ctx.accounts.player_token_account.to_account_info(),
                    ctx.accounts.treasury_pda.to_account_info(),
                    treasury_signer,
                    extra,
                )?;
            }
        }

        // 5) zero out session
        ctx.accounts.player_state.balance = 0;
        Ok(())
    }
}

// --- CONTEXT STRUCTS ---

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"config"],
        bump,
        space = 8 + 32 + 32 + 32 + 2
    )]
    pub config: Account<'info, Config>,

    /// The token mint for WEAVE.
    pub mint: Account<'info, Mint>,

    /// CHECK: PDA authority for treasury (signer via seeds).
    #[account(seeds = [b"treasury"], bump)]
    pub treasury_pda: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = treasury_pda
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = config.admin == admin.key() @ WeaveError::Unauthorized
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + 8 + 32, // Discriminator + Balance + Bump
        seeds = [b"player_state", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(mut)] 
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)] 
    pub player_pda_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"player_state", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player_pda_token_account: Account<'info, TokenAccount>,

    /// CHECK: The backend authority keypair (public key)
    pub server_authority: AccountInfo<'info>, 

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawV2<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player_state", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(
        init_if_needed,
        payer = player,
        seeds = [b"player_auth", player.key().as_ref()],
        bump,
        space = 8 + 8
    )]
    pub player_auth: Account<'info, PlayerAuth>,

    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player_pda_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    /// CHECK: PDA authority for treasury (signer via seeds).
    #[account(seeds = [b"treasury"], bump)]
    pub treasury_pda: AccountInfo<'info>,

    #[account(
        mut,
        constraint = treasury_token_account.owner == treasury_pda.key() @ WeaveError::InvalidTreasuryAccount,
        constraint = treasury_token_account.mint == config.mint @ WeaveError::InvalidTreasuryAccount
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(constraint = mint.key() == config.mint @ WeaveError::InvalidMint)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Instructions sysvar for signature verification.
    #[account(address = sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct PlayerState {
    pub balance: u64,
}

#[account]
pub struct PlayerAuth {
    pub last_nonce: u64,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub referee_pubkey: Pubkey,
    pub mint: Pubkey,
    pub burn_bps: u16,
}

#[error_code]
pub enum WeaveError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Deprecated instruction")]
    DeprecatedInstruction,
    #[msg("Missing ed25519 verification instruction")]
    MissingEd25519Instruction,
    #[msg("Invalid ed25519 verification instruction")]
    InvalidEd25519Instruction,
    #[msg("Settlement expired")]
    SettlementExpired,
    #[msg("Nonce already used")]
    NonceAlreadyUsed,
    #[msg("Invalid burn bps")]
    InvalidBurnBps,
    #[msg("Invalid treasury account")]
    InvalidTreasuryAccount,
    #[msg("Invalid mint")]
    InvalidMint,
}

fn transfer_with_signer<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer { from, to, authority };
    token::transfer(CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds), amount)?;
    Ok(())
}

fn verify_ed25519_ix(ix: &Instruction, expected_pubkey: &Pubkey, expected_msg: &[u8]) -> Result<()> {
    require!(
        ix.program_id == anchor_lang::solana_program::ed25519_program::id(),
        WeaveError::MissingEd25519Instruction
    );

    let data = ix.data.as_slice();
    // Minimal ed25519 instruction layout parsing (single signature).
    // See Solana ed25519 program instruction format.
    require!(data.len() > 1 + 1 + 2 * 7, WeaveError::InvalidEd25519Instruction);
    let num_signatures = data[0];
    require!(num_signatures == 1, WeaveError::InvalidEd25519Instruction);

    // Offsets begin at byte 2 (after count and padding)
    let pk_off = u16::from_le_bytes([data[6], data[7]]) as usize;
    let pk_ix = u16::from_le_bytes([data[8], data[9]]);
    let msg_off = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_sz = u16::from_le_bytes([data[12], data[13]]) as usize;
    let msg_ix = u16::from_le_bytes([data[14], data[15]]);

    // We only accept pubkey/message embedded in the same ed25519 instruction.
    require!(pk_ix == u16::MAX && msg_ix == u16::MAX, WeaveError::InvalidEd25519Instruction);
    require!(msg_sz == expected_msg.len(), WeaveError::InvalidEd25519Instruction);
    require!(pk_off + 32 <= data.len(), WeaveError::InvalidEd25519Instruction);
    require!(msg_off + msg_sz <= data.len(), WeaveError::InvalidEd25519Instruction);

    let pk_bytes = &data[pk_off..pk_off + 32];
    require!(pk_bytes == expected_pubkey.as_ref(), WeaveError::InvalidEd25519Instruction);

    let msg_bytes = &data[msg_off..msg_off + msg_sz];
    require!(msg_bytes == expected_msg, WeaveError::InvalidEd25519Instruction);

    Ok(())
}
