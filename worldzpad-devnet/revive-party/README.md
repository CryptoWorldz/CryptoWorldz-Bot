# REVIVE WorldzParTy Devnet Proof

REVIVE's proof harness now uses the **existing-token launch architecture**.

Canonical RVIV already exists on Solana mainnet:

- Mint: `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`
- Fixed supply: 200,000,000 RVIV
- Decimals: 6
- Mint authority: revoked
- Freeze authority: revoked

## Critical architecture correction

The earlier DBC proof path is **not valid for canonical RVIV execution**. Meteora DBC pool initialization includes base-mint creation/signing, while canonical RVIV already exists with its mint authority revoked.

Therefore:

**canonical RVIV → direct one-sided Meteora DAMM v2 existing-mint pool → permanent-lock position → fee-claim reconciliation → Worldz fee router**

No second REVIVE mint is permitted.

The old DBC FairFee file is retained only as historical/reference economics for future token-creation launches. It is not REVIVE's execution route.

## Price rule

### Devnet fixture

**1 RVIV = 0.000045 SOL**

This number is approved only for the disposable devnet simulation. It exists to test:

- one-sided existing-mint pool creation;
- first-buy behaviour;
- 75-bps MagicFeeNumber™;
- dynamic fee OFF;
- permanent liquidity locking;
- locked-position fee claims;
- actual protocol/referral deductions;
- Worldz fee-router reconciliation.

### Mainnet

**UNSET.**

The mainnet opening price may not automatically inherit the devnet fixture. It requires a later explicit owner decision after simulation evidence is reviewed.

## Direct DAMM v2 devnet proof

The disposable proof must:

1. Create a mock REVIVE mint on devnet with 200M supply and 6 decimals.
2. Revoke its mint and freeze authorities **before** pool creation.
3. Retain exactly 30M mock RVIV for the one-sided launch position.
4. Create a direct customizable DAMM v2 RVIV/wSOL pool at the 0.000045 SOL fixture price.
5. Use 75-bps static base fee with dynamic fee OFF.
6. Start with 30M base tokens and zero quote SOL.
7. Permanently lock the position at creation.
8. Execute a disposable first-buy test.
9. Independently decode the pool/position/lock state from devnet.
10. Claim test position fees and measure the actual protocol/referral deductions.
11. Reconcile only the fee revenue Worldz actually controls into the 51/17/15/8.5/8.5 router.
12. Record transaction signatures and account addresses.

## Legacy Flywheel proof

The separate Legacy engine remains:

- 10 verified Legacy mints;
- six-hour / 21,600-second epochs;
- minimum holding at both start and end boundary;
- 50% equal + 50% integer-square-root weighting;
- project/system/distribution/reward/liquidity wallets excluded;
- exactly-once settlement;
- rounding dust remains in the vault for roll-forward.

## Mainnet release rule

Mainnet remains locked until the existing-mint DAMM v2 proof, mainnet funding preflight, canonical RVIV balance proof, 75-bps on-chain fee proof, actual fee-claim/router receipts, permanent-lock evidence, team vesting execution proof, Worldz dependency gates and final owner wallet approval all pass.

**Devnet price ≠ mainnet price. Static config ≠ on-chain proof. Configured lock ≠ locked position proof.**
