# PurpleDiamondCrew.com Deployment Checklist

Approved: 5 August 2026, Australia/Sydney

## Before deployment

- [ ] Automated web-core evaluation passes.
- [ ] Hostinger deployment ZIP and SHA-256 file are generated.
- [ ] Current PurpleDiamondCrew.com public files are backed up.
- [ ] Existing DNS records are recorded before changes.
- [ ] No password, private key, wallet seed or service-role secret exists in public files.

## Deployment

- [ ] Upload the contents of `cryptoworldz-web-core-deploy.zip` to the domain document root.
- [ ] Confirm `.htaccess` is included.
- [ ] Keep SSL enabled for both apex and `www` hostnames.
- [ ] Clear Hostinger and browser caches.

## Public verification

- [ ] `https://purplediamondcrew.com` loads without redirects to the old $PDC1 page.
- [ ] The hero displays Purple Diamond Crew, Action Team, Support and Hope Chest.
- [ ] Page One displays the real-world action categories.
- [ ] Page Two displays support and application pathways.
- [ ] Page Three displays the OneWorldz Hope Chest background.
- [ ] Ten verification-gated token records load from Supabase.
- [ ] No Invest button appears without a verified trade or DEX URL.
- [ ] X, Telegram, OneWorldz, CryptoWorldz and ImpactBased links open correctly.
- [ ] Mobile navigation and cards work on a small Android screen.
- [ ] HTTPS and security headers are present.
- [ ] The old public site backup remains available for rollback.

## Rollback trigger

Restore the backup immediately if the deployment produces a blank page, missing assets, failed Supabase access, broken mobile navigation, unexpected token actions or an HTTPS failure.
