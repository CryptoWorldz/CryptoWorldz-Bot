# BitWorldz OmniBTC™ — private research/build rail

Status: **architecture + validation only; mainnet execution OFF.**

**Goal:** make Bitcoin a first-class quote and settlement asset across WorldzLaunchPad™ without falsely describing wrapped or bridged BTC as native Bitcoin.

Pump.fun's current custom-pair model proves the core Solana pattern: a launch coin can use a supported quote asset other than SOL, and its current supported-pair list includes **WBTC on Solana**. That is a Solana token representation of Bitcoin, not native BTC settlement.

BitWorldz takes that idea further with a chain-native abstraction:

```
Builder
  ↓
WorldzLaunchPad™
  ↓
BitWorldz OmniBTC™
  ↓
BTC Asset Registry → chain-local approved BTC representation
  ↓
Chain-native Launch Adapter
  ↓
TOKEN / BTC-ASSET price discovery
  ↓
Liquidity / graduation / market
  ↓
Worldz Proof™
```

## Product names

- **BitWorldz™** — Bitcoin-facing WorldzLaunchPad product family.
- **OmniBTC™** — common BTC quote/settlement abstraction.
- **BTCMesh™** — route selection across supported Bitcoin representations and Bitcoin layers.
- **BitPair™** — a launch market denominated in an approved BTC asset.
- **BTC Passport™** — canonical identity record for the BTC representation used by a market.
- **BitProof™** — Worldz Proof extension showing the exact BTC asset, custody/bridge model, redemption path, venue and transaction IDs.

## What "launch against Bitcoin" means

Worldz must distinguish four cases:

1. **NATIVE_BTC** — actual Bitcoin L1 BTC is the settlement asset.
2. **BITCOIN_LAYER_BTC** — a programmable Bitcoin-layer asset such as sBTC or rBTC with a documented peg/security model.
3. **WRAPPED_BTC** — a tokenized BTC representation such as WBTC/cbBTC/tBTC on another chain.
4. **BRIDGED_BTC** — a BTC representation delivered through a bridge/interoperability layer.

The UI may display "Bitcoin-paired" as a broad category, but the signing screen and Worldz Proof must show the exact class. Wrapped BTC must never be labelled native BTC.

## "Any chain against Bitcoin" architecture

This is implemented as a **matrix**, not one fake universal pool.

For every supported Worldz chain:

```
Chain adapter
+ approved BTC representation on that chain
+ venue capable of TOKEN/BTC-ASSET market creation
+ fee disclosure
+ liquidity protection
+ buy/sell proof
= BitPair-capable chain
```

A project may then create several chain-local BitPairs under one Worldz project identity. These pools are separate markets. Worldz must not claim they are one fungible cross-chain pool unless a separately audited supply/bridge design proves that property.

## Existing Worldz chain targets

- **Solana:** first implementation target. Test WBTC/cbBTC/tBTC-style quote assets against Meteora/Raydium-compatible launch paths. Pump's current supported-pair documentation is useful evidence that WBTC quote launches are technically viable on Solana.
- **Ethereum / Base / BNB / HyperEVM / Robinhood:** use the shared EVM adapter plus a chain-local approved BTC representation and a venue-specific pool/curve adapter.
- **Sui:** use a verified Sui BTC representation only after asset, bridge and liquidity proof.
- **XRPL:** use an issued/bridged BTC representation only after issuer, redemption and market proof. Do not pretend native Bitcoin exists inside XRPL.

## Bitcoin-native expansion lanes

BitWorldz should also research execution environments where BTC itself or a Bitcoin-layer BTC asset is programmable.

### Stacks / sBTC candidate

Stacks provides smart contracts and sBTC, described by Stacks as a programmable 1:1 Bitcoin-backed asset. This is a strong candidate for a future **Bitcoin Layer launch adapter**, but it requires its own Clarity/testnet implementation and independent mainnet gate.

### Rootstock / rBTC candidate

Rootstock is an EVM-compatible Bitcoin sidechain with rBTC and established smart-contract tooling. It is a candidate for a future EVM-like Bitcoin execution adapter, again independently testnet-gated.

### Bitcoin L1

Bitcoin L1 is treated as a settlement network, not assumed to have Solana-style bonding curves or general-purpose AMMs. Any direct L1 launch primitive must be researched and proven separately before it appears as a Worldz capability.

## BTCMesh™ route policy

BTCMesh may discover possible routes, but it may not silently move assets.

Before a user signs, Worldz must disclose:

- source chain and destination chain;
- BTC asset symbol and contract/mint/asset ID;
- asset class: native / layer / wrapped / bridged;
- issuer/custodian/signers, where applicable;
- bridge/interoperability provider;
- peg/reserve model;
- redemption route back toward BTC;
- expected bridge/DEX/network fees;
- final launch venue;
- liquidity lock/protection model.

No private keys or seed phrases are accepted by Worldz.

## Fee rule

BitWorldz inherits the Worldz fee/disclosure policy only where the venue can actually support the modeled route.

The target remains **75 bps / 0.75% gross trader fee**, with Worldz-controlled collected revenue split:

- 51% Creator
- 17% Referrer
- 15% Legacy Flywheel™
- 8.5% WorldzLaunchPad™
- 8.5% OneWorldz Impact

External bridge, protocol, market and network deductions must be shown separately. No "Bitcoin premium" or hidden wrapping fee may be buried inside MagicFeeNumber™.

## Mainnet

**OFF.**

The first engineering milestone is:

1. registry + disclosure core;
2. Solana devnet mock-BTC quote harness;
3. read-only compatibility proof against one real Solana BTC representation;
4. EVM testnet BTC-quote proof;
5. Stacks and Rootstock research adapters;
6. Worldz Proof extension;
7. security review;
8. explicit owner release for each individual chain/asset/venue combination.

No single success unlocks every chain.
