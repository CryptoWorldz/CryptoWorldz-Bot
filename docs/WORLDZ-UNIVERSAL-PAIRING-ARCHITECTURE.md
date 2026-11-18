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


## Integration inventory — reuse existing code; do not duplicate
- `launchpad.cryptoworldz.xyz/platform-config.json`: existing Worldz CrossPair™ rule and Worldz Omnichain™ chain adapter registry; extend verified quote assets there rather than creating a second creator pairing engine.
- `worldzpad-mainnet/worldz-launch-capability-matrix.v1.json`: canonical chain-level status for token creation, pairing and market launch. Pairing currently lists SOL and verified wXRP targets for Solana, XRP AMM testnet for XRPL, and no production EVM/Sui/HyperEVM/Robinhood quote route. A planned WORLDZ quote must not be presented as LIVE or paired until independently proven.
- `worldzpad-omnichain/chain-registry.v1.json`: existing eight chain-native market models and verified chain identifiers; reference rather than duplicate registry or RPC endpoints.
- `worldzpad-omnichain/adapters/xrpl/xrpl.v1.json`: existing XRPL trust-line issuance, CLOB and AMM route design. Add WORLDZ as a verified issuer/currency quote only through this adapter and its testnet proof.
- `worldzpad-omnichain/adapters/evm/shared-evm.v1.json`: reuse shared EVM contracts and chain-specific venue validation; Robinhood and HyperEVM are independent release gates.
- `worldzpad-omnichain/README.md`: release gates and proof architecture remain authoritative; do not bypass them or auto-bridge funds.

### Future WORLDZ quote integration acceptance criteria
1. Chain-specific WORLDZ identity must be registered as an approved quote asset with verified mint/issuer/contract and backing details, never just by ticker.
2. Pair selector must only show WORLDZ where the chosen chain AND market adapter supports it and where a verified funding and market-creation route exists.
3. Creator must preview token and WORLDZ amounts, initial implied price, pool or order-book venue, fees, gas, trust line/account-reserve obligations if XRPL, and irreversible authorities before signing.
4. Verify on-chain pool/AMM/order-book creation, trade execution in both directions, real reserves and WORLDZ Proof receipts on a per-chain test environment before mainnet.
5. Do not promise that all pools share liquidity; market depth and slippage are chain-specific. Cross-chain representations require auditable backing and redemption.
6. Keep launch/market/payout gates disabled by default; no mint, funding, signing or broadcast by this planning change.

### Bridge research, separate from pair listings
- Solana links can be facilitated by cross-chain transfer and swap routing infrastructure such as Wormhole, deBridge, Mayan and Relay. Route/asset support is dynamic and requires a live quote and contract verification before recommending execution.
- Robinhood Chain official documentation describes its canonical bridge with Ethereum and additional third-party routes; **do not assume** a direct Solana ↔ Robinhood canonical bridge.
- Hyperliquid has separate HyperCore, HyperEVM and bridge concepts. A Solana ↔ Hyperliquid user flow may use routing providers/intermediary networks; this does not establish a direct native bridge or automatically support WORLDZ.

## Existing repository reconciliation
Older treasury documents still prescribe multisig and older platform configurations reference retired tokens and competing fee/supply policies. These are historical conflicts, not authorization to override the founder's newer developer-wallet decision. Resolve and test policies before any production implementation.
