# WORLDZ — CryptoWorldz-Bot

Source code, website assets, release tooling and audit workflows for the Worldz ecosystem.

## Current site structure

`DOMAINS.txt` contains 18 established website and subdomain roots. Newer roots include `worldzhq.com/`, `worldz.live/` and `launchpad.cryptoworldz.xyz/`. Their public pages are tracked separately; **a present file is not proof that its public domain is live**.

## Local validation

With Node.js 20 or newer and Python 3 available:

```sh
npm ci
npm run check:structure
npm run check
npm test
npm run check:auto
```

`npm run verify` runs these checks together. Deployment requires the protected `cryptoworldz-production` environment and must be verified from the resulting GitHub Actions logs and real public HTTPS content, not a green upload step alone.

## Sensitive data

Never commit `.env` files, credentials, API keys, wallet private keys or SSH private keys. The tracked `.env.example` lists names only. GitHub environment secrets belong in **Settings → Environments → cryptoworldz-production**. See [SECURITY.md](SECURITY.md).

## Production safety

The various historical production workflows have different targets and permissions. Review their effect before dispatching them: some rewrite public assets, and some remove retired remote routes. Changes to DNS, TLS certificates and Hostinger website ownership cannot be proven solely from repository updates.
