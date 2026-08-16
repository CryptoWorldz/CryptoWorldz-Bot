# OneWorldz Deployment Control

This directory is a **state/approval record only**. It is not a collection of workflow trigger files.

## Single static-fleet route

- Canonical source/build root: `apps/oneworldz-ecosystem-release/`
- Canonical topology and Hostinger destination contract: `apps/oneworldz-ecosystem-release/production-targets.mjs`
- Canonical verification: `npm run verify:web`
- Deployment approval law: `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- Static production deployment workflow: **NONE while cleanup/security lockdown is active**
- Protected Node runtime: `cryptobotz.cryptoworldz.xyz` remains separate and is never a static target.

Only `oneworldz-19-total.request` is retained here. It records the current release state; changing it does not deploy anything.

## Rule

Do not recreate domain-specific request files, repair triggers, `*-only.request` files, alternate FTP routes, visual-repair triggers, deployment holds, or parallel production gateways.

Before any future production workflow exists, the exact authenticated Hostinger remote-root contract must be proven once and the workflow must implement the JayJayTeamDev × ChatGPT approval gate.

Secrets never belong in this directory.
