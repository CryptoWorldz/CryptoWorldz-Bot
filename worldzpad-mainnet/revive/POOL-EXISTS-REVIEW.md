# REVIVE mainnet pool address review — 26 September 2026

Status: **RVIV/WSOL pool confirmed on mainnet; do not create a second pool or submit the old creation transaction. Public trading and fee routing remain to be verified.**

## Decoded mainnet state, 26 September 2026 04:30–04:32 UTC

Read-only SDK audit in GitHub Actions run `36218039679`, repeated with a local buy quote in `36218106229`:

- Pool mints are the canonical RVIV mint and WSOL. Creator is the recorded Squads treasury vault `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`.
- RVIV pool vault held **30,000,000 RVIV**; WSOL vault held **1 lamport** at audit time.
- Pool status is enabled (`0`); activation timestamp `1790368060` = 25 September 2026 20:27:40 UTC.
- One position, `AcRzukwgfUSfHoi3ZPaP5QiRK9M2A3b9eBup1FcMfXBe`, recorded zero unlocked and zero vested liquidity. Its permanent locked liquidity equalled the pool's total liquidity: `117394360433793354711886389008843` units.
- Fixed-fee numerator decoded as `7,500,000` against the SDK denominator `1,000,000,000`, equal to **75 bps / 0.75%**. Collection mode is token B (WSOL).
- A local SDK quote for **0.001 SOL** estimated **22.055539 RVIV** before actual execution, with a quoted minimum **22.053333 RVIV** at the script's slippage input. This is a calculation, **not** a successful on-chain swap or evidence that Jupiter routes to the pool.

Next: verify live swap simulation, actual trade history, on-chain fee recipient/claim rules, owner-controlled position NFT, Jupiter discovery and exact transaction receipts. Check that the planned price and liquidity behavior are acceptable. The pool's existence invalidates the old create-pool execution route.

## Confirmed in GitHub Actions

- Read-only preflight run `36217247451` attempted the canonical existing-mint DAMM v2 pool-creation simulation and failed at instruction 5 with `Allocate: account ... already in use`.
- Derived pool: `YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c`.
- Rerun `36217528017` queried the derived address before simulation. Account exists; owner is Meteora DAMM v2 program `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`; rent balance 6,299,200 lamports.
- The earlier address-only check established occupancy. The decoded audit above establishes the pair and locked position, but still does not prove a successful trade.
- The sponsor had 0.029059039 SOL and the treasury had 0 SOL in the first preflight snapshot. Those are time-dependent observations; recheck before any execution.

## Next read-only proof

1. Decode the existing pool account with the pinned Meteora DAMM v2 SDK. Verify both token mints, fee parameters, activation, pool authority, vaults, price and current liquidity against the canonical RVIV mint `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R` and WSOL.
2. Identify its creation signature and whether the pool is already live. Inspect the position NFTs and permanent-lock evidence; do not infer a lock from the `isLockLiquidity` config setting.
3. If it is the intended pool, plan an **existing-pool position/add-liquidity** route and simulate it read-only. Do not retry `createCustomPool` against an occupied address.
4. If it is unrelated or unsuitable, derive a **distinct, documented pool configuration** and prove its fee and protection rules before any creation proposal. Never overwrite the canonical mint or route user tokens to an unknown pool.
5. Verify the 75-bps on-chain fee, sponsor/treasury balances, Squads proposal and signers, and an exact transaction preview. The launch approval must be the human wallet signature on that reviewed transaction, separate from Turn Up Town's message-only ownership proof.
6. Keep legacy distribution, DevCity approvals and Jupiter team vesting independently gated. None is made executable by a pool decision.

Public mainnet execution stays disabled in the REVIVE contract and route config until the applicable gates pass.
