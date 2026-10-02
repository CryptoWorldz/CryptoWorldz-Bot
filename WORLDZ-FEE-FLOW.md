# Worldz Fee Flow™ V3 — Canonical New Launch Economics

Version: `WORLDZ-FEE-FLOW-V3-2026-10-02-A`  
Status: **LOCKED FOR NEW WORLDZLAUNCHPAD INTAKES — MAINNET EXECUTION GATED**

Machine policy: `worldzpad-mainnet/fairfee/worldz-fee-flow.v3.json`

## Creator-first outer split

After disclosed external protocol, venue and network deductions, the creator chooses how much eligible creator fee revenue is contributed to Worldz:

| Profile | Creator retains | Worldz contribution |
|---|---:|---:|
| BUILD | **97%** | **3%** |
| GROW | **95%** | **5%** |
| BOOST | **92%** | **8%** |

GROW 5% is the default. The choice is voluntary and snapshotted at launch. A later change requires a new disclosed signed route or migration.

The 3% / 5% / 8% is **not** a 3% / 5% / 8% trading fee. The project trading fee is configured separately under the Worldz Fair Fee Builder™.

## Worldz internal split

Only the Worldz contribution is split internally. The creator-retained 97% / 95% / 92% is not touched by these percentages.

- **20%** Operations / Product Development
- **20%** Treasury
- **15%** LP Growth
- **10%** Legacy Core
- **10%** WLDZ / RVIV / PNEX / MRCL market-buy lane
- **10%** Impact / Charity
- **5%** Team / Builder Rewards
- **5%** Future Launch / Infrastructure
- **5%** Launch Referrer

Internal subtotal: **100% of the Worldz contribution**.

## Treasury lane — 70 / 30

The 20% Treasury lane is split:

- **70% of Treasury lane → Worldz Operations Treasury — 3-of-5**
- **30% of Treasury lane → Worldz Miracle Team Treasury — 4-of-7**

Because Treasury itself is 20% of the Worldz contribution, this equals:

- **14% of the Worldz contribution → Operations Treasury**
- **6% of the Worldz contribution → Miracle Team Treasury**

The Miracle Team Treasury does **not** receive 30% of creator revenue, trader volume, or the total Worldz contribution. It receives 30% of the Treasury lane only.

## MIRACLE separation

The **20% MRCL Miracle Team Vault** is a token-supply allocation for MIRACLE.

The **30% Miracle Team Treasury revenue share** is ongoing revenue routing inside the Worldz Treasury lane.

These are separate accounting buckets and must never be combined.

## Legacy and Worldz-family lanes

Legacy Core remains the permanently closed 12-token set. Its new V3 allocation is **10% of the Worldz contribution**, shared within that lane.

The Worldz Core Family market-buy lane is **10% of the Worldz contribution**, shared equally across:

- WLDZ
- RVIV
- PNEX
- MRCL

That is **2.5% of the Worldz contribution per token** when executable. PNEX/MRCL allocations accrue until verified canonical mints and routes exist.

## Safety

- 0% Worldz token-supply take
- 0% Worldz initial-liquidity take
- 0% Worldz wallet-transfer tax
- no wash trading or self-trading
- no automatic mainnet routing until treasury and route proof pass
- no market buy without real market data and price-impact checks
- no burn without verifiable on-chain proof
- failed or unavailable routes accrue rather than forcing execution
- WorldzProof required for confirmed production actions

## Historical policies

`WORLDZ-FEE-FLOW-V2`, MagicFeeNumber™ 51/17/15/8.5/8.5 and legacy 90/10 adapter profiles remain historical/test references where needed for auditability.

They are **not** the economics for new WorldzLaunchPad intakes.

New launch manifests inherit **Worldz Fee Flow V3**.
