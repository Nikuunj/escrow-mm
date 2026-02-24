use anchor_lang::prelude::*;

declare_id!("FcuXNkCebST8UeqnEekXUvUS4gGq3AiqpPpbbsSrXDgu");

pub mod derive_accounts;
pub mod errors;
pub mod instructions;
pub mod states;

pub use derive_accounts::*;
pub use errors::*;
pub use instructions::*;
pub use states::*;

#[program]
pub mod escrow_mm {
    use super::*;

    pub fn deposit_fund(
        ctx: Context<DepositFund>,
        deposit_amount: u64,
        require_fund: u64,
        seeds: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_fund(deposit_amount)?;
        ctx.accounts
            .create_vault_profile(seeds, require_fund, &ctx.bumps)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund()?;
        ctx.accounts.close_accounts()
    }

    pub fn swap_fund(ctx: Context<TakeFund>) -> Result<()> {
        ctx.accounts.take_fund()?;
        ctx.accounts.close_accounts()
    }
}
