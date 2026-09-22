# WORLDZ $WLDZ — Master Allocation

Version: `WLDZ-ALLOCATION-2026-09-22-A`  
Status: **LOCKED WORKING MASTER — ON-CHAIN DISTRIBUTION PENDING**  
Canonical mint: `AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U`  
Fixed supply: **100,000,000 WLDZ**  
Decimals: **6**  
Mint authority: **revoked**  
Freeze authority: **revoked**

This file supersedes older WLDZ genesis/allocation percentages wherever they conflict with this master. It does **not** mint any additional WLDZ.

## Exact 100M allocation

| Bucket | Percent | WLDZ |
| --- | ---: | ---: |
| JayJayTeamDev | 8% | 8,000,000 |
| Initial launch LP | 15% | 15,000,000 |
| Staged LP reserve | 20% | 20,000,000 |
| Legacy token holders snapshot pool | 10% | 10,000,000 |
| First 100 WorldzLaunchPad™ public launches | 10% | 10,000,000 |
| OneWorldz / Charity Impact Pool | 10% | 10,000,000 |
| Worldz Treasury | 10% | 10,000,000 |
| General Reserve | 5% | 5,000,000 |
| Community / Ecosystem / Growth | 7% | 7,000,000 |
| Operations / Security / Infrastructure | 5% | 5,000,000 |
| **TOTAL** | **100%** | **100,000,000** |

## Destination/control rules

### JayJayTeamDev — 8%
Destination wallet:
`Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u`

This is a disclosed creator/dev allocation. Any transfer from the current Squads vault must follow the vault's live on-chain approval rules.

### Initial launch LP — 15%
Exactly **15,000,000 WLDZ** remains available from the current Squads vault for the canonical WLDZ/wSOL **Meteora DAMM v2 one-sided launch**.

- Starting quote amount: 0 SOL
- Base fee: 2.00% / 200 bps
- Fee collection: quote side / Token B
- Position liquidity: permanently locked after pool creation

This bucket is not sent to a personal wallet before launch.

### Staged LP reserve — 20%
Exactly **20,000,000 WLDZ** is reserved for later liquidity additions.

It may only be deployed when real matching quote liquidity exists and the applicable price-impact, slippage, treasury, lock and execution checks pass. No extra WLDZ may be minted.

### Legacy token holders — 10%
Exactly **10,000,000 WLDZ** is reserved against the completed 10-asset legacy snapshot.

Snapshot batch:
`4b7faa3f-c6cd-435f-9840-43a04cd090a0`

Snapshot root:
`b0a58be30c8323bf22d57939cd989be6b1631f5dd17a682cd829d0cc6a85e548`

Snapshot facts:
- 10 legacy assets
- 239 positive token-account rows
- 216 unique eligible snapshot-owner wallets
- status: COMPLETE

Working entitlement rule mirrors the existing legacy-revival fairness model:
- 50% of this WLDZ pool divided equally across eligible unique snapshot-owner wallets
- 50% distributed using square-root weighting of normalized historical legacy holdings
- wallet-control proof required before claim
- unclaimed/non-signable entitlements remain reserved

### First 100 WorldzLaunchPad™ public launches — 10%
Exactly **10,000,000 WLDZ** is reserved.

Equal launch allocation:
- **100,000 WLDZ per qualifying launch**
- maximum **100 launches**
- any launch route supported/accepted by WorldzLaunchPad™ may qualify
- allocation is released only after the launch is verified by the platform

### OneWorldz / Charity Impact Pool — 10%
Exactly **10,000,000 WLDZ** is ring-fenced for humanitarian/charity impact.

Custody wallet/vault: **CryptoWorldz Treasury Multisig**
`n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`

This is one of the four active Command Centre wallets and is used only as secure multisig custody for the ring-fenced charity balance. The Dev, Investment and Rewards wallets retain their separate purposes. A dedicated OneWorldz/DonateWorldz charity wallet can replace this custody destination later without changing the 10,000,000 WLDZ charity allocation.

### Worldz Treasury — 10%
Exactly **10,000,000 WLDZ** is reserved for Worldz Treasury operations.

Current Solana operations vault:
`n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`

Current Squads multisig:
`B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`

This bucket may remain in the current vault until the long-term treasury governance rollout is complete.

### General Reserve — 5%
Exactly **5,000,000 WLDZ** remains reserved.

It is not automatically committed to LP. It may later support liquidity, emergency treasury needs, ecosystem support or another approved use. If later assigned to LP, total designated LP capacity can rise from 35% to a maximum of 40%.

### Community / Ecosystem / Growth — 7%
Exactly **7,000,000 WLDZ** is reserved for community growth, ecosystem support, campaigns, verified rewards and strategic development.

### Operations / Security / Infrastructure — 5%
Exactly **5,000,000 WLDZ** is reserved for operational continuity, security, infrastructure, tooling and platform costs.

## Liquidity ceiling

- Initial active LP: **15%**
- Staged LP reserve: **20%**
- Planned LP capacity: **35%**
- Optional General Reserve: **up to +5%**
- Absolute working maximum if the General Reserve is later reassigned: **40%**

## Worldz market architecture

The canonical WLDZ mint remains simple and immutable.

Around that same mint, WORLDZ uses:
- Meteora DAMM v2 one-sided WLDZ/wSOL liquidity
- permanent LP locking
- Worldz Fee Flow™
- Jupiter routing
- Jupiter Tokens V2 / Organic Score / verification
- Jupiter Price V3
- Jupiter Trigger V2
- Worldz Confidence Pulse™
- Worldz Confidence Constellation™
- Worldz Trust Orbit™
- ZED + AUTO + G.R.A.C.E.

No second WORLDZ mint is permitted.

## Execution state

The 100M supply currently remains under the verified current supply/treasury vault until approved distribution transactions are executed.

Allocation is a supply-accounting commitment. On-chain movement is separate and must use the live wallet/multisig authority that actually controls the tokens.
