# SolWorldz Production Media Contract

Owner: JayJayTeamDev  
Active production domain: `https://solworldz.xyz`  
Status: PRE-DEPLOYMENT HARD GATE

## Legacy-domain rule

`SolWorld.fun` is retired. It must never be used as a production link, fallback destination, redirect target, asset origin, canonical URL or deployment destination.

Any production-facing SolWorldz file containing `solworld.fun` must fail the release gate.

## Canonical production artwork

The only approved image source for this SolWorldz release is:

`media/approved-worldz/worldz-master-images-approved-v2.zip`

Locked SHA-256:

`eacf0f88f7034b2e0f0c6e638f1209770a7fa48865ac424eed77dd426f23f152`

The archive contains the approved SolWorldz, blockchain Worldz, OneWorldz, CryptoWorldz, ImpactBased, Purple Diamond Crew, humanitarian and token artwork.

Historical archive entries use `.png` filenames, but inspection proves the approved image payloads are JPEG data. The release assembler therefore copies the exact approved JPEG bytes into `.jpg` production paths. This is a filename/MIME correction only: pixels are not regenerated, resized, blurred, compressed or substituted.

The release assembler must:
- prove the archive checksum before extraction,
- extract only approved named entries,
- verify JPEG decoding and minimum dimensions,
- preserve the exact source bytes,
- record file size, dimensions and SHA-256 in `release-manifest.json`,
- reject generated placeholders, old website-core images, remote hotlinks and legacy image folders.

## SolWorldz production artwork

Required approved master art includes:
- SolWorldz 1536×512 master hero,
- Action Creates Smiles,
- SolMars,
- SolBud,
- Global Impact Alliance,
- Uganda Unite,
- Next Big Coin,
- SolToken,
- ImpactBased,
- CryptoWorldz Command Centre,
- OneWorldz,
- EthWorldz,
- BaseWorldz,
- BNBWorldz,
- XRPWorldz,
- HyperWorldz,
- RobinWorldz,
- SuiWorldz,
- Bitcoin/BitWorldz artwork,
- Purple Diamond Crew.

## Clickable Worldz network

Live, verified destinations are clickable. A World whose official destination is not yet live stays visible as `COMING SOON` and must not silently route to an unrelated or retired domain.

The current network includes OneWorldz, CryptoWorldz, SolWorldz, EthWorldz, BaseWorldz, BNBWorldz, XRPWorldz, HyperWorldz, RobinWorldz / RecoverYourDebt, ImpactBased and Purple Diamond Crew as live links. SuiWorldz, BitcoinWorldz and LearnWorldz remain visible but non-clickable until their official live targets pass the link gate.

## Production sequence

`MASTER ARCHIVE -> BUILD -> STATIC CHECK -> IMAGE DIMENSION/HASH CHECK -> CLICKABLE LINK CHECK -> LOCAL DESKTOP/MOBILE BROWSER PROOF -> HOSTING SAFETY GATE -> DEPLOY -> LIVE BYTE/HASH PROOF -> OWNER ACCEPTANCE`

A successful upload or HTTP 200 is never sufficient proof of a successful release.
