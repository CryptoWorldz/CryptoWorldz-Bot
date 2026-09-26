# WorldzFullBuild™ — Main Integration Source of Truth

**Status:** MAIN INTEGRATION SOURCE OF TRUTH  
**Date:** 27 September 2026

WorldzFullBuild™ is the versioned integration layer for the project-relevant Worldz architecture. It keeps owner-approved decisions, verified repository/on-chain/live evidence, reusable launch rules and lessons from failed paths connected without treating chat statements as deployment proof.

## Core precedence

**Decisions:** latest explicit owner instruction → versioned contract → older plan → research/proposal.

**Factual status:** confirmed on-chain evidence → verified live deployment evidence → verified repository/CI evidence → unverified/planned state.

A newer plan can supersede an older plan. It cannot retroactively create a transaction, deployment, provider verification, lock, vesting schedule or distribution.

## Current architecture

WorldzFullBuild connects OneWorldz, DonateWorldz, CryptoWorldz, WorldzLaunchPad™, WorldzFullScope™, ZED LED Command Centre MAX™, AUTO, G.R.A.C.E., PurpleDiamondCrew, WorldzLinkz™ and BitWorldz™ while keeping humanitarian and crypto functions clearly distinguishable in public execution and messaging.

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

The Worldz Omnichain MagicFee policy targets **75 bps / 0.75%** where the selected venue can prove it. The Worldz-controlled split is:

**51% Creator / 17% Referrer / 15% Legacy Flywheel / 8.5% WorldzLaunchPad / 8.5% OneWorldz Impact.**

External venue deductions are separate and must be disclosed. Existing public creator configurable-fee routing is a separate profile and must not be silently mixed into MagicFee accounting.

## FullScope truth

The initial FullScope architecture contains **8 chain slots × 20 token slots = 160 environments**.

Worldz Votes Centre™ remains **popularity only**. WorldzGovern™ remains **DAO governance only**. Popularity may not authorize governance.

## Regression rules

The main build permanently carries forward launch lessons: no liquidity before identity readiness, no HTTP/CI-only success claims, no wallet-browser prerequisite, no silent mint/wallet substitutions, no invented recipients, no fake provider approvals, no mixed lifecycle statuses, no wrapped-BTC-as-native claims, and no cross-chain release by implication.

## Branch rule

`main` is the current integration branch. `revive-v1-build` remains a historical development branch. Useful work is reconciled feature-by-feature with current source-of-truth files and tests; histories are not force-merged merely to remove divergence.

## Public privacy boundary

This repository is public. WorldzFullBuild stores project-relevant public/approved operational rules only. Personal, medical, legal, credential, seed-phrase, private-key and unrelated chat material is not copied into the public contract.
