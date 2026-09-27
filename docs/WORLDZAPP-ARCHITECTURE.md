# WorldzApp™ — Core Architecture v1

Status: **CODE BUILT — FOUNDATION / NO APP-LEVEL MAINNET EXECUTION**  
Date: **2026-09-27**  
Parent: **WorldzFullBuild™**

## Product direction

WorldzApp™ is the first-party umbrella application for the Worldz ecosystem.

WorldzMiracleWallet™ is a secured treasury module inside WorldzApp rather than a separate authority system. WorldzLaunchPad™, ZED LED Command Centre MAX™, WorldzFullBuild™, WorldzFullScope™, Worldz Votes Centre™, WorldzGovern™, WorldzLinkz™, WorldzProof™ and future humanitarian modules can progressively join the same application shell.

The shared shell does **not** merge their permissions.

## Core rule

**One interface is not one key, one wallet, one treasury or one authority.**

WorldzApp uses a deny-by-default capability registry. A module may appear in navigation while still having zero permission to sign, broadcast, bridge, swap, stake or alter signers.

## Foundation built

Canonical contract:

- `worldzpad-omnichain/fullscope/worldz-app.v1.json`

Runtime application:

- `launchpad.cryptoworldz.xyz/worldz-app/`

Core registries:

- `core/worldz-app.v1.json`
- `core/capability-registry.json`
- `core/treasury-profiles.json`
- `core/proposal.schema.json`
- `core/worldzproof.schema.json`

Current shell provides:

- installable PWA foundation;
- module registry generated from runtime configuration;
- treasury-profile registry;
- capability-firewall visibility;
- native-app roadmap;
- offline app shell;
- deep links to existing first-party Worldz surfaces;
- explicit app-level mainnet broadcast OFF.

## Module authority boundaries

### WorldzMiracleWallet™

Treasury coordination module. Current app mode is draft-only / non-custodial. Miracle Church profile is 4-of-10. No mainnet treasury has been created by the app.

### WorldzLaunchPad™

Launch module. Existing chain-specific gates remain authoritative. WorldzApp cannot override a chain adapter's release gate.

### Command Centre MAX™

Community, missions, education, admin and approved operational controls. Telegram-specific secure identity remains separate until WorldzApp identity federation is deliberately designed and reviewed.

### Worldz Votes Centre™

Popularity only. Never authorizes treasury or DAO actions.

### WorldzGovern™

DAO governance only. Never changes popularity rankings.

### WorldzFullScope™

Shared observation/action-intent layer. Preparing an action intent is not the same as signing or broadcasting a transaction.

### WorldzProof™

Evidence/receipt layer. It records verified state; it does not become custody.

## Treasury profiles

WorldzApp v1 recognizes:

- Miracle Church Treasury — 4-of-10
- Worldz Operations Treasury — 5-of-10
- Worldz Reserve Treasury — 6-of-9

Membership never silently inherits between profiles.

## Chain security

WorldzApp preserves chain-native security:

- Solana → Squads / external Solana signer wallets
- EVM → Safe where separately verified and approved
- XRPL → native SignerList multisigning
- Sui → native weighted multisig
- Robinhood/future chains → separate verified adapter

No chain is enabled merely because another chain passes.

## Proposal infrastructure

`proposal.schema.json` defines a WorldzApp proposal object.

Foundation proposals are explicitly `DRAFT_ONLY`.

Future executable flow:

1. identify canonical treasury/profile;
2. validate chain and destination;
3. generate unsigned transaction/action;
4. simulate/preflight;
5. render exact human-readable effects;
6. request external wallet / native multisig approvals;
7. confirm threshold;
8. broadcast only through a released chain adapter;
9. verify final state;
10. emit WorldzProof.

## WorldzProof infrastructure

`worldzproof.schema.json` creates a normalized receipt shape for future modules.

Receipt states:

- DRAFT
- SIMULATED
- APPROVALS_PENDING
- THRESHOLD_MET
- SUBMITTED
- CONFIRMED
- RECONCILED
- FAILED

A WorldzProof receipt never substitutes for actual chain confirmation.

## Native application path

### Stage 1 — Shared PWA core
Current.

### Stage 2 — Read adapters
Read balances, multisig state, proposal history and public chain state. No execution.

### Stage 3 — Identity and signer connections
Build role-aware sessions and verified external wallet connections. Keep secrets out of Worldz infrastructure.

### Stage 4 — Proposal + simulation
Real unsigned payload generation and exact effects review.

### Stage 5 — Native multisig approvals
Squads, Safe, XRPL and Sui adapters; chain by chain.

### Stage 6 — WorldzCard™
Hardware/card connection layer. Tangem remains the first research target; no partnership claim.

### Stage 7 — Android/iOS packaging
Package the proven app core with secure deep links, native notifications and platform wallet handoff.

### Stage 8 — App-store release
Security review, privacy policy, incident recovery, accessibility/mobile QA and platform compliance are release gates.

## Permanent safety rules

- no seed phrase collection;
- no private-key collection;
- no hidden wallet custody;
- no silent automatic investment;
- no silent bridge/swap;
- no app-wide mainnet switch;
- no authority inheritance between modules;
- no authority inheritance between chains;
- exact human-readable review before signatures;
- WorldzProof after value-moving actions;
- public identity association only with consent.
