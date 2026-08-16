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

There is no static production-write GitHub workflow while cleanup/security lockdown is active.

## Deployment approval

Production status and approvals are controlled by:

- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- `deployments/oneworldz-19-total.request`

A build/test pass is not a production pass. Static production remains locked until preview visual proof passes, JayJayTeamDev approves the exact candidate, the authenticated Hostinger destination is proven, live technical proof passes and JayJayTeamDev × ChatGPT complete the live visual pass.

## Hosting root law

Every static target requires a destination-scoped hosting account whose visible website root is `/`.

The source model must never guess or prepend `domains/.../public_html`. If the authenticated Hostinger account does not expose the intended site at `/`, deployment stops and the hosting account/root is corrected before any write.

## Images

Active production website media belongs only inside the canonical static app source. Historical approved media is sealed under `archive/reference-media/` for provenance only and is never auto-restored into a build.

## Archive

`archive/` contains historical documentation, old certifications and sealed reference material. Archive content is evidence/reference only; it is not build authority, runtime authority, deployment authority or a fallback source.

## Verification

```bash
npm ci
npm run verify
npm audit --audit-level=high
```

`npm run verify` includes a structural guard that fails if retired website roots, old gateway folders, alternate workflow sets or legacy source locations return.
