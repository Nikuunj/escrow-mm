use anchor_lang::prelude::*;

declare_id!("FcuXNkCebST8UeqnEekXUvUS4gGq3AiqpPpbbsSrXDgu");

#[program]
pub mod escrow_mm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
