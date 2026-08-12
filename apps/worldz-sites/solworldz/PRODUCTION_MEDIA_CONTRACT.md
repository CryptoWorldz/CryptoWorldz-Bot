# SolWorldz Production Media Contract

Owner: JayJayTeamDev
Active production domain: `https://solworldz.xyz`
Status: PRE-DEPLOYMENT HARD GATE

## Legacy-domain rule

`SolWorld.fun` is retired and no longer owned. It must never be used as:
- a production link,
- a fallback destination,
- a redirect target,
- an image or asset origin,
- a canonical URL,
- a deployment destination,
- or an active renewal target.

Any production-facing SolWorldz file containing `solworld.fun` must fail the release gate.

## Canonical production artwork

The SolWorldz production candidate must use the approved current files already held in the repository:

- `apps/cryptoworldz-web-core/assets/images/website-core/solworldz/solworldz-desktop-hero.webp`
- `apps/cryptoworldz-web-core/assets/images/website-core/solworldz/solworldz-mobile-hero.webp`
- `apps/cryptoworldz-web-core/assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp`

The release assembler copies these exact files into the standalone SolWorldz package and records SHA-256 hashes in `release-manifest.json`.

No generated placeholder, blurry fallback, remote hotlink, screenshot substitute or legacy image may replace an approved production asset.

## Clickable Worldz network

The SolWorldz page must expose the approved network as real clickable destinations, including:

- OneWorldz
- CryptoWorldz
- SolWorldz
- EthWorldz
- BaseWorldz
- BNBWorldz
- XRPWorldz
- SuiWorldz
- HyperWorldz
- BitcoinWorldz
- RobinWorldz / RecoverYourDebt
- ImpactBased
- LearnWorldz
- Purple Diamond Crew

The network is a navigation layer only; it must not silently route a missing Worldz destination to an unrelated legacy site.

## Production sequence

`BUILD -> STATIC CHECK -> HASH CHECK -> LINK CHECK -> BACKUP -> DEPLOY -> LIVE BROWSER CHECK -> OWNER ACCEPTANCE`

A successful upload or HTTP 200 is not sufficient proof of a successful release.
