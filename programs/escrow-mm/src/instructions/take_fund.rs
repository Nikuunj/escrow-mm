use crate::{CustomErrorCode, TakeFund};

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{close_account, transfer_checked, CloseAccount, TransferChecked};

impl<'info> TakeFund<'info> {
    pub fn take_fund(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= self.escrow.create_at + self.escrow.min_withdraw_gap,
            CustomErrorCode::TooEarlyToWithdraw
        );
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            self.mint_a.to_account_info().key.as_ref(),
            &[self.escrow.bump],
        ]];

        let tranfer_taker_to_maker_b = TransferChecked {
            mint: self.mint_b.to_account_info(),
            from: self.taker_ata_b.to_account_info(),
            to: self.maker_ata_b.to_account_info(),
            authority: self.taker.to_account_info(),
        };

        let tranfer_escrow_to_taker_a = TransferChecked {
            mint: self.mint_a.to_account_info(),
            from: self.escrow_ata_a.to_account_info(),
            to: self.taker_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let taker_to_maker_ctx = CpiContext::new(
            self.token_program_b.to_account_info(),
            tranfer_taker_to_maker_b,
        );

        let escrow_to_taker_ctx = CpiContext::new_with_signer(
            self.token_program_a.to_account_info(),
            tranfer_escrow_to_taker_a,
            signer_seeds,
        );

        transfer_checked(
            taker_to_maker_ctx,
            self.escrow.require,
            self.mint_b.decimals,
        )?;

        transfer_checked(
            escrow_to_taker_ctx,
            self.escrow_ata_a.amount,
            self.mint_a.decimals,
        )
    }

    pub fn close_accounts(&mut self) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            self.mint_a.to_account_info().key.as_ref(),
            &[self.escrow.bump],
        ]];
        let close_acc = CloseAccount {
            destination: self.maker.to_account_info(),
            account: self.escrow_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let close_ctx = CpiContext::new_with_signer(
            self.token_program_a.to_account_info(),
            close_acc,
            signer_seeds,
        );

        close_account(close_ctx)
    }
}
