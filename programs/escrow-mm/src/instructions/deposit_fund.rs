use crate::{DepositFund, DepositFundBumps, Escrow};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, TransferChecked};

impl<'info> DepositFund<'info> {
    pub fn create_vault_profile(
        &mut self,
        seeds: u64,
        amount_receive: u64,
        bump: &DepositFundBumps,
        min_withdraw_gap: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        self.escrow.set_inner(Escrow {
            maker: self.maker.key(),
            mint_a: self.mint_a.key(),
            mint_b: self.mint_b.key(),
            require: amount_receive,
            bump: bump.escrow,
            create_at: clock.unix_timestamp,
            min_withdraw_gap,
            seeds,
        });
        Ok(())
    }
    pub fn deposit_fund(&mut self, amount: u64) -> Result<()> {
        let transfer_acc = TransferChecked {
            from: self.maker_ata_a.to_account_info(),
            to: self.escrow_ata_a.to_account_info(),
            mint: self.mint_a.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.token_program_a.to_account_info(), transfer_acc);

        transfer_checked(cpi_ctx, amount, self.mint_a.decimals)
    }
}
