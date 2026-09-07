# WorldzPad WLDZ Devnet Execution

This harness is the first real on-chain execution stage for #001 WORLDZ / WLDZ.

## Phase 1 — real devnet proof

The GitHub workflow uses a disposable, ephemeral DEVNET wallet only. It:

1. checks the locked 100M / 25-25-25-25 / AUTO rules;
2. confirms the Meteora DAMM v2 program exists and is executable on Solana devnet;
3. creates a Token-2022 DEVNET mint;
4. mints exactly 100,000,000 test WLDZ;
5. allocates 25M each to Founder, Liquidity, People+Charity and Ecosystem master vault token accounts;
6. revokes mint authority;
7. verifies freeze authority is unset;
8. independently reads the on-chain supply and all four vault balances;
9. publishes public addresses/signatures as a workflow artifact.

Ephemeral devnet private keys are written only to `.runtime/` for same-job follow-up work. `.runtime/` is gitignored and is never uploaded as an artifact.

## Not mainnet

This test WLDZ is disposable and has no monetary value. It does not use JayJayTeamDev's mainnet signer or funds.

The canonical mainnet target remains a vanity mint beginning `WLDZ...`, explicit operator signing, the four-quarter vault layout, and the security gates defined in `WORLDZPAD-WLDZ-TOTAL-DESIGN.md`.

## Next phase

After Phase 1 passes:

- fund a small devnet WLDZ/wSOL test position;
- construct and simulate a Meteora DAMM v2 customizable pool with `CollectFeeMode.OnlyB` and 200 bps base fee;
- create the pool if simulation passes;
- execute controlled swaps;
- claim quote-side fees and prove they are wSOL-only;
- reconcile AUTO routing and test reward, LP-growth, buyback/burn and charity accounting.
