use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct BuyFund<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mint::token_program = token_program_a)]
    pub mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority =  buyer,
        associated_token::token_program = token_program_a

    )]
    pub buyer_ata_a: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
