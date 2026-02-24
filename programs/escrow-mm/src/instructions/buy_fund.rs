use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;

use crate::{BuyFund, CustomErrorCode, Escrow};

impl<'info> BuyFund<'info> {
    pub fn buyfund(&mut self, amount: u64, remaining: &'info [AccountInfo<'info>]) -> Result<()> {
        require!(!remaining.is_empty(), CustomErrorCode::NoEscrowPassed);

        for escrow_info in remaining.iter() {
            let escrow: Account<Escrow> = Account::try_from(escrow_info)?;

            require!(
                escrow.mint_a == self.mint_a.to_account_info().key(),
                CustomErrorCode::InvalidAccounts
            );

            let mint_b = escrow.mint_b;
            let maker = escrow.maker;
            let bump = escrow.bump;
            let escrow_ata_a_key = get_associated_token_address(&escrow.key(), &escrow.mint_a);

            let maker_ata_b_key = get_associated_token_address(&escrow.maker, &escrow.mint_b);
            msg!("Escrow: {}", escrow.key());

            // todo i complete by the 03/03/2026 - (dd/mm/yyyy)
        }
        Ok(())
    }
}
