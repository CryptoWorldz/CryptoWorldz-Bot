# WorldzApp™ — Core Architecture v1

Status: **ANDROID 16 / API 36 PACKAGING FOUNDATION BUILT / SIGNED AAB RELEASE GATED / NO APP-LEVEL MAINNET EXECUTION**  
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
**Connection foundation built.**

WorldzApp now has a public-session contract and a connection-only external-wallet contract. The browser foundation can detect/request a Solana injected wallet connection and an EIP-1193 EVM wallet connection from the first-party WorldzApp surface, then read only the resulting public address/network into session-only storage by default.

XRPL, Sui and production mobile handoff remain separately gated. WalletConnect v2 / chain wallet-standard deep links are not declared complete until provider-specific mobile verification passes. Stage 3 does not request messages or transaction signatures, send transactions, broadcast, bridge, swap, import keys or collect recovery material.

### Stage 4 — Proposal + simulation
**Stage 4A unsigned adapters built; live proof pending.** `src/worldz-app/simulation-contract.js` normalizes simulation evidence, requires human-readable effects for successful simulations, and creates an acknowledgement gate. `src/worldz-app/simulation-adapters.js` now binds Solana `simulateTransaction` and EVM `eth_call` + `eth_estimateGas` as non-broadcast dry-run methods. Exact chain identity is checked before accepting an EVM result. Simulation still cannot request signatures or broadcast.

### Stage 5 — Native multisig approvals
**Approval-evidence foundation built; live profile binding pending.**

WorldzApp now normalizes the chain-native approval models instead of pretending they share one multisig format:

- Squads v4 → count-based member approvals against the configured threshold.
- Safe Smart Account → owner confirmations against the Safe threshold.
- XRPL SignerList → signer weights summed against `SignerQuorum`.
- Sui weighted multisig → public-key weights summed against the configured threshold.

The Stage 5 foundation can determine whether public approval evidence meets threshold, but deliberately returns `executionAllowed:false` and `broadcastAllowed:false`. It does not create signatures, submit confirmations or execute a multisig transaction.

### Stage 6 — WorldzCard™
Hardware/card connection layer. Tangem remains the first research target; no partnership claim.

### Stage 7 — Android/iOS packaging
**Android foundation built; signed release gated.**

The Android path packages the proven WorldzApp PWA as a **Trusted Web Activity (TWA)** rather than rebuilding a second app. The foundation pins Bubblewrap `1.25.0`, targets/compiles against API 36, requires Android App Bundle output, and keeps signing material outside the repository.

Current candidate Android application ID is `xyz.cryptoworldz.worldzapp`. It remains provisional until the Play application identity is deliberately locked. The signed release is blocked until the owner-approved Worldz centre-logo raster/maskable assets and Play signing certificate fingerprint exist.

iOS remains a separate later packaging track.

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


## Stage 3 identity + external-wallet foundation — 2026-09-27

New components:

- `core/wallet-connectors.json` — connection-only registry and forbidden-operation list.
- `src/worldz-app/session-contract.js` — validates public session data and rejects secret-shaped fields.
- `src/worldz-app/wallet-connection-contract.js` — permits detect/connect/public-address/network/disconnect only.
- `wallet-connect.js` — first-party browser connection layer for injected Solana and EIP-1193 EVM wallets.
- `test/worldz-app-stage3.test.js` — regression tests for secret-data and signing-method rejection.

The WorldzApp UI now exposes a Wallets panel. Public wallet addresses are session-only by default; persistence beyond the session requires explicit consent under the existing storage policy. Mainnet broadcast remains OFF.

Next gate: role-aware identity assertions plus verified mobile wallet handoff. This must preserve the permanent rule that the wallet comes to the Worldz website/app; users are not required to paste Worldz URLs into a wallet browser.


## Stage 3B — role-aware identity + guarded mobile handoff — 2026-09-27

Built:

- `src/worldz-app/identity-assertion-contract.js` — role assertions with a hard rule that self-assertion can create only `PUBLIC_USER`; privileged roles require a separately configured trusted issuer and verification.
- `core/identity-roles.json` — public role registry. A role never grants transaction authority by itself and never bypasses chain-native multisig thresholds.
- `src/worldz-app/mobile-handoff-contract.js` — fail-closed first-party return-origin and provider-origin validation.
- `mobile-handoff.js` — browser handoff coordinator with memory-only WalletConnect pairing material and OAuth callback credential handling that is excluded from the public Worldz session.
- `wallet-connect.js` — guarded external connection-adapter registration for XRPL/Sui/provider integrations. Any adapter exposing signing, sending, broadcasting, bridging, swapping, staking, signer changes or secret collection is rejected.
- `core/mobile-handoff.json` — provider gates for WalletConnect v2, Xaman OAuth and Mysten Sui dApp Kit.

Provider truth remains fail-closed:

- Xaman/XRPL requires an approved public client ID and registered first-party redirect before the browser flow can be enabled.
- Sui requires the current `@mysten/dapp-kit-core` connection layer to be integrated and verified.
- WalletConnect v2 still requires a pairing client. Pairing URIs are ephemeral and must never be logged, persisted into the Worldz public session or emitted into WorldzProof.
- No provider configuration is treated as live merely because its adapter interface exists.

## Stage 4 — simulation + human effects review foundation — 2026-09-27

Built:

- `src/worldz-app/simulation-contract.js`
- `core/simulation-policy.json`
- Stage 3B/4 regression tests in `test/worldz-app-stage3b.test.js`
- WorldzApp UI status for identity, mobile handoff and simulation gates

