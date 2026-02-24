use anchor_lang::prelude::*;

// user can get fund after specific time gap // temporary lock
#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub require: u64,
    pub bump: u8,
    pub seeds: u64,
    pub create_at: i64,
    pub min_withdraw_gap: i64,
}

// multi sig todo
