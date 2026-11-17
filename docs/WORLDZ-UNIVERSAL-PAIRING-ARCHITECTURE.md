# WORLDZ Universal Pairing Architecture — proposed, gated

Status: DESIGN ONLY — no mainnet contracts, bridges, wrapped WORLDZ, funded pools or production pairing routes are authorized by this document.

## Goal
WorldzLaunchPad creators may eventually choose a native-chain WORLDZ quote asset for token launches: TOKEN/WORLDZ on Solana, an XRPL-issued TOKEN/WORLDZ market, and EVM TOKEN/WORLDZ pools on supported chains including Base and a verified Robinhood Chain environment. Each market is a distinct native-chain market, not a single shared cross-chain liquidity pool.

## Canonical economic supply
- Planned canonical WORLDZ supply: 100,000,000 units; no chain may independently create another unbacked 100,000,000.
- A chain representation must have an independently verifiable lock/mint, burn/release or equivalent fully collateralized mechanism.
- Global circulating supply reconciliation must count native circulating tokens plus represented tokens, excluding escrowed backing units to prevent double-counting.
- Mint/issuer authority, reserves, proof of backing, redemption, fee paths and pause controls require public disclosure and independent security review.
- Genesis allocations, including the proposed 5,000,000 welcome rewards, must reconcile against the original 100,000,000; no allocation expansion by assumption.

## LaunchPad market adapter requirements
1. Solana: identify verified WORLDZ mint and approved SPL-token pool venue; allow TOKEN/WORLDZ only after mint verification, explicit pool creation transaction preview and real funding proof. BTC quote options such as cbBTC and wXRP are separate assets with issuer/bridge risks; never confuse them with native BTC/XRP.
2. XRP Ledger: issue a WORLDZ trust-line asset through a documented issuer/distribution model. Configure trust lines, reserves and issuer settings. Use native XRPL DEX OfferCreate and/or AMMCreate for TOKEN/WORLDZ when verified supported. Do not assume a Solana-style LP implementation on XRPL.
3. EVM (Ethereum, Base, BNB, HyperEVM, Robinhood Chain only where independently verified): verified chain ID, WORLDZ token contract, bridge backing, audited pool factory/router, chain-specific gas and quote previews. Do not infer that every EVM-compatible chain has a supported launch or trading venue.
4. Sui and Bitcoin/Liquid: separate adapter research and chain-native market support gates, not implicit compatibility.

## Release gates — all false until independently proven
- canonical WORLDZ mint / genesis and supply allocation reconciled
- chain-specific WORLDZ asset issuer/contract verified
- bridge or reserve accounting and redeemability demonstrated
- chain-specific DEX/AMM venue and transaction simulation proven
- adequate real liquidity funded and disclosed; no assumed yields or prices
- wallet transaction signing and recovery independently security tested
- fee and impact accounting separated and transparent
- public mainnet launch approved only after CI, end-to-end tests and security review

## Scope
Do not deploy a new WORLDZ Layer 1 as a prerequisite. A future Layer 1 would be a separate high-cost research initiative. No automatic token wrapping, market making, pool deployment, or user spending is enabled by this specification.

## Existing repository reconciliation
Older treasury documents still prescribe multisig and older platform configurations reference retired tokens and competing fee/supply policies. These are historical conflicts, not authorization to override the founder's newer developer-wallet decision. Resolve and test policies before any production implementation.
