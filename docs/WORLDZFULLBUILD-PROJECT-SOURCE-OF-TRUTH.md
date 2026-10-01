# WorldzFullBuild™ — Main Integration Source of Truth

**Status:** MAIN INTEGRATION SOURCE OF TRUTH  
**Date:** 1 October 2026

WorldzFullBuild™ is the versioned integration layer for the project-relevant Worldz architecture. It keeps owner-approved decisions, verified repository/on-chain/live evidence, reusable launch rules and lessons from failed paths connected without treating chat statements as deployment proof.

## Core precedence

**Decisions:** latest explicit owner instruction → versioned contract → older plan → research/proposal.

**Factual status:** confirmed on-chain evidence → verified live deployment evidence → verified repository/CI evidence → unverified/planned state.

A newer plan can supersede an older plan. It cannot retroactively create a transaction, deployment, provider verification, lock, vesting schedule or distribution.

## Current architecture

WorldzFullBuild connects WorldzEcosystem™, DonateWorldz, CryptoWorldz, WorldzLaunchPad™, WorldzFullScope™, ZED LED Command Centre MAX™, AUTO, G.R.A.C.E., DIPSHIT™, PurpleDiamondCrew, WorldzLinkz™ and BitWorldz™ while keeping support/humanitarian and crypto functions clearly distinguishable in public execution and messaging.

### Canonical token family

- #001 **WORLDZ (WLDZ)** — canonical Solana mint `AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U`
- #002 **REVIVE (RVIV)** — canonical Solana mint `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`
- #003 **PHENIX (PNEX)** — pre-launch; no mint is published until verified
- #004 **MIRACLE (MRCL)** — planned; no mint is published until verified

WLDZ and RVIV are never reminted or substituted simply to repair metadata, routing, distribution or presentation.

## WorldzLaunchInheritance™

Every launch now has one reusable inheritance contract for:

- first-party Worldz wallet entry and external wallet custody;
- exact chain/environment matching;
- canonical token identity;
- fee disclosure and route-specific economics;
- WorldzFullScope registration;
- simulation and readable review before signature;
- Worldz Proof Receipt after confirmed chain actions;
- locks, vesting and final-state reconciliation;
- WorldDexPush/indexer monitoring without fake provider approvals;
- independent mainnet release gates per chain and venue.

Mainnet market execution remains fail-closed unless the selected chain + venue path has its own proof and explicit release approval.

## Economics truth

**Worldz Fee Flow™ V2 is the default economics for new WorldzLaunchPad intakes.**

The creator selects **3% / 5% / 8%** back to WorldzLaunchPad. The fixed lanes are **10% Creator / Developer, 15% Launch Referrer, 15% final 12-token Legacy Core, 12% WLDZ-RVIV-PNEX-MRCL market-buy ledger, 10% LP Growth, 8% launched-token Buyback + Burn, 5% Impact / Charity, 5% Team / Builders and 5% Future Token Deployment**. Treasury / Reserve balances at **12% / 10% / 7%** for BUILD / GROW / BOOST.

The Legacy Core membership is permanently closed at **12 tokens**, with **1.25% each** from the single 15% Legacy allocation. No second Legacy deduction is allowed.

The older MagicFeeNumber™ 75-bps and 51/17/15/8.5/8.5 configuration remains an adapter/historical profile only where existing venue proof depends on it. It is not the default economics for new launch intakes.

External venue deductions are separate and must be disclosed. Mainnet Fee Flow V2 execution remains fail-closed until the selected chain/venue can enforce and reconcile the V2 destinations.

## FullScope truth

The initial FullScope architecture contains **8 chain slots × 20 token slots = 160 environments**.

Worldz Votes Centre™ remains **popularity only**. WorldzGovern™ remains **DAO governance only**. Popularity may not authorize governance.

## Regression rules

The main build permanently carries forward launch lessons: no liquidity before identity readiness, no HTTP/CI-only success claims, no wallet-browser prerequisite, no silent mint/wallet substitutions, no invented recipients, no fake provider approvals, no mixed lifecycle statuses, no wrapped-BTC-as-native claims, and no cross-chain release by implication.

## Branch rule

`main` is the current integration branch. `revive-v1-build` remains a historical development branch. Useful work is reconciled feature-by-feature with current source-of-truth files and tests; histories are not force-merged merely to remove divergence.

## Public privacy boundary

This repository is public. WorldzFullBuild stores project-relevant public/approved operational rules only. Personal, medical, legal, credential, seed-phrase, private-key and unrelated chat material is not copied into the public contract.

## Provider identity and market-discovery controls

WorldDexPush™ keeps Worldz-owned identity separate from third-party provider state.

- Jupiter VRFD: canonical WLDZ/RVIV handoff + recurring upstream audit. Provider name/symbol remain PENDING until Jupiter exposes the expected values.
- DEX Screener: canonical LIVE-token handoff + pair/price/boost/order-status audit. Enhanced Token Info and Boosts require official provider checkout and explicit human approval.
- Golden Ticker: Worldz records the provider threshold as 500+ active Boosts; 75 points is not treated as sufficient.
- WorldzSpecial: proposal only until DEX Screener explicitly agrees in writing. No partnership or endorsement is inferred.

## Historical engineering references

WorldzFullBuild™ preserves selected historical build records where they materially explain why current safeguards exist.

- **WLDZ Origin Reference — How WORLDZ #001 Started:** `docs/WLDZ-ORIGIN-REFERENCE-HOW-WORLDZ-STARTED.md`
  - Classification: **HISTORICAL REFERENCE / ORIGIN RECORD**
  - Covers the early 100M test architecture, 25/25/25/25 model, Meteora DAMM v2 `OnlyB` / quote-side fee experiment, AUTO/HODL/LP/burn/Charity execution proofs, and fail-closed pre-mainnet preparation.
  - It is **not** current token identity or economics authority. The current canonical WLDZ mint and active WorldzFullBuild contracts override it wherever later work differs.

