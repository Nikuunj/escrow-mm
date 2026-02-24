use anchor_lang::prelude::*;

#[error_code]
pub enum CustomErrorCode {
    #[msg("No escrow accounts were passed")]
    NoEscrowPassed,
    #[msg("Invalid remaining accounts")]
    InvalidAccounts,
    #[msg("Invalid escrow PDA")]
    InvalidEscrow,
    #[msg("Invalid mint A")]
    InvalidMintA,
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
    #[msg("Vault empty")]
    EmptyVault,
}
