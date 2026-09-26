# WorldzFullBuild™ — Project Source of Truth

Status: **INCORPORATED PROJECT STANDARD**  
Date: **2026-09-27**

## Purpose

WorldzFullBuild™ is the master integration layer for the Worldz project. Project decisions from JayJayTeamDev chats, versioned repository contracts, merged code, live deployment evidence and confirmed on-chain evidence are reconciled here instead of living as disconnected chat instructions.

This is **not** a verbatim chat archive. The repository is public, so personal, medical, legal, private-financial, credential, seed-phrase, private-key and unrelated conversation material is excluded. Only project-relevant decisions and approved/public operational data belong in the build.

## Precedence when project sources conflict

1. Confirmed on-chain state or live-production evidence.
2. Latest explicit JayJayTeamDev approval or correction.
3. Canonical versioned WorldzFullBuild/token-identity contract.
4. Merged repository implementation.
5. Older project-chat plan.
6. Research or proposal.

A newer correction supersedes an older plan, but the old plan should be marked **SUPERSEDED**, not silently rewritten as if it never existed.

## Required truth states

Every major feature or launch item must be identifiable as one of:

- LIVE_VERIFIED
- DEPLOYED_UNVERIFIED
- CODE_BUILT
- READY_WITH_GATES
- PLANNED
- RESEARCH
- SUPERSEDED
- REJECTED

"Built", "deployed", "connected", "signed", "confirmed", "pool live", "LP locked", "vesting active" and "distribution complete" are different facts.

## Worldz-wide product scope

WorldzFullBuild incorporates the architecture and reusable rules for:

- **OneWorldz** — humanitarian mission and leadership layer.
- **DonateWorldz** — contribution and campaign layer.
- **CryptoWorldz** — technology/funding engine, kept clearly distinguishable from humanitarian activity.
- **WorldzLaunchPad™** — multi-chain token creation/launch framework.
- **WorldzFullScope™** — chain/token registry, event store, action intents, locks, vesting, proof and Command Centre integration.
- **ZED LED Command Centre MAX™** — operations and command surface.
- **AUTO** — protected finance/accounting controller with approval gates.
- **G.R.A.C.E.** — approval-controlled communications/campaign layer.
- **PurpleDiamondCrew** — legacy holder verification, revival and Hodlerz Special.
- **WorldzLinkz™** — QR/domain directory ("Every Worldz. One Link.").
- **Worldz Memory & Storage Centre™** — local/server/on-chain/external-memory boundary.
- **BitWorldz™ / OmniBTC™ / BitPair™ / BTCMesh™ / BTC Passport™ / BitProof™**.
- **Spam2Ham** and Worldz public campaign/content surfaces.
- Chain-specific Worldz domains and subdomains inherit the same release truth standard.

## Canonical official token family

| # | Token | Symbol | Supply | State |
|---|---|---|---:|---|
| 001 | WORLDZ | WLDZ | 100,000,000 | canonical Solana mint exists |
| 002 | REVIVE | RVIV | 200,000,000 | canonical Solana mint exists |
| 003 | PHENIX | PNEX | 250,000,000 | pre-launch |
| 004 | MIRACLE | MRCL | 348,000,000 | pre-launch |

Canonical Solana identities:

- WLDZ: `AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U`
- RVIV: `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`

**Never remint or substitute WLDZ/RVIV simply to repair metadata, routing, distribution or launch presentation.**

## WorldzLaunchPad inheritance standard

Every supported WorldzLaunchPad token launch inherits the reusable mechanics unless a later explicit token-specific approval overrides economics:

- launch from a first-party Worldz website;
- no prerequisite to paste the Worldz URL into a wallet browser;
- external wallet retains custody;
- never collect seed phrase/private key;
- display full connected address and chain;
- canonical identity/authority/vault/multisig comparison;
- exact readable transaction review;
- simulation before signing;
- fresh blockhash at signing boundary;
- signature-status confirmation and final state reconciliation;
- production mobile viewport/copy/link regression test;
- WorldzProof receipt;
- distribution, liquidity, fees, locks, vesting, burns and rent-recovery remain independently provable states;
- recipient/wallet evidence is required; no guessed wallets;
- reusable WorldzBulkDrop™, WorldzLock™, WorldzVest™, WorldzProof™, AUTO and G.R.A.C.E. modules.

For eligible future launches, **1% Purple Diamond Handz** remains the default legacy-revival allocation unless a later explicit token-specific approval replaces it.

## WLDZ launch lessons locked into future launches

Do not repeat these classes of failure:

