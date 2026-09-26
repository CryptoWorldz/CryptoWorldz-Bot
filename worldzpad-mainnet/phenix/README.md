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
- PHENIX Total Supply FlyWheel™: **19% / 47,500,000**

The full 250,000,000 PNEX supply is now assigned. The 19% is one master reserve, not extra supply and not a collection of unrelated leftovers. Its release policy remains fail-closed until the lane controls, vault, approvals and proof path are finalized.

## PHENIX Total Supply FlyWheel™

The 47,500,000 PNEX master reserve exists to support the system PHENIX depends on and to create a transparent supply-discipline loop. It can be used only through disclosed lanes:

- Worldz infrastructure: WorldzLaunchPad, security, hosting, development, automation, maintenance and audits
- OneWorldz Impact / charity-fund building with public proof
- Treasury resilience
- verified community rewards
- additional builder/team support only when locked and vested
- ecosystem integrations, grants, partnerships and tooling
- additional liquidity under the PHENIX staged-liquidity rule
- permanent, publicly verifiable PNEX burns

Unused PNEX stays inside the master reserve. Burned PNEX can never return. Internal lane percentages are **not yet fixed**; this prevents us from inventing a split you have not approved.

The same infrastructure work may be used to harden the WorldzLaunchPad systems needed for launch #004 **MIRACLE**, including wallet connection, locks/vesting, fee routing, accounting, security and Worldz Proof. This is infrastructure support, not a promise that PNEX or MIRACLE prices will rise.

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

1. Finalize the PHENIX Total Supply FlyWheel™ internal release policy, vault, approval controls and Worldz Proof path.
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
