# WORLDZ launch capability and wallet release gates — 11 November 2026

Order of delivery: **Solana → XRP Ledger → Base → Ethereum → BNB → Sui → HyperEVM → Robinhood**. This is the current eight-chain registry order; do not silently change it when extending capabilities.

## Three experience levels
- **Beginner:** plain-language token details, chain, wallet, fees/risks, proof preview.
- **Intermediate:** adds supply distribution, market selection, liquidity and vesting.
- **Advanced:** adds explicit authority controls, chain-native options, router receipt disclosures and simulation logs.

Modes affect UX only. None bypass chain-specific signing, fee, liquidity, legal/security and mainnet release gates. The new `src/worldz-launch-readiness.js` is a **conservative, read-only evaluation**, not a mint engine.

## Existing verified repository foundations
- XRPL: GemWallet **testnet** console for trust-line issued tokens, issuer settings, CLOB and AMM preparation. Xaman mobile handoff still requires provider configuration and validation.
- Sui: Move fixed-supply Devnet console and recorded Devnet reference. The testnet market and mainnet are locked; Sui DApp Kit integration remains provider-specific.
- Solana: devnet mint scripts and mainnet launch plans, not blanket permission to mint.
- Base, Ethereum, BNB, HyperEVM, Robinhood: inspect shared EVM adapter and chain-specific deployment/DEX proofs; design entries do not imply ready-to-launch.
- Command Centre/SPARKY: existing /sparky registry and reward code; old /dipshit alias remains; inspect PRs #426, #427, #428, #434 before merging. Live Telegram bot and webhook must be independently verified.

## Flagship token preparation — NOT minted by this change
- **$WORLDZ**: 100,000,000 planned flagship supply per recent founder specification, pending reconciliation of PR #429 against earlier WLDZ mint and allocation legacy. Never repurpose or claim ownership of legacy WLDZ; do not create a new mainnet mint without approved canonical identity, authority, distribution and on-chain receipts.
- **$SPARKY**: supply, network, allocation and signer must be canonicalised from existing repository proposals. Do not invent them or send awards until the mint and ledger are proven.
- No automatic background token creation. Signing requires authorised wallet interaction; broadcast requires explicit owner release, security review and recorded transaction proof.

## Beta milestone
Only after all eight chain paths expose accurate capability states and documented tests: build a signed Android APK with **external-wallet / read-only functionality first**, no seed collection, no automated swaps, no mainnet transfer authority. Label any unimplemented features accurately. Perform independent security review prior to inviting people to hold assets.

## Blocking reconciliation
The existing platform-config still references discontinued WLDZ/RVIV, older multisig policies and supply wording, while newer draft PRs compete. Repair the canonical policy explicitly, not by blindly merging or replacing production configs.

Command Centre and SPARKY operations, including live webhook, referral eligibility and API credit protection, must pass CI and runtime checks separately from token launch.