- liquidity before public identity/metadata/indexer readiness;
- declaring success from CI or HTTP status without a real production wallet path;
- malformed action links or literal escape text;
- wallet-browser dead ends;
- address overflow on mobile;
- assuming a Squads page means the on-chain proposal is correct/ready;
- unbudgeted account-rent/setup/distribution/vesting steps;
- status confusion between deployment, wallet, signing, confirmation, pool, LP lock and distribution;
- silently substituting mints, recipient wallets or fee destinations.

## REVIVE reusable pilot rules

Current reusable fee target from the REVIVE pilot is **75 bps / 0.75%**, dynamic fee **OFF**, with proposed routing **51 / 17 / 15 / 8.5 / 8.5** for Creator / Referrer / Legacy Flywheel / WorldzLaunchPad / OneWorldz Impact.

This remains subject to executed-route verification before being advertised as live. Fee routing is always separate from token allocation.

REVIVE's distribution work established the manifest-driven bulk-distribution direction, verifiable recipient evidence, Squads/Jupiter vesting boundaries, preflight/simulation, packet-size checks, exact approval review and final on-chain reconciliation.

## WorldzFullScope and governance separation

Foundation: **8 chains × 20 token slots = 160 initial environments**.

- **Worldz Votes Centre™** = popularity only.
- **WorldzGovern™** = DAO governance only.
- Popularity votes may never authorize governance.
- Commands, storage and authority remain distinct.

Mainnet execution is chain-specific and fail-closed. A proof on one chain never unlocks another chain.

## Flywheels, legacy and PHENIX architecture

- 6-hour **Legacy Flywheel** remains its own mechanism.
- 30-day **Worldz Universal FlyWheel™** is a separate ecosystem cycle.
- **No Token Left Behind** requires exactly one benefit record for every eligible registered token each Universal Cycle; shared infrastructure/proof/security can be a valid zero-direct-spend benefit.
- PHENIX draft architecture keeps **19%** of supply inside the PHENIX Total Supply FlyWheel™.
- **Worldz OmniBuildz™** is a governed use of that 19%, not extra supply.
- **Worldz LinkedAsset™** is an opt-in developer capability for verified linked swaps/pairs/OmniBuildz. No hidden fee, forced swap, automatic market buy or unverified partnership claim.

PHENIX remains fail-closed until its open preparation work is reconciled and approved for mainnet.

## Cross-chain rules

WorldzLaunchPad uses chain-native implementations rather than pretending every chain is Solana:

- Solana: native Solana token/pool/curve/locking paths.
- XRPL / wXRP: native issued-token/CLOB/AMM mechanics plus explicitly disclosed CrossPair/wrapped paths.
- EVM chains: shared EVM adapter with chain-specific network/venue proof.
- Sui: research/build/proof before production enablement.
- BitWorldz keeps native Bitcoin, Bitcoin-layer assets, wrapped BTC and bridged BTC explicitly distinct.

Worldz Flash™, Worldz Curve™, Worldz Curve Pro™, Worldz CrossPair™, Worldz Omnichain™, Safe Launch Standard™, Trust Orbit™ and Worldz Proof™ remain reusable architecture.

## Branch reconciliation — current repository fact

Observed 2026-09-27:

- `revive-v1-build` is **181 commits ahead** and **95 commits behind** `main`.
- Do **not** force a broad merge simply to make numbers match.
- Reconcile canonical features feature-by-feature with tests and source-of-truth checks.

Important main-line work to carry forward includes Worldz Token Identity Engine, WorldzLinkz, and the latest OneDrop/mobile-wallet production preflights. Important revive-line work to preserve includes WorldzFullScope, the existing WorldzFullBuild contract, Memory & Storage Centre, REVIVE controls, BitWorldz, Legacy Flywheel and Omnichain adapters.

## Project-chat incorporation rule

When JayJayTeamDev says **"Incorporate this into Our WorldzFullBuild™"**, the instruction means:

1. classify the decision (canonical / reusable default / token-specific / proposal / correction / rejected);
2. reconcile it against live/on-chain/repository truth;
3. write the durable project-relevant result into a versioned FullBuild contract or referenced standard;
4. add tests/gates when the decision is executable;
5. preserve superseded decisions as superseded rather than silently reviving them;
6. never expose private chat material merely because it appeared in the project;
7. carry reusable lessons into every future eligible WorldzLaunchPad launch.

## Current integration checkpoint

The project-wide source-of-truth layer is now represented in `worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json` and this ledger. It is an integration contract, not permission to execute financial transactions or turn on mainnet execution.
