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
npm run verify:web
```

The fleet topology and destination contract are defined by:

`apps/oneworldz-ecosystem-release/production-targets.mjs`

There is no static production-write GitHub workflow and none is required for the current plan. Production may use only one authenticated Hostinger static-fleet rail after destination proof.

## Total deployment authority

Production status and authority are controlled by:

- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/FLEET-REQUIREMENTS.md`
- `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- `deployments/oneworldz-19-total.request`

JayJayTeamDev's current `Perform TOTAL DEPLOYMENT PLAN` instruction is standing authority for the unchanged canonical candidate chain. Repeated approval prompts are not required unless content, target mapping, payments, DNS/mail, protected runtime or security boundaries change.

A build/test pass is not a production pass. Final status still requires preview visual proof, authenticated Hostinger destination proof, production deployment, live technical proof and JayJayTeamDev × ChatGPT live visual proof.

## Hosting root law

Every static target must be authenticated against the exact Hostinger website/account before production write.

Hostinger can expose a physical website home directory ending in `public_html`. The canonical deployment contract uses remote `/` only when the chosen FTP/SFTP credential is already scoped to that exact website root. Never prepend or probe alternative directory structures after a mismatch; correct the target contract first.

## Images

Active production website media belongs only inside the canonical static app source. Historical approved media is sealed under `archive/reference-media/` for provenance only and is never auto-restored into a build.

## Archive and historical GitHub metadata

`archive/`, old branches and historical GitHub Environments are evidence/reference only. They are not build, runtime, target-selection or deployment authority.

## Verification

```bash
npm ci
npm run verify
npm audit --audit-level=high
```

`npm run verify` includes a structural guard that fails if retired website roots, old gateway folders, alternate static deployment workflow sets or legacy source locations return.
