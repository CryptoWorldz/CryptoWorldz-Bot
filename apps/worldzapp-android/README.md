# WorldzApp™ Android 16 / API 36 packaging foundation

Status: **API 36 + GOOGLE PLAY READINESS FOUNDATION BUILT — NOT A RELEASED OR SIGNED APP**

WorldzApp's Android path uses a **Trusted Web Activity (TWA)** so the proven PWA remains the application core instead of being rewritten as a second product.

## Current build decision

- source: `https://launchpad.cryptoworldz.xyz/worldz-app/`
- packaging: Bubblewrap / TWA
- Bubblewrap pin: `1.25.0`
- Android target/compile API: **36**
- publishing format: **Android App Bundle (.aab)**
- candidate application ID: `xyz.cryptoworldz.worldzapp`
- candidate ID is not considered permanently locked until the Play application is created.
- no keystore, signing password, private key, seed phrase or service-account credential belongs in this repository.

## Why no signed AAB is committed yet

A Play release needs immutable identity inputs that must not be guessed:

1. owner-approved Worldz centre-logo Android raster/maskable assets;
2. final application ID lock;
3. Play/App signing identity;
4. SHA-256 signing-certificate fingerprint;
5. Digital Asset Links deployed at the verified Worldz host;
6. Play developer/listing and policy declarations.

The template intentionally blocks a signed-release claim until those exist.

## Release sequence

`PWA proven → Stage 4B simulation proof → Stage 5B Squads proof → API-36 Android package foundation → final identity/assets → Digital Asset Links → signed AAB → device QA → Play testing → Play review`

Safe/XRPL/Sui capabilities stay disabled until their own live Worldz profiles pass; Android packaging does not unlock them.


## Google Play readiness layer

The repository now carries explicit pre-submission contracts for:

- Play release blockers and identity/signing gates;
- Data safety inventory and final-audit requirements;
- Financial features declaration mapping;
- Google review-access instructions;
- truthful draft store listing content;
- privacy-policy draft;
- automated fail-closed Play readiness verification.

Run:

`npm run verify:worldzapp:play`

A PASS means the **readiness controls exist and remain fail-closed**. It does not mean the app is approved or ready to submit. The final owner-approved centre logo, public support/privacy URLs, Play developer identity, Play App Signing certificate, Digital Asset Links, signed AAB, testing and final Play Console declarations are still required.
