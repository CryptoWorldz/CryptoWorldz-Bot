# WorldzLaunchPad Token Identity Standard

This directory is the canonical identity layer for every WorldzLaunchPad token.

## Non-negotiable rule

A token is identified by the exact **name + symbol + canonical mint + decimals** recorded in `worldz-token-registry.v1.json`. Mint-address prefixes such as `AHYn...` or `DnpN...` are never treated as a token name on Worldz-owned surfaces.

## Current identities

- #001 **WORLDZ (WLDZ)** — canonical mainnet mint recorded and live.
- #002 **REVIVE (RVIV)** — canonical mainnet mint and Meteora pool recorded; public market/indexer verification remains pending.
- #003 **PHENIX (PNEX)** — pre-launch. No mainnet mint may be published until it actually exists and is verified.
- #004 **MIRACLE (MRCL)** — planned. No mainnet mint or market data may be guessed.

## Every future launch

Before a token is deployed publicly, its registry record must contain the exact identity, supply/decimals, authority state, image, project URLs, explorer, market/pool, fee configuration, liquidity-lock state and verification status.

Unknown values stay `null` or `PENDING`. They are never fabricated to make a launch look complete.

The CI validator checks that live token metadata and `launchpad.cryptoworldz.xyz/tokenlist.json` agree with the canonical registry.
