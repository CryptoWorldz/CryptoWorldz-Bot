# WorldzApp™ — Google Play Console Handoff

**Updated:** 28 September 2026  
**State:** Code-side preparation advanced; Google account/signing actions still require the real Play developer account.

## Application identity

- App name: **WorldzApp**
- Candidate application ID: `xyz.cryptoworldz.worldzapp`
- Target / compile SDK: **36**
- Release format: **Android App Bundle (.aab)**
- Packaging: **Trusted Web Activity**
- Source PWA: `https://launchpad.cryptoworldz.xyz/worldz-app/`

Do not create the permanent Play app identity until the package ID is confirmed available in the intended Play Console account.

## Final owner-approved branding

The latest explicit owner approval supersedes every earlier WorldzApp/Worldz emblem revision.

- Final master: user-supplied `1000027745.png`
- Dimensions: **1536 × 1536**
- SHA-256: `e23b67694d0a28e2775e57a80511a3407bc9e39751661d1fbf378f560ff97eec`
- Redraw/regeneration: **FORBIDDEN**
- Allowed transformations: deterministic resize, safe-zone padding and format/compression only.
- Earlier committed 512px icons remain valid for CI compilation only and are **superseded for the final Play listing/build**.

## Public URLs prepared

- Privacy candidate: `https://launchpad.cryptoworldz.xyz/worldz-app/privacy/`
- Support candidate: `https://launchpad.cryptoworldz.xyz/worldz-app/support/`

Public deployment has been uploaded to Hostinger. Automated HTTP verification from GitHub currently receives HTTP 403 from the host/WAF, so these URLs must not be marked verified until a successful public/browser check exists.

## Play declarations — current release truth

- Wallet model: **external / non-custodial**
- Seed phrase collection: **NO**
- Private key collection: **NO**
- Worldz-hosted consumer account creation: **NO**
- App-level transaction signing: **OFF**
- App-level execution: **OFF**
- Mainnet broadcast: **OFF**
- Financial features form: **REQUIRED**
- Expected current selection if wallet connection ships: **Cryptocurrency wallet**
- Data Safety: final exact production audit required
- Ads declaration: final runtime audit required
- Target audience/content rating: Play Console completion required
- Reviewer core access: no Worldz account, wallet or payment required for public core

## Signing sequence

1. Verify/create the intended Play developer account.
2. Confirm the final package ID in Play Console.
3. Configure Play App Signing.
4. Capture the real Play App Signing **SHA-256 certificate fingerprint**.
5. Run `WORLDZAPP_PLAY_SIGNING_SHA256=<fingerprint> npm run render:worldzapp:assetlinks`.
6. Deploy the resulting `/.well-known/assetlinks.json`.
7. Verify the association publicly.
8. Produce the signed release AAB with signing secrets outside source control.
9. Complete internal/closed testing and device/accessibility QA.
10. Finalize Data Safety, Financial Features, ads, target audience and content rating.
11. Perform explicit human release authorization.
12. Submit to Google Play review.

## Dedicated support contact

A clean written WorldzApp support address is still required. The existing mailbox using retired public branding must not be used as the WorldzApp store contact.

## Release truth

A successful CI build, unsigned AAB, FTP deployment or passing preflight is **not Google Play approval**. WorldzApp becomes Play-live only after Google accepts the submitted release and makes it available through the selected production countries.


## Play release pack — 28 September 2026

The code-side release pack now also includes:
- `apps/worldzapp-android/play-testing-checklist.v1.json`
- `apps/worldzapp-android/play-screenshot-plan.v1.json`
- `apps/worldzapp-android/play-console-copy.v1.json`
- `apps/worldzapp-android/signed-release-preparation.v1.json`

The intended Google/Play account login is `jayjayteamdev@outlook.com`. This is an account-ownership/login identifier, not automatically the final public support address.

Final owner-approved logo master remains SHA-256 `e23b67694d0a28e2775e57a80511a3407bc9e39751661d1fbf378f560ff97eec`. Final icon binaries must be deterministic derivatives of that exact master; no redraw/regeneration is permitted.

Screenshot capture remains pending the exact real-device/submitted build. Digital Asset Links remains pending the real Play App Signing certificate SHA-256. Signed AAB remains pending real signing identity. These external gates must not be bypassed.


## Locked paid-app proceeds wording — 28 September 2026

> WorldzApp™ is a one-time A$2.50 purchase. After applicable platform fees, taxes, refunds and payment adjustments, Worldz intends to allocate net app-sale proceeds 50/50: 50% toward future Worldz ecosystem liquidity provisioning and 50% toward WorldzApp development, infrastructure and ongoing operations. Purchasing WorldzApp does not purchase tokens, LP ownership, an investment interest, revenue share, or any right to financial returns.

This wording is the canonical public description of the WorldzApp paid-app proceeds model unless the owner explicitly replaces it. The 50/50 allocation is based on net app-sale proceeds after the stated adjustments, and app purchase does not create token, LP, investment, revenue-share or financial-return rights.
