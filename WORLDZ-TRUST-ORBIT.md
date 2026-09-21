# Worldz Trust Orbit™ — Proof, Not Promises

Version: `WORLDZ-TRUST-ORBIT-1`

Worldz Trust Orbit™ is the evidence layer for WorldzLaunchPad™ public launches and supported external tokens.

It does **not** issue an investment rating and does not claim that a token is safe. It exposes independently checkable facts as separate Proof Rings so one attractive number cannot hide a failed authority, lock, distribution, market, or launch-control check.

## Proof Rings

### 1. Authority Ring
Reads the Solana mint account directly and reports:
- mint authority;
- freeze authority;
- current supply;
- token program;
- whether the mint has an immutable fixed-supply signal.

Worldz fixed-supply launches target both mint and freeze authority = `null` after genesis.

### 2. Distribution Ring
Reports concentration evidence separately from investment conclusions:
- top token-account concentration where RPC data is available;
- Jupiter audit top-holder percentage where returned;
- no arbitrary Worldz "safe concentration" label.

### 3. Worldz Proof Ring
Looks for a public WorldzLaunchPad registry record and exposes:
- launch engine;
- environment;
- stage;
- configured project trading fee;
- ZED / AUTO / G.R.A.C.E. registration;
- mainnet release-gate proof when available.

### 4. Jupiter Identity Ring
Uses Jupiter Tokens API V2 as an external evidence source and reports the token's current Jupiter verification state.

Worldz Trust Orbit is not a Jupiter product and Jupiter verification is not a Worldz guarantee.

### 5. Organic Market Ring
Displays Jupiter's live market-quality signals when available:
- Organic Score;
- Organic Score label;
- holder count;
- liquidity;
- USD price.

These are time-varying external signals. Fresh tokens can have limited or volatile data.

### 6. Locks & Control Ring
Records enforceable token-control evidence:
- Worldz LP-lock proof;
- Worldz vesting proof;
- external locking/vesting primitives.

Jupiter Lock is an approved external primitive for the Solana adapter. Program:
`LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn`

Version 1 does not claim a token-specific Jupiter Lock association until that lock account is decoded and cryptographically linked to the mint.

## Anti-gaming rule

There is no single opaque Worldz Trust Score.

The UI may display the number of rings carrying positive verified/proof-present evidence, but that number is informational only. Each ring remains visible with its underlying evidence.

A project cannot compensate for an open mint authority by buying volume, cannot compensate for an absent lock with social popularity, and cannot convert a low or immature external signal into a Worldz guarantee.

## Public API

Worldz Trust Orbit API:
`/functions/v1/worldz-trust-orbit?mint=<SOLANA_MINT>`

The current passport is stored server-side as a timestamped latest snapshot. The public page refreshes evidence on lookup.

## Future adapters

Planned without changing the v1 truth model:
1. Decode Jupiter Lock positions and bind lock accounts to mint + recipient + vesting schedule.
2. Add historical passport snapshots and proof-change timeline.
3. Add Base/EVM authority, ownership, LP-lock and market-evidence adapters.
4. Add XRPL and Sui chain-native evidence rings.
5. Add signed Worldz Trust Passport manifests for portable verification.
6. Add alerts when a mutable or time-varying proof changes.

## Non-endorsement

"Jupiter Identity Ring", "Organic Market Ring", and Jupiter Lock evidence are integrations with public Jupiter infrastructure. They do not imply a partnership, co-brand, certification, warranty, or endorsement by Jupiter.
