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
**Foundation built.**

The shared read-only adapter interface now exists for Solana, Ethereum, Base, BNB Chain, HyperEVM, XRP Ledger, Sui and a Robinhood research slot. The adapter contract permits only health/network/account/balance/treasury/proposal-history/transaction-status reads. Signing, broadcasting, bridging, swapping, staking, signer changes and key import/export are structurally rejected.

The remaining Stage 2 gate is provider binding and live read proof: configure verified provider/RPC access without committing credentials, then prove real balance, multisig configuration and proposal-history reads chain by chain.

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


## Stage 2 infrastructure additions

- `core/read-adapter-registry.json` — chain/family read capabilities and forbidden methods.
- `src/worldz-app/read-adapter-contract.js` — runtime guard that rejects write/sign/broadcast handlers.
- `core/storage-policy.json` — browser/session/server storage boundaries and secret-data prohibition.
- `core/session.schema.json` — public identity and wallet-connection session shape; no secret fields.
- `core/activity-event.schema.json` — normalized WorldzApp activity stream for future notifications, audit and FullScope integration.

No RPC endpoint or credential is hard-coded in the public registry. Provider configuration remains environment-specific.


## Provider-binding implementation — 2026-09-27

Environment-only JSON-RPC bindings are code-built for Solana, Ethereum, Base, BNB Chain, HyperEVM, XRP Ledger and Sui. Robinhood remains research until its intended network/provider contract is verified.

The public registry stores only environment-variable names, never provider credentials. `src/worldz-app/rpc-client.js` rejects inline URL credentials and non-HTTP(S) transports. `tools/verify-worldzapp-live-reads.js` is the evidence gate: a chain remains **LIVE_PROOF_PENDING** until the deployment environment is configured and the verifier completes a successful network read.

Provider binding does not add any signing/broadcast method. The existing read-adapter contract remains authoritative.


## Reconciled live-read proof — PASSED

On 2026-09-27 the reconciled WorldzApp provider stack passed CI workflow run `36287750004` in public verification mode. The proof confirmed Solana health and a finalized public-address balance read, Base chain ID 8453, BNB Chain ID 56, HyperEVM chain ID 999, XRPL validated-ledger access, Sui GraphQL chain identification, and Robinhood Chain ID 4663.

No transaction was signed, submitted or broadcast. Public verification endpoints remain development/proof infrastructure only; production provider URLs remain deployment-environment configuration.

The Sui proof uses GraphQL after live verification showed the legacy public JSON-RPC path is no longer supported. This is now a permanent adapter rule: verify the exact current transport and network identity, not merely a hostname.
