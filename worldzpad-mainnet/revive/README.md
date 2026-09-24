# REVIVE ($RVIV) — v1 build

Branch: `revive-v1-build`  
Status: **build only; no mainnet launch execution is authorized by these files.**

## Canonical token

REVIVE is already minted. Do **not** create a second RVIV mint.

- Mint: `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`
- Supply: **200,000,000 RVIV**
- Decimals: **6**
- Mint authority: **revoked**
- Freeze authority: **revoked**
- Source treasury vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`

## Locked supply plan

| Bucket | % | RVIV |
|---|---:|---:|
| Verified legacy Dev wallets | 15% | 30,000,000 |
| Team vesting | 15% | 30,000,000 |
| Initial active liquidity | 15% | 30,000,000 |
| Staged liquidity reserve | 20% | 40,000,000 |
| Legacy Revival claims | 10% | 20,000,000 |
| DevCity™ 100 | 10% | 20,000,000 |
| OneWorldz charity impact | 10% | 20,000,000 |
| Treasury / operations reserve | 5% | 10,000,000 |
| **Total** | **100%** | **200,000,000** |

## Dev allocation

The 15% Dev allocation is split equally across the six registry wallets already marked **owner-controlled + legacy_dev**: 5,000,000 RVIV each. Watch-only distribution wallets are not treated as owner wallets.

## Team

15% is vested: **0% immediate**, 90-day cliff, then 24-month monthly linear vesting. Beneficiary weights are intentionally not invented; they must be finalized and verified before execution.

## DevCity™ 100

WORLDZ uses 50 seats × 100,000 WLDZ. REVIVE expands to **100 seats × 200,000 RVIV**.

- Existing 50 seats: grandfathered.
- New seats: 50 verified-developer recruitment slots.
- Total pool: 20,000,000 RVIV (10%).

## Legacy Revival

The existing snapshot remains canonical:

- Batch: `4b7faa3f-c6cd-435f-9840-43a04cd090a0`
- Root: `b0a58be30c8323bf22d57939cd989be6b1631f5dd17a682cd829d0cc6a85e548`
- Eligible wallets: **216**
- Ledger total: **20,000,000 RVIV**
- Claims currently open: **no**

The current database ledger is correct. The live snapshot-regeneration function contains a stale 1%-pool calculation path, so resnapshot/regeneration stays locked until that source is repaired and re-verified.

## Worldz FairFee™ candidate

DBC target gross trader fee: **0.625%**.

At Meteora's documented 20% protocol share, the target becomes:

- Meteora protocol: **0.125% of trade**
- Creator: **0.30%**
- Worldz referrer: **0.10%**
- WorldzLaunchPad: **0.05%**
- OneWorldz Impact: **0.05%**

The Worldz-controlled 0.50% is split **60 / 20 / 10 / 10**. A Meteora swap-host referral is separate and must be disclosed separately.

No silent fee rounding is permitted. Exact representation must pass devnet for both DBC and migrated DAMM v2.

## Liquidity protection

Candidate migrated DAMM v2 LP distribution:

- 60% creator permanent locked liquidity
- 40% partner permanent locked liquidity
- 0% creator claimable liquidity
- 0% partner claimable liquidity

Target: **100% permanent migrated-liquidity lock**.

## Distribution funding

RVIV allocations and SOL transaction funding are separate. The initial SOL funding plan uses a **1.5 SOL ceiling**, but every top-up is calculated by preflight against current rent/fees and funded only where required.

## Mainnet gates

No REVIVE market launch until allocation validation, DevCity verification, team vesting proof, legacy claim proof, FairFee math, DBC migration, permanent-lock proof, distribution funding preflight and final wallet approval all pass.
