# REVIVE ($RVIV) — v1 build

Branch: `revive-v1-build`  
Status: **canonical RVIV mint and RVIV/WSOL DAMM v2 pool exist on mainnet.** The pool creation transaction is complete; no subsequent pool trade was found in the 26 September 2026 04:34 UTC audit. No additional mainnet execution is authorized by these files. See `POOL-EXISTS-REVIEW.md` for fresh decoded state and a successful unsigned sample buy simulation.

## Canonical token

REVIVE is already minted. Do **not** create a second RVIV mint.

- Mint: `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`
- Supply: **200,000,000 RVIV**
- Decimals: **6**
- Mint authority: **revoked**
- Freeze authority: **revoked**
- Source treasury vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Existing RVIV/WSOL pool: `YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c` — 30M RVIV in its vault, 75-bps fixed fee and permanently locked initial position at audit time. Its WSOL vault held 1 lamport. Do not submit another create-pool transaction against this address.

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

15% is vested through **Jupiter Lock/Vesting**: **0% immediate**, no cliff, then **12 equal monthly releases over 12 months** (any integer rounding remainder in the final release). Beneficiary weights must be finalized and verified before execution. Verify the Jupiter schedule on devnet and inspect the resulting transactions before mainnet signing.

## DevCity™ 100

WORLDZ uses 50 seats × 100,000 WLDZ. REVIVE expands to **100 seats × 200,000 RVIV**.

- Existing 50 seats: grandfathered.
- New seats: 50 verified-developer recruitment slots.
- Total pool: 20,000,000 RVIV (10%).

The 105 publicly posted wallets in `revive-devcity-public-wallet-candidates.v1.json` are research leads. A public address does not establish accepted DevCity participation, wallet control, or a grandfathered seat. No automatic selection of 100 recipients or transfer from the staging wallet is authorized by that file.

## Legacy Revival

The existing snapshot remains canonical:

- Batch: `4b7faa3f-c6cd-435f-9840-43a04cd090a0`
- Root: `b0a58be30c8323bf22d57939cd989be6b1631f5dd17a682cd829d0cc6a85e548`
- Eligible wallets: **216**
- Ledger total: **20,000,000 RVIV**
- Claims currently open: **no**

The current database ledger is correct. The live snapshot-regeneration function contains a stale 1%-pool calculation path, so resnapshot/regeneration stays locked until that source is repaired and re-verified.

## Worldz FairFee™ / MagicFeeNumber™

The selected devnet candidate is **75 bps gross (0.75%)**, with dynamic fees OFF.

Meteora DBC currently documents a 20% protocol share of trading fees. Under that model:

- Meteora protocol: **0.15% of trade**
- Creator: **0.306%**
- Worldz referrer: **0.102%**
- Legacy Flywheel™: **0.09%**
- WorldzLaunchPad: **0.051%**
- OneWorldz Impact: **0.051%**
- Worldz-controlled total: **0.60%**

The Worldz-controlled 0.60% is split **51 / 17 / 15 / 8.5 / 8.5**.

DBC native fee ownership is configured **51% Creator / 49% Worldz partner**. The 49% partner side is then routed with exact integer weights:

- Referrer: **170**
- Legacy Flywheel: **150**
- WorldzLaunchPad: **85**
- OneWorldz Impact: **85**
- Total: **490**

The Legacy Flywheel therefore receives **0.09% of trade**. With ten equal legacy vaults, each vault receives the equivalent of **0.009% of trading volume** from collected fees under the modeled configuration.

Example at $1,000,000 equivalent trading volume: $7,500 gross fees → $1,500 protocol → $3,060 Creator → $1,020 Referrer → $900 Legacy Flywheel ($90 per legacy vault) → $510 Worldz → $510 Impact.

The exact venue deductions and receipts must be proven on devnet. No mainnet pool may advertise MagicFeeNumber™ unless its live fee path reproduces and discloses the promised economics.

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
