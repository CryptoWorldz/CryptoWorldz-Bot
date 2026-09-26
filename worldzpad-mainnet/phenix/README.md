# PHENIX $PNEX — Launch Preparation

**Status:** PREP ONLY — MAINNET EXECUTION DISABLED

This package prepares WorldzLaunchPad launch #003 without minting, transferring, locking, vesting or broadcasting PNEX.

## Current working model

- Fixed supply: **250,000,000 PNEX**
- PHENIX Chance immediate: **10% / 25,000,000**
- PHENIX Chance 12-month vesting: **15% / 37,500,000**
- Liquidity: **45% / 112,500,000**
  - genesis liquidity: **5% / 12,500,000**
  - later liquidity capacity: **40% / 100,000,000**
- Developer vesting: **10% / 25,000,000**
- Purple Diamond Handz: **1% / 2,500,000**
- Unassigned pending final decision: **19% / 47,500,000**

The allocation totals 100%, but the 19% reserve is intentionally unspendable and blocks launch readiness until a final disclosed purpose is approved.

## PHENIX Chance

The planning ceiling is 500 approved recipients. At the 500-seat model:

- 50,000 PNEX immediate per approved wallet
- 75,000 PNEX vested per approved wallet
- 6,250 PNEX per month for 12 months
- 125,000 PNEX total per approved wallet

500 is a maximum planning scale, not a guaranteed recipient count. Wallets are not approved merely because an address was posted publicly or a person asked for help. The register requires evidence, wallet ownership, recipient claim, consent to vesting, duplicate review and human approval.

## Liquidity rule

Genesis target is 5%. Current total liquidity allocation is 45% after 15% was moved from the earlier 60% liquidity concept into PHENIX Chance vesting.

For later liquidity additions, the working rule requires the SOL value contributed to be at least 105% of the PNEX value added, with the price observation recorded in the proof.

Creator-controlled LP locking target is permanent.

## Worldz fee settings carried into prep

- ordinary wallet transfer tax: 0%
- MagicFeeNumber target: 75 bps
- dynamic fee: OFF
- controlled fee split: 51% creator / 17% referrer / 15% Legacy Flywheel / 8.5% WorldzLaunchPad / 8.5% OneWorldz Impact

Fee routing is separate from PNEX supply allocations.

## Wallet connection

The Worldz website remains the launch origin. The design must not require users to open the site inside a Solana wallet browser. Transaction approval remains inside the user's wallet.

## Hard blockers before mainnet

1. Allocate the remaining 47,500,000 PNEX and keep the total at exactly 250,000,000.
2. Finalize and enforce developer vesting.
3. Complete and validate approved PHENIX Chance recipients.
4. Prove all 12 monthly releases.
5. Finalize Purple Diamond Handz entitlement/claim rules.
6. Simulate the 5% genesis pool and staged liquidity rule.
7. Prove permanent LP lock mechanics.
8. Prove 75-bps fee routing and the 51/17/15/8.5/8.5 split.
9. Finalize token metadata, mint/freeze authority state and public Worldz Proof.
10. Pass multisig, security, accounting, legal/regulatory and explicit JayJayTeamDev signing gates.

No mainnet action is authorized by this package.
