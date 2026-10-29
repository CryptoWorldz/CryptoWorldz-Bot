# WORLDZ multi-chain launch readiness — 2026-10-29

This document tracks **real launch capability**, not marketing claims. No mainnet release is authorized by this document.

## Target chain order
1. Solana (SVM)
2. XRPL (native issued tokens; XRPL EVM is a separate future integration)
3. HyperEVM (HyperCore is separately gated)
4. Bitcoin (native Bitcoin is **not** ERC-20; requires a distinct protocol and custody/security design)
5. Base
6. Sui
7. Robinhood Chain
8. Ethereum

The existing eight-chain registry uses **BNB in place of Bitcoin**. Retain BNB as an optional future chain; do not silently treat it as Bitcoin or claim native BTC token launching.

## Current evidence and release status
| Chain | Existing repository evidence | Remaining proof | Mainnet |
|---|---|---|---|
| Solana | devnet implementation in progress; Meteora/Jupiter candidates | mint, authorities, LP, fee receipts, buy/sell, proof | DISABLED |
| XRPL | browser testnet adapter built; issuer/CLOB/AMM design | testnet issue/trustline, market, controls, receipts | DISABLED |
| HyperEVM | shared EVM adapter planned | deployed testnet factory, pool, fees, receipts | DISABLED |
| Bitcoin | no native Bitcoin launch adapter in registry | choose protocol, build test harness and security review | NOT IMPLEMENTED |
| Base | shared EVM adapter planned | testnet factory, pool, fees, receipts | DISABLED |
| Sui | Move adapter design; CI validation passed | real testnet package/market, liquidity, receipts | DISABLED |
| Robinhood | shared EVM adapter planned | testnet factory, pool, fees, receipts | DISABLED |
| Ethereum | shared EVM adapter planned | Sepolia factory, pool, fees, receipts | DISABLED |

**CI schema/adapter validation is not a transaction receipt and is not evidence of a successful launch.**

## LaunchPad UX acceptance
- Show only chains with proven testnet actions as **Testnet available**.
- Label every other chain **In development** or **Research**, never **Launch now**.
- Wallet connect and pre-sign fee disclosure must be verified separately per chain.
- No mainnet deployment until signed owner approval and per-chain proof bundle.
- Use user-approved WORLDZ artwork; no stock/generic imagery.
- Do not publish old WLDZ/REVIVE as the current flagship.
- New fee policy must be reconciled against older 75-bps / 0.75% adapter defaults before launch.
- Do not change WorldzLaunch.com DNS until existing launchpad mobile acceptance is complete.