A successful simulation remains evidence only. It does not enable signature requests, multisig approvals or broadcast. The next gate is verified chain-specific simulator binding, followed by separately reviewed native multisig approval adapters.


## Stage 4A — unsigned simulation adapter bindings — 2026-09-27

Built:

- `src/worldz-app/simulation-adapter-contract.js` — exposes only `simulateUnsigned`; signing, sending, broadcasting, bridging, swapping, staking, signer changes and secret requests are forbidden methods.
- `src/worldz-app/simulation-adapters.js` — Solana `simulateTransaction` with `sigVerify:false`, `replaceRecentBlockhash:true`, and EVM `eth_call` + `eth_estimateGas`.
- `core/simulation-bindings.json` — chain-by-chain Stage 4A registry.
- `test/worldz-app-stage4.test.js` — verifies non-broadcast behavior, Solana simulation settings and EVM chain-ID fail-closed behavior.

Current Stage 4A truth:

- Solana and EVM adapter code is built.
- Live network proof of the new simulation adapters is still pending.
- XRPL native transaction simulation design remains pending.
- Sui chain-native dry-run binding remains pending.
- A successful simulation is evidence only. It does not authorize a signature, multisig approval or broadcast.

Next gate: run verified live simulations using non-value test/fixture payloads on the exact configured networks, record evidence without secrets, then advance to chain-native XRPL/Sui dry-run bindings.


## Stage 4B — live unsigned simulation proof — PASSED

GitHub Actions workflow run `36317541759` completed successfully on 2026-09-27.

Passed live proof:
- Solana devnet — `simulateTransaction`, unsigned/documented fixture.
- Base mainnet — `eth_call` + `eth_estimateGas`, chain ID 8453.
- BNB Chain mainnet — chain ID 56.
- HyperEVM mainnet — chain ID 999.
- Robinhood Chain mainnet — chain ID 4663.

Evidence SHA-256: `bc74711f21b1e3a53f7b444df2b70bc8e3e8cb425397788c02254dc77b5caca1`.

All passed evidence explicitly records `signatureRequested:false`, `broadcast:false` and `stateMutation:false`.

Ethereum was deliberately reported as `SKIP_NO_APPROVED_VERIFY_ENDPOINT`; no pass is claimed for Ethereum until an approved environment or verification endpoint is configured.

**Next gate: Stage 5 native multisig approval adapters.**


## Stage 5 — multisig approval evidence adapters — 2026-09-27

Built:

- `src/worldz-app/multisig-approval-contract.js` — creates simulation-bound approval-review envelopes and normalized threshold state.
- `src/worldz-app/multisig-approval-adapters.js` — Squads v4, Safe, XRPL SignerList and Sui weighted-multisig normalizers.
- `core/multisig-approval-adapters.json` — public adapter registry.
- `test/worldz-app-stage5.test.js` — count thresholds, weighted quorums, duplicate approval handling and fail-closed impossible-threshold tests.
- WorldzApp UI now reports each Stage 5 adapter separately.

Security boundary:

- The exact proposal/simulation/payload hashes remain bound into the approval-review envelope.
- Threshold met is **not** execution permission.
- WorldzApp stores public approval evidence only.
- WorldzApp does not collect private keys, recovery material or wallet signing secrets.
- Approval submission/signing/broadcast remain disabled until each native provider path is separately integrated and verified.

Next gate: bind actual verified treasury/multisig public profiles, prove read-only approval state from the native systems, and only then design the external-wallet approval-submission path.


## Stage 5B — live Worldz Squads approval proof — PASSED

Workflow run `36318035477` verified the actual WLDZ operational Squads v4 profile on Solana mainnet.

- Multisig: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Live threshold: **1-of-2 temporary**
- Current transaction index: `20`
- Historical proposal #14: **Executed**
- Proposal PDA: `3AxY7YshaCNSyu37hpGRYqwqW2AZs4E6kEZk6SE12kiB`
- Public approvals observed: **1**
- WorldzApp normalized threshold state: **met**
- `executionAllowed:false`
- `broadcastAllowed:false`
- `approvalSubmission:false`
- `signing:false`
- private material read: **false**

Evidence SHA-256: `ee26cd097ca32f7b9caf9c49e8802a41032e1da97f6bff60b7eaf002ccfcdcd0`.

This proves the WorldzApp Stage 5 read/normalization path against a real Worldz multisig without giving WorldzApp custody or execution authority. Safe, XRPL and Sui live Worldz profiles remain separately gated.

The Android packaging foundation may now begin while those non-Solana capabilities remain disabled until separately proven.


## Android API 36 packaging foundation — 2026-09-27

Built:

- `apps/worldzapp-android/android-package.v1.json`
- `apps/worldzapp-android/twa-manifest.template.json`
- `apps/worldzapp-android/assetlinks.template.json`
- `tools/verify-worldzapp-android-package.js`
- `.github/workflows/verify-worldzapp-android-api36.yml`

The packaging foundation reuses `https://launchpad.cryptoworldz.xyz/worldz-app/` as the app core. It does not duplicate the WorldzApp business/security logic.

Release blockers are intentionally explicit:

1. lock the final Android application ID before creating the Play application;
2. use only the owner-approved Worldz centre-logo assets for launcher/maskable artwork;
3. configure Play App Signing outside source control;
4. publish the real signing-certificate fingerprint in Digital Asset Links;
5. generate and test the unsigned/signed API-36 TWA project;
6. complete device QA, Play testing and policy/data-safety declarations.

Android packaging does not unlock Safe, XRPL or Sui features that still lack their own live profile proof, and it does not enable mainnet broadcast.
