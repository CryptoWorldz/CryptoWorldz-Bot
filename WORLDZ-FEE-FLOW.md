# Worldz Fee Flow™ V2 — New Launch Intake Standard

Version: `WORLDZ-FEE-FLOW-V2-2026-10-01-A`  
Status: **LOCKED FOR NEW WORLDZLAUNCHPAD INTAKES — MAINNET EXECUTION GATED**

Machine policy: `worldzpad-mainnet/fairfee/worldz-fee-flow.v2.json`

## Creator choice

At launch, the creator voluntarily selects the WorldzLaunchPad contribution:

- **BUILD — 3%**
- **GROW — 5%** *(default)*
- **BOOST — 8%**

The choice is snapshotted in the launch manifest. A later change requires a new disclosed signed route/migration.

## Fixed fee-revenue flywheel

The following percentages are allocations of **eligible collected supported trading-fee revenue** after disclosed external protocol/network deductions. They are not token-supply allocations and are not wallet-transfer taxes.

- **10%** Creator / Developer
- **15%** Launch Referrer
- **15%** Legacy Core — permanently closed 12-token set, **1.25% each**
- **12%** Worldz Core Family market-buy ledger — **3% each to WLDZ / RVIV / PNEX / MRCL**
- **10%** LP Growth
- **8%** Launched-token Buyback + Burn
- **5%** Impact / Charity
- **5%** Team / Builder Rewards
- **5%** Future Token Deployment Reserve

Fixed subtotal: **85%**.

The selected WorldzLaunchPad contribution and Treasury/Reserve finish the 100%:

| Profile | WorldzLaunchPad | Treasury / Reserve | Total |
|---|---:|---:|---:|
| BUILD | 3% | 12% | 100% |
| GROW | 5% | 10% | 100% |
| BOOST | 8% | 7% | 100% |

## Legacy Core lock

Legacy Core is **final at exactly 12 tokens**. No additions, removals, replacements or future Legacy designations are allowed.

The same single 15% Legacy allocation is used here. It must **never be deducted twice**.

Automated Worldz routing does not fund historical distribution wallets. Owner-initiated manual transfers to those wallets remain outside Worldz automation.

## WLDZ / RVIV / PNEX / MRCL flywheel

The 12% family bucket is equal:

- **3% WLDZ**
- **3% RVIV**
- **3% PNEX**
- **3% MRCL**

WLDZ and RVIV may execute only through verified routes. PNEX/MRCL allocations accrue until their canonical mint and live executable market route are verified. No mint may be guessed.

## Safety

- 0% WorldzLaunchPad token-supply take
- 0% WorldzLaunchPad initial-liquidity take
- 0% Worldz wallet-transfer tax
- no wash trading or self-trading
- market buys require real market data and price-impact checks
- burn requires verifiable on-chain execution
- LP additions require matching quote liquidity and treasury approval
- production routing requires the approved Treasury Multisig
- every confirmed production action requires WorldzProof evidence
- if a gate fails, the allocation accrues instead of forcing execution

## Adapter migration

Older `MagicFeeNumber™` / 51-17-15-8.5-8.5 and 90/10 adapter configurations remain historical/test-adapter references where required by existing code. They are **not the default economics for new WorldzLaunchPad intakes**.

New launch manifests inherit Worldz Fee Flow V2. A chain/venue adapter is not called V2-mainnet-ready until it can enforce and reconcile the V2 destinations on-chain.
