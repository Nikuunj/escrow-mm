import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EscrowMm } from "../target/types/escrow_mm";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow-mm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrowMm as Program<EscrowMm>;

  // ── Main happy-path actors ──
  let maker: Keypair;
  let taker: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let makerAtaB: PublicKey;
  let takerAtaA: PublicKey;
  let takerAtaB: PublicKey;
  let escrowPda: PublicKey;
  let escrowAtaA: PublicKey;

  let earlyMaker: Keypair;
  let earlyMakerAtaA: PublicKey;
  let earlyMakerAtaB: PublicKey; 
  let earlyEscrowPda: PublicKey;
  let earlyEscrowAtaA: PublicKey;


  async function airdropAndConfirm(pubkey: PublicKey, lamports: number) {
    const sig = await provider.connection.requestAirdrop(pubkey, lamports);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      { signature: sig, ...latestBlockhash },
      "confirmed"
    );
  }


  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  async function depositFund(minWithdrawGap: number = 5) {
    await program.methods
      .depositFund(
        new anchor.BN(100_000),
        new anchor.BN(500_000),
        new anchor.BN(minWithdrawGap),
        new anchor.BN(12345)
      )
      .accountsStrict({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaA,
        escrow: escrowPda,
        escrowAtaA: escrowAtaA,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc({ commitment: "confirmed" });
  }

  async function earlyDepositFund(minWithdrawGap: number = 9999) {
    await program.methods
      .depositFund(
        new anchor.BN(100_000),
        new anchor.BN(500_000),
        new anchor.BN(minWithdrawGap),
        new anchor.BN(99999)
      )
      .accountsStrict({
        maker: earlyMaker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: earlyMakerAtaA,
        escrow: earlyEscrowPda,
        escrowAtaA: earlyEscrowAtaA,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([earlyMaker])
      .rpc({ commitment: "confirmed" });
  }

  before(async () => {
    maker = Keypair.generate();
    taker = Keypair.generate();
    earlyMaker = Keypair.generate();

    await airdropAndConfirm(maker.publicKey, 2 * LAMPORTS_PER_SOL);
    await airdropAndConfirm(taker.publicKey, 2 * LAMPORTS_PER_SOL);
    await airdropAndConfirm(earlyMaker.publicKey, 2 * LAMPORTS_PER_SOL);

    // Create SPL mint (mintA)
    mintA = await createMint(
      provider.connection, maker, maker.publicKey, null, 6,
      undefined, undefined, TOKEN_PROGRAM_ID
    );

    // Create Token-2022 mint (mintB)
    mintB = await createMint(
      provider.connection, maker, maker.publicKey, null, 6,
      undefined, undefined, TOKEN_2022_PROGRAM_ID
    );

    [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), mintA.toBuffer()],
      program.programId
    );
    escrowAtaA = getAssociatedTokenAddressSync(mintA, escrowPda, true, TOKEN_PROGRAM_ID);


    [earlyEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), earlyMaker.publicKey.toBuffer(), mintA.toBuffer()],
      program.programId
    );
    earlyEscrowAtaA = getAssociatedTokenAddressSync(mintA, earlyEscrowPda, true, TOKEN_PROGRAM_ID);


    makerAtaA = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintA, maker.publicKey,
      false, undefined, undefined, TOKEN_PROGRAM_ID
    )).address;

    makerAtaB = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintB, maker.publicKey,
      false, undefined, undefined, TOKEN_2022_PROGRAM_ID
    )).address;


    takerAtaA = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintA, taker.publicKey,
      false, undefined, undefined, TOKEN_PROGRAM_ID
    )).address;

    takerAtaB = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintB, taker.publicKey,
      false, undefined, undefined, TOKEN_2022_PROGRAM_ID
    )).address;

    // ── ATAs for earlyMaker ──
    earlyMakerAtaA = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintA, earlyMaker.publicKey,
      false, undefined, undefined, TOKEN_PROGRAM_ID
    )).address;


    earlyMakerAtaB = (await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintB, earlyMaker.publicKey,
      false, undefined, undefined, TOKEN_2022_PROGRAM_ID
    )).address;

    await mintTo(
      provider.connection, maker, mintA, makerAtaA, maker,
      3_000_000, [], undefined, TOKEN_PROGRAM_ID
    );


    await mintTo(
      provider.connection, maker, mintA, earlyMakerAtaA, maker,
      200_000, [], undefined, TOKEN_PROGRAM_ID
    );


    await mintTo(
      provider.connection, maker, mintB, takerAtaB, maker,
      500_000, [], undefined, TOKEN_2022_PROGRAM_ID
    );
  });

  it("FAIL: swap too early — before min_withdraw_gap elapses", async () => {

    await earlyDepositFund(9999);
    console.log("earlyMaker deposited with 9999s lock");

    try {
      await program.methods
        .swapFund()
        .accountsStrict({
          taker: taker.publicKey,
          maker: earlyMaker.publicKey,
          mintA: mintA,
          mintB: mintB,
          escrow: earlyEscrowPda,
          makerAtaB: earlyMakerAtaB,
          escrowAtaA: earlyEscrowAtaA,
          takerAtaA: takerAtaA,
          takerAtaB: takerAtaB,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          tokenProgramA: TOKEN_PROGRAM_ID,
          tokenProgramB: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([taker])
        .rpc({ commitment: "confirmed" });

      assert.fail("Expected TooEarlyToWithdraw but swap succeeded");
    } catch (err: any) {
      if (err.message === "Expected TooEarlyToWithdraw but swap succeeded") throw err;
      assert.include(
        err.message,
        "TooEarlyToWithdraw",
        `Expected TooEarlyToWithdraw, got: ${err.message}`
      );
      console.log("Swap correctly rejected: TooEarlyToWithdraw");
    }
  });

  it("FAIL: refund too early — before min_withdraw_gap elapses", async () => {
    
    try {
      await program.methods
        .refund()
        .accountsStrict({
          maker: earlyMaker.publicKey,
          mintA: mintA,
          escrow: earlyEscrowPda,
          makerAtaA: earlyMakerAtaA,
          escrowAtaA: earlyEscrowAtaA,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([earlyMaker])
        .rpc({ commitment: "confirmed" });

      assert.fail("Expected TooEarlyToWithdraw but refund succeeded");
    } catch (err: any) {
      if (err.message === "Expected TooEarlyToWithdraw but refund succeeded") throw err;
      assert.include(
        err.message,
        "TooEarlyToWithdraw",
        `Expected TooEarlyToWithdraw, got: ${err.message}`
      );
      console.log("Refund correctly rejected: TooEarlyToWithdraw");
    }
  });

  it("Deposit SPL token into escrow", async () => {
    await depositFund(5);
    console.log("Maker deposited 100_000 mintA into escrow");

    console.log("Waiting 6s for min_withdraw_gap to elapse...");
    await sleep(6_000);
  });

  it("Swap Token-2022 for SPL token", async () => {
    await program.methods
      .swapFund()
      .accountsStrict({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        escrow: escrowPda,
        makerAtaB: makerAtaB,
        escrowAtaA: escrowAtaA,
        takerAtaA: takerAtaA,
        takerAtaB: takerAtaB,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgramA: TOKEN_PROGRAM_ID,
        tokenProgramB: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker])
      .rpc({ commitment: "confirmed" });

    console.log("Taker swapped 500_000 mintB → received mintA from escrow");
  });

  it("Re-deposit SPL token into escrow for refund test", async () => {
    await depositFund(5);
    console.log("Maker re-deposited 100_000 mintA into escrow");

    console.log("Waiting 5s for min_withdraw_gap to elapse...");
    await sleep(6_000);
  });

  it("Refund remaining escrow to maker", async () => {
    await program.methods
      .refund()
      .accountsStrict({
        maker: maker.publicKey,
        mintA: mintA,
        escrow: escrowPda,
        makerAtaA: makerAtaA,
        escrowAtaA: escrowAtaA,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc({ commitment: "confirmed" });

    console.log("Escrow refunded remaining mintA to maker");
  });
});