# WorldzMiracleWallet™ + Miracle Church Treasury — Build Plan v1

Status: **PLANNED / NO MAINNET EXECUTION**
Date: **2026-09-27**
Parent: **WorldzFullBuild™**
Canonical token: **MIRACLE ($MRCL), pre-launch**

## Owner direction incorporated

WorldzFullBuild adds a Miracle Church treasury and universal-wallet workstream.

The intended church treasury allocation is **20% of MIRACLE ($MRCL)**, held by a church-controlled multisig rather than by any one individual signer.

Ten invited signer positions plus **JayJayTeamDev** form the planned Solana treasury signer group. The invited positions include the existing Miracle Church/community nominees, Sound Production, one Worldz collaborator, and an additional Miracle Church Kitchen and Community Service representative. Invitee identities and wallet-to-person mappings remain private until each person consents to public association. JayJayTeamDev has explicitly approved use of the public Solana signer address `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u`. The approved threshold remains **4 approvals**, producing the current **4-of-11** policy.

The same signer group may be offered an ongoing treasury/deployment approval role for future WorldzLaunchPad launches. This does **not** automatically give Miracle Church 20% of every future third-party or WorldzLaunchPad token. Any token allocation outside MIRACLE remains token-specific and explicitly approved.

## Phase 1 — Miracle Solana treasury

1. Invite each nominee to install a supported Solana wallet. Jupiter Mobile is the preferred onboarding option for this invitation.
2. Each nominee supplies only their **public Solana address**.
3. Never request, collect, copy or store seed phrases, private keys or wallet recovery material.
4. Validate each public address and obtain explicit consent to act as a treasury signer.
5. Create the Miracle Church treasury using **Squads multisig**.
6. Current policy: **11 signers, 4 approvals required**.
7. Allocate the approved 20% MIRACLE treasury bucket only after the canonical MRCL mint and launch manifest are final and verified.
8. Every proposal, approval, execution and final balance is captured in WorldzProof™.
9. Signer addition/removal and threshold changes are themselves multisig-governed actions.

The 20% allocation is a treasury token allocation. It is not an equity/shareholding statement and it is not divided personally between signers merely because they hold signing authority.

## Phase 2 — WorldzMiracleWallet™

**WorldzMiracleWallet™** is a first-party Worldz treasury interface, not a new single private key and not a replacement for chain-native security.

### Core functions

- one dashboard for supported Worldz treasury accounts;
- connect external self-custody signer wallets;
- balances and token positions by chain;
- proposal creation;
- human-readable transaction simulation/review;
- multisig approval collection;
- transaction execution only after chain-native threshold is satisfied;
- WorldzProof receipt and audit trail;
- WorldzGovern™ policy links where governance approval is required;
- ZED / AUTO / Command Centre status integration;
- WorldzFullScope registry integration;
- optional read-only investment/treasury analytics;
- explicit approval gates for swaps, liquidity, staking, investment or bridging;
- no automatic investing or bridge execution without a separately approved policy.

### Security boundary

WorldzMiracleWallet never stores user seed phrases or private keys on Worldz servers.

It stores only the minimum operational data needed for coordination: chain, treasury account, signer public address, signer consent/status, threshold, proposal identifiers, signatures/approval proofs, transaction hashes and WorldzProof records.

Wallet-to-person identity mappings are private operational data and must not be committed to the public repository.

## Phase 3 — Chain-native universal treasury

The UI is universal; custody remains chain-native.

| Chain family | Treasury / signing path |
|---|---|
| Solana | Squads multisig + connected Solana signer wallets |
| Ethereum / Base / BNB / HyperEVM / eligible EVM networks | Safe smart accounts/multisig where supported |
| XRP Ledger | Native XRPL SignerList + quorum/weights |
| Sui | Native Sui MultiSigPublicKey / weighted threshold |
| Robinhood / future EVM chains | EVM adapter only after network-specific Safe/wallet support and live verification |
| Future chains | New chain adapter; never emulate another chain's signing model |

One chain passing tests never enables another chain. Each adapter must independently pass address validation, simulation/review, signing, execution and WorldzProof verification.

## Phase 4 — WorldzCard™

**WorldzCard™** is the Worldz-facing hardware/card integration layer.

Initial direction:
- support WalletConnect-compatible hardware/self-custody wallets where technically supported;
- investigate Tangem as the first card/hardware integration target;
- connect the Worldz dApp to the wallet; never import or copy the hardware wallet private key;
- card signing remains inside the provider wallet/device;
- provider branding, SDK/API rights and commercial/card-program arrangements require a separate agreement before Worldz claims a branded physical card.

WorldzCard is therefore an adapter/product layer first. A physical co-branded card is a later partnership/compliance workstream, not assumed to exist.

## Miracle treasury launch gates

Before any mainnet treasury receives MIRACLE:
- canonical MRCL mint verified;
- exact 20% allocation approved in the MRCL allocation manifest;
- all eleven intended signer addresses verified;
- signer consent recorded;
- threshold approved;
- multisig address independently verified;
- test transaction completed;
- recovery/removal procedure tested;
- WorldzProof output tested;
- no individual seed/private key collected;
- final allocation transaction simulated and human-reviewed.

