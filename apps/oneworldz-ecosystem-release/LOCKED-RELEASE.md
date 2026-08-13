# OneWorldz Ecosystem Locked Release

Release identity: `oneworldz-ecosystem-locked-v1`

This package implements the approved OneWorldz Master Build Specification and CryptoWorldz Individual Build Plan under JayJayTeamDev™'s later total-deployment authority. It does not deploy or modify OneWorldz.com, CryptoBotz, bot code, Supabase, authentication, automation, permissions, owner controls, DNS, mail, wallet signing, buying, transfers or token execution.

## Exact production targets

Every static package contains `/index.html`, `/assets/` and `release-manifest.json`. Every Hostinger account must be `DOMAIN_ONLY`; the only permitted FTP root is `/`; `/public_html` is forbidden.

| Order | Package | Live destination | GitHub environment | Guard |
|---:|---|---|---|---|
| 1 | `cryptoworldz` | `https://cryptoworldz.xyz/` | `cryptoworldz-production` | `CRYPTOWORLDZ.XYZ` |
| 2 | `solworldz` | `https://solworldz.xyz/` | `solworldz-production` | `SOLWORLDZ.XYZ` |
| 3 | `ethworldz` | `https://ethworldz.xyz/` | `ethworldz-production` | `ETHWORLDZ.XYZ` |
| 4 | `baseworldz` | `https://baseworldz.xyz/` | `baseworldz-production` | `BASEWORLDZ.XYZ` |
| 5 | `bnbworldz` | `https://bnbworldz.xyz/` | `bnbworldz-production` | `BNBWORLDZ.XYZ` |
| 6 | `xrpworldz` | `https://xrpworldz.xyz/` | `xrpworldz-production` | `XRPWORLDZ.XYZ` |
| 7 | `suiworldz` | `https://suiworldz.xyz/` | `suiworldz-production` | `SUIWORLDZ.XYZ` |
| 8 | `hyperworldz` | `https://hyperworldz.xyz/` | `hyperworldz-production` | `HYPERWORLDZ.XYZ` |
| 9 | `robinworldz` | `https://robinworldz.xyz/` | `robinworldz-production` | `ROBINWORLDZ.XYZ` |
| 10 | `bitcoinworldz` | `https://bitcoinworldz.xyz/` | `bitcoinworldz-production` | `BITCOINWORLDZ.XYZ` |
| 11 | `hodlerworldz` | `https://hodlerworldz.xyz/` | `hodlerworldz-production` | `HODLERWORLDZ.XYZ` |
| 12 | `purplediamondcrew` | `https://purplediamondcrew.com/` | `purplediamondcrew-production` | `PURPLEDIAMONDCREW.COM` |
| 13 | `impactbased` | `https://impactbased.oneworldz.com/` | `impactbased-production` | `IMPACTBASED.ONEWORLDZ.COM` |
| 14 | `law-oneworldz` | `https://law.oneworldz.com/` | `law-oneworldz-production` | `LAW.ONEWORLDZ.COM` |
| 15 | `learn-oneworldz` | `https://learn.oneworldz.com/` | `learn-oneworldz-production` | `LEARN.ONEWORLDZ.COM` |

Protected and excluded from every deployment target:

- `https://oneworldz.com/` — live global gateway, unchanged.
- `https://cryptobotz.cryptoworldz.xyz/` — separate Hostinger Node application, unchanged.
- `/miniapp/` on CryptoBotz — existing authenticated service and owner-only AUTO surface, unchanged.

## Complete public route map

CryptoWorldz provides:

- `/`
- `/command-centre/`
- `/miniapp/`
- `/support/reagan-children/`
- `/support/community-impact/`
- `/support/jayjayteamdev/`
- `/divisions/visionworldz/`
- `/divisions/aiworldz/`
- `/divisions/musicworldz/`
- `/divisions/movieworldz/`
- `/divisions/artworldz/`
- `/divisions/learnworldz/`
- `/divisions/businessworldz/`
- `/divisions/lawworldz/`

