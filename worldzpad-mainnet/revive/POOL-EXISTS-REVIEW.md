# REVIVE mainnet pool address review — 26 September 2026

Status: **HOLD — read-only audit required; no launch transaction prepared for signing.**

## Confirmed in GitHub Actions

- Read-only preflight run `36217247451` attempted the canonical existing-mint DAMM v2 pool-creation simulation and failed at instruction 5 with `Allocate: account ... already in use`.
- Derived pool: `YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c`.
- Rerun `36217528017` queried the derived address before simulation. Account exists; owner is Meteora DAMM v2 program `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`; rent balance 6,299,200 lamports.
- This establishes address occupancy and program ownership. **It does not establish that this is a valid RVIV/WSOL pool, that liquidity is present, or that anyone can trade RVIV.**
- The sponsor had 0.029059039 SOL and the treasury had 0 SOL in the first preflight snapshot. Those are time-dependent observations; recheck before any execution.

## Next read-only proof

1. Decode the existing pool account with the pinned Meteora DAMM v2 SDK. Verify both token mints, fee parameters, activation, pool authority, vaults, price and current liquidity against the canonical RVIV mint `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R` and WSOL.
2. Identify its creation signature and whether the pool is already live. Inspect the position NFTs and permanent-lock evidence; do not infer a lock from the `isLockLiquidity` config setting.
3. If it is the intended pool, plan an **existing-pool position/add-liquidity** route and simulate it read-only. Do not retry `createCustomPool` against an occupied address.
4. If it is unrelated or unsuitable, derive a **distinct, documented pool configuration** and prove its fee and protection rules before any creation proposal. Never overwrite the canonical mint or route user tokens to an unknown pool.
5. Verify the 75-bps on-chain fee, sponsor/treasury balances, Squads proposal and signers, and an exact transaction preview. The launch approval must be the human wallet signature on that reviewed transaction, separate from Turn Up Town's message-only ownership proof.
6. Keep legacy distribution, DevCity approvals and Jupiter team vesting independently gated. None is made executable by a pool decision.

Public mainnet execution stays disabled in the REVIVE contract and route config until the applicable gates pass.
