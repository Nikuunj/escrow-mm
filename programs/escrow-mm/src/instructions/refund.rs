use crate::Refund;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{close_account, transfer_checked, CloseAccount, TransferChecked};

impl<'info> Refund<'info> {
    pub fn refund(&mut self) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            self.mint_a.to_account_info().key.as_ref(),
            &[self.escrow.bump],
        ]];

        let tranfer_accounts = TransferChecked {
            mint: self.mint_a.to_account_info(),
            from: self.escrow_ata_a.to_account_info(),
            to: self.maker_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let tranfer_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            tranfer_accounts,
            signer_seeds,
        );

        transfer_checked(tranfer_ctx, self.escrow_ata_a.amount, self.mint_a.decimals)
    }

    pub fn close_accounts(&mut self) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            self.mint_a.to_account_info().key.as_ref(),
            &[self.escrow.bump],
        ]];

        let close_acc = CloseAccount {
            account: self.escrow_ata_a.to_account_info(),
            authority: self.escrow.to_account_info(),
            destination: self.maker.to_account_info(),
        };

        let close_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            close_acc,
            signer_seeds,
        );

        close_account(close_ctx)
    }
}