The other fourteen packages provide their own domain-root homepage and reciprocal routes into OneWorldz, CryptoWorldz, the Worldz directory, Command Centre, support systems and acknowledgements.

## Payment separation

| Purpose | Live destination | Public statement |
|---|---|---|
| Reagan & Children / Action Spread Smiles | `https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01` | Dedicated humanitarian stream and separate records. |
| Community Impact | `https://donate.stripe.com/9B67sLgWm78R73U35j0kE02` | Dedicated community stream and separate records. |
| Support JayJayTeamDev | `https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00` | Voluntary mission support; no tax-deductible charity claim. |
| Support JayJayTeamDev | `https://www.paypal.me/Jayjay3480` | Preferred direct PayPal option for voluntary support. |

No GoFundMe link, bank secret, Stripe secret or PayPal credential exists in the release.

## Protected Command Centre contract

- System roles remain exactly: ZED, AUTO, G.R.A.C.E., RECAP and BASED.BID.
- Human leadership remains separately labelled: Solmusic, Savage, JayJayTeamDev, Remediy and Stepper.
- The public Command Centre mirrors source configuration, budget limits, approval, pause/stop, simulation, audit, health and confirmation boundaries without exposing owner actions.
- The working owner-authenticated surface remains the existing protected CryptoBotz MiniApp.
- AUTO stays safe locked: no signing, buying, transfers or bank movement.

## Community Impact registry proof

The page preserves all 35 Supabase registry links in display order. Public Facebook metadata was checked on 14 August 2026. Thirty-three destinations returned public names; entries 07 and 19 returned Facebook visibility-restricted responses and therefore use the locked plan's controlled neutral identity card while retaining the exact saved link. No database row or Supabase policy was changed.

## Verification gate

Run:

```sh
npm run verify
```

The automated release gate verifies:

- all 15 exact root packages and domain guards;
- protected OneWorldz and CryptoBotz exclusion;
- no rejected poster, screenshots, GoFundMe, placeholders or Coming Soon copy;
- all CryptoWorldz pages, divisions and three support systems;
- 35 unique Facebook destinations and resolved labels;
- five system roles and five separately labelled human leaders;
- the exact ten-position Purple Diamond Crew registry;
- reciprocal Worldz links;
- every referenced local image exists and is non-empty;
- no duplicate production-image path or duplicate image content inside a page;
- dedicated desktop/mobile artwork paths;
- responsive menu, Android-safe rules, keyboard focus, reduced motion and touch targets.

Browser proof additionally requires zero broken images, no rejected image, no content overflow, full-width mobile actions, correct mobile `<picture>` selection, menu close on selection and backdrop, and visual inspection of CryptoWorldz, Command Centre and all three support pages.

## Production deployment and rollback gate

For each target, in the table order:

1. Confirm the exact `DOMAIN_ONLY` account, guard and FTP root `/`.
2. Download a complete recoverable backup of the current root.
3. Upload only the matching package; upload `index.html` last.
4. Do not delete unrelated files, `.well-known`, mail, verification or service records.
5. Compare the hosted files to the package SHA-256 manifest.
6. Verify HTTPS, SSL, page title, assets, navigation and reciprocal links.
7. On failure, restore the complete pre-deployment backup and re-verify.

## Final handoff record

These fields must be completed only after live verification:

- Production commit:
- Production version: `oneworldz-ecosystem-locked-v1`
- Deployment timestamp:
- Fifteen custom-domain results:
- Fifteen SSL results:
- Desktop proof:
- Android-width mobile proof:
- Internal and reciprocal-link proof:
- Stripe and PayPal proof:
- Telegram proof:
- OneWorldz unchanged proof:
- CryptoBotz `/health` proof:
- DNS/mail/service preservation proof:
- Remaining unavailable items: none in the release; record any external provider visibility failure separately.
