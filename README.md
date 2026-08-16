# CryptoWorldz / OneWorldz — Canonical Repository

This repository has **two active product boundaries only**.

## 1. Protected CryptoBotz runtime

Runtime entry: `index.js`

Protected application: `https://cryptobotz.cryptoworldz.xyz`

Active runtime code lives in `src/`, required `public/` assets and the checked-in data/migration layers. CryptoBotz does **not** serve public OneWorldz/Worldz static websites as a fallback gateway.

## 2. One canonical static ecosystem build

The only active static website source/build is:

`apps/oneworldz-ecosystem-release/`

Canonical commands:

```bash
npm run build:ecosystem-release
npm run verify
```

The fleet topology, visual identity contract and exact authenticated Hostinger transport destinations are defined once in:

`apps/oneworldz-ecosystem-release/production-targets.mjs`

If GitHub Actions is used, `.github/workflows/main.yml` is the **only** static-fleet execution rail. No fourth workflow, domain-specific deployer, fallback gateway or alternate FTP route is permitted.

## Total deployment authority

Production status and authority are controlled by:

- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/FLEET-REQUIREMENTS.md`
- `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- `deployments/oneworldz-19-total.request`

JayJayTeamDev's current `Perform TOTAL DEPLOYMENT PLAN` instruction is standing authority for the unchanged canonical candidate chain. Repeated approval prompts are not required unless content, target mapping, payments, DNS/mail, protected runtime or security boundaries change.

The canonical workflow is two-phase by design:

1. build + automated desktop/mobile candidate evidence, with **no production write**;
2. after ChatGPT inspects that evidence and records the approved static-source tree, deploy the exact immutable candidate through the one proven Hostinger rail and generate fresh live desktop/mobile evidence.

Final `JAYJAYTEAMDEV × CHATGPT — 100% PRODUCTION PASS` is recorded only after the fresh live evidence is reviewed.

## Hosting root law

The website/package contract remains:

- root `/`;
- homepage `/index.html`;
- assets `/assets/`.

The existing shared Hostinger FTP account reaches physical transport directories beneath the hosting account. All 18 exact transport directories were authenticated by the successful read-only proof and are stored as `hostingerTransportDir` values in the canonical target contract.

Deployment code reads those exact stored transport values. It never derives a Hostinger directory from a domain, appends another `public_html`, probes siblings, falls back to `/`, or chooses another historical environment after a mismatch.

## Images

Active production website media belongs only inside the canonical static app source. Historical approved media is sealed under `archive/reference-media/` for provenance only and is never auto-restored into a build.

## Archive and historical GitHub metadata

`archive/`, old branches and historical GitHub Environments are evidence/reference only. The sole production credential boundary retained from historical environment metadata is `cryptoworldz-production`, because its existing Hostinger credential set produced the successful 18-root authentication proof and is now bound only to `.github/workflows/main.yml`.

## Verification

```bash
npm ci
npm run verify
npm audit --audit-level=high
```

`npm run verify` includes a structural guard that fails if retired website roots, old gateway folders, a fourth workflow, alternate static deployment routes or legacy active-source locations return.