## Future WorldzLaunchPad inheritance

WorldzLaunchPad may reuse:
- treasury creation wizard;
- signer invitation/consent workflow;
- chain adapter registry;
- multisig threshold templates;
- transaction simulation/review;
- WorldzProof;
- signer rotation/recovery;
- WorldzCard connector layer.

Miracle Church's signer participation in future deployments is **opt-in and approval-based**. It must not silently become control over unrelated third-party token treasuries or an automatic economic allocation.

## Truth state

- Miracle Church 20% MRCL treasury direction: **OWNER_APPROVED_PLAN**
- Named signer invitation: **OWNER_APPROVED_TO_INVITE / CONSENT_PENDING**
- 4-of-10 threshold: **OWNER_APPROVED_DEFAULT**
- Squads treasury: **PLANNED / NOT DEPLOYED**
- WorldzMiracleWallet: **PLANNED**
- Multi-chain adapters: **PLANNED**
- WorldzCard / Tangem integration: **RESEARCH + PLANNED ADAPTER**
- Mainnet transfers: **NOT AUTHORIZED BY THIS DOCUMENT**

## JayJayTeamDev signer update — 2026-09-27

- JayJayTeamDev is added as signer #7.
- Public Solana signer address: `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u`.
- Treasury threshold remains **4 approvals required**.
- Effective signer model: **4-of-10** after the additional Sound Production nominee accepts and provides a verified public address.
- This update changes signer membership only; it does not authorize a mainnet transfer or create the multisig on-chain.

## Additional Sound Production signer invitation — 2026-09-27

- One additional Miracle treasury signer invitation is approved for the Sound Production role.
- Intended invitee: Callam; identity remains out of the public machine-readable signer mapping until consent is recorded.
- Total planned signers at that checkpoint: **8**.
- Required approvals remain **4**.
- Effective planned policy: **4-of-10**.
- Acceptance, public Solana address and consent are still pending; no signer is enrolled on-chain by this specification update.

## Final two invitation positions — 2026-09-27

- Two additional invitation positions are approved so the planned Miracle treasury has **10 total signers**.
- One position is for a trusted Worldz collaborator.
- One position is for a Miracle Church Kitchen and Community Service representative.
- The invitee names are intentionally not published in the public repository until individual consent is recorded.
- Required approvals remain **4**.
- Effective planned policy: **4-of-10**.
- No new signer is enrolled on-chain until consent and a verified public Solana address are supplied.

## Community nominations

Miracle Church is explicitly welcome to suggest additional trusted people from Miracle Church or the wider Dubbo community for treasury participation. A nomination does not automatically create signer authority. A nominee may fill a declined/vacant planned seat, or an expansion beyond 10 signers may be considered through a separate owner-approved governance change with threshold review, consent, address verification and WorldzProof.


## Latest team expansion — Matt / community hospitality — 2026-09-27

JayJayTeamDev approved one additional real-life Miracle Church / Worldz team position for the person known privately as **Matt**, who serves the community as a barber and was acting as Head Barista at Miracle Church on 2026-09-27.

Public-repository privacy rule remains unchanged: Matt's identity-to-wallet mapping is not published until he personally consents and supplies a verified public Solana address.

This latest owner instruction expands the current target from 10 to **11 total signers**, with **4 approvals required**. Earlier 4-of-10 sections in this document are historical checkpoints and are superseded for current planning by this 4-of-11 model. No signer is added on-chain merely because they are named in chat or this planning standard.

## Miracle team token participation — owner-approved plan — 2026-09-27

JayJayTeamDev also approved token participation for the trusted Miracle Church / Worldz team after each participant opts in and provides a verified public Solana address.

Planned token scope:
- the **10 legacy Worldz/Purple Diamond Crew token positions**, with exact canonical token identities verified before any distribution;
- **WORLDZ ($WLDZ)**;
- **REVIVE ($RVIV)**;
- **PHENIX ($PNEX)** after canonical mint/launch proof exists;
- **MIRACLE ($MRCL)** after canonical mint/launch proof exists.

Rules:
- signer authority and personal token allocation are separate;
- exact per-person/per-token amounts remain **PENDING OWNER APPROVAL** and must be written to a token-specific distribution manifest before execution;
- never invent a recipient address;
- verify canonical mint, source wallet/bucket, available balance and any lock/vesting restrictions before building a transfer;
- do not take tokens from LP, charity, church treasury, locked/vested, fee-routing or other reserved allocations unless that exact source is separately approved;
- use simulation/preflight, human-readable review, required multisig approvals and WorldzProof™ for each executable batch;
- a pre-launch token creates an entitlement/plan only, not a transfer, until its canonical mint exists and is verified.

Machine-readable plan: `worldzpad-omnichain/fullscope/worldz-miracle-team-participation.v1.json`.
