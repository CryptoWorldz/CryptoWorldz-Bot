# WorldzMiracleWallet™ — App Architecture

Status: **CODE BUILT — FOUNDATION / NO MAINNET EXECUTION**
Date: **2026-09-27**
Parent standard: `docs/WORLDZ-MIRACLE-WALLET-TREASURY-STANDARD.md`

## Product goal

WorldzMiracleWallet™ becomes the first-party Worldz treasury application: one user experience for multi-chain treasury visibility, proposals, signer coordination, approvals, WorldzProof and future WorldzCard hardware/card connections.

It is **not** a universal private key. Each blockchain retains its native account and multisig model.

## Current app foundation

Path: `launchpad.cryptoworldz.xyz/miracle-wallet/`

The first foundation includes:

- installable-web-app manifest and offline app shell;
- Miracle Church treasury profile: 20% MRCL, 4-of-10 policy;
- Worldz Operations 5-of-10 and Reserve 6-of-9 profiles;
- chain adapter registry for Solana, Ethereum, Base, BNB, HyperEVM, XRPL, Sui and Robinhood Chain research;
- public signer display only where owner/signer consent exists;
- proposal lab that emits a human-readable JSON draft but cannot sign or broadcast;
- external Solana injected-wallet connection when a compatible provider is already present;
- WorldzCard™ research surface with Tangem as the first hardware/card target;
- WorldzProof checklist;
- explicit no-seed/no-private-key boundary;
- service worker app shell.

## Application model

### Layer 1 — Worldz App UI

Modules:

1. Dashboard
2. Treasury
3. Chains
4. Proposal Lab
5. Signers
6. WorldzCard™
7. WorldzProof™
8. Future: LaunchPad
9. Future: WorldzGovern™
10. Future: activity/notifications

### Layer 2 — Treasury profiles

The app can display and coordinate multiple treasury profiles without mixing their authority.

- Miracle Church: **4-of-10**
- Worldz Operations: **5-of-10**
- Worldz Reserve: **6-of-9**
- future token/project treasuries: token-specific policies

A signer being a member of one treasury never silently makes them a signer of another.

### Layer 3 — Chain adapters

- Solana → Squads v4
- EVM → Safe where verified supported
- XRPL → native SignerList multisigning
- Sui → native weighted multisig
- Robinhood/future chains → verified chain-specific adapter

Each adapter exposes the same Worldz-facing concepts:

- read treasury state;
- read balances;
- create unsigned proposal;
- simulate/preflight where chain supports it;
- present exact human-readable review;
- collect chain-native approvals;
- execute only after threshold and release gates;
- reconcile final state;
- emit WorldzProof.

### Layer 4 — Wallet/signing adapters

Worldz does not custody private keys.

Connection targets:

- injected Solana wallet providers;
- Solana Mobile Wallet Adapter / verified mobile connection path;
- WalletConnect where supported;
- Safe-compatible EVM signer wallets;
- XRPL signer-wallet flows;
- Sui signer-wallet flows;
- Tangem via its supported connection model where technically available.

### Layer 5 — WorldzProof

Every executable treasury action eventually produces a proof object containing:

- treasury profile and chain;
- canonical vault/account identity;
- proposal hash;
- readable action summary;
- simulation/preflight result;
- signer approvals;
- transaction identifier;
- confirmation/finality state;
- post-execution balance/state reconciliation;
- timestamp and app version.

## Native app roadmap

### Stage A — PWA foundation
**Current.**

Use the first-party web app to stabilize information architecture, treasury profiles and safe proposal review.

### Stage B — live read adapters

Add read-only balances, treasury configuration and proposal history for each chain. No execution.

### Stage C — signer connection

Add audited mobile signer connections and WalletConnect/provider integrations. Worldz continues to store no seed phrase or private key.

### Stage D — proposal + simulation engine

Generate real unsigned transactions from canonical treasury profiles. Run chain-native simulation/preflight and render exact effects before approval.

### Stage E — multisig approvals

Integrate Squads/Safe/XRPL/Sui approval flows and WorldzProof. Mainnet stays fail-closed chain by chain.

### Stage F — WorldzCard™

Connect compatible hardware/card wallets. Tangem is the first research target. Any co-branded physical card requires an actual provider/commercial/compliance agreement.

### Stage G — native mobile packaging

Package the stable first-party app for Android and iOS. Initial target: a Capacitor-style native shell over the tested app foundation, with native wallet/deep-link capabilities added only where required. A dedicated React Native client remains an option if platform wallet APIs demand it.

### Stage H — app stores

Release only after:

- security review;
- privacy policy;
- recovery/help documentation;
- accessibility/mobile QA;
- chain-by-chain mainnet release proof;
- app-store compliance;
- incident and signer-recovery procedures.

## Non-negotiable security rules

- never request a seed phrase;
- never request or upload a private key;
- never silently execute a bridge, swap, transfer, LP action or investment;
- every value-moving action must identify the exact chain and treasury;
- every mainnet action requires its treasury threshold;
- every mainnet action requires readable review and WorldzProof;
- no cross-chain adapter inherits another chain's release status;
- hardware-wallet private keys remain inside the provider/device;
- wallet-to-person mappings are private unless that signer consents to public association.

## Truth state

The app foundation is **CODE_BUILT** when merged. It is not called deployed/live until the production URL and actual mobile flow are verified. No treasury has been created on-chain by this app foundation and no token transfer is authorized by it.
