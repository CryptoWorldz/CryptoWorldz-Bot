# WorldzApp™ Android 16 / API 36 packaging foundation

Status: **API-36 FOUNDATION + APPROVED LOGO SOURCE + UNSIGNED BUILD GATE BUILT — FIRST-PARTY ICON DEPLOYMENT REQUIRED**

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

1. first-party HTTPS deployment of the exact owner-approved Worldz centre-logo derivative and maskable safe-area QA;
2. final application ID lock;
3. Play/App signing identity;
4. SHA-256 signing-certificate fingerprint;
5. Digital Asset Links deployed at the verified Worldz host;
6. Play developer/listing and policy declarations.

The template intentionally blocks a signed-release claim until those exist.

## Release sequence

`PWA proven → Stage 4B simulation proof → Stage 5B Squads proof → API-36 Android package foundation → final identity/assets → Digital Asset Links → signed AAB → device QA → Play testing → Play review`

Safe/XRPL/Sui capabilities stay disabled until their own live Worldz profiles pass; Android packaging does not unlock them.


## Approved WorldzApp centre logo — locked source

The exact owner-supplied centre logo is now identified and locked by source evidence:

- source format: PNG
- source dimensions: **1536 × 1536**
- SHA-256: `ca401c3a559ffcd8b1829118595138a9c1efa33c4838df45e1565f6bdc751a35`
- branding rule: **use this centre logo only; do not substitute or redesign it**
- the former generic `worldz-app-icon.svg` W artwork is rejected and removed from active WorldzApp branding.

The source artwork is approved, but the Android-ready first-party HTTPS derivative is still a deployment gate. Until that URL exists, the PWA intentionally carries no substitute icon.

## Unsigned Android build gate

The unsigned Android path is code-built:

- `apps/worldzapp-android/unsigned-build.v1.json`
- `tools/prepare-worldzapp-android-unsigned.mjs`
- `tools/verify-worldzapp-android-unsigned-readiness.mjs`
- `test/worldz-app-android-unsigned.test.js`

The generator accepts only HTTPS icon URLs on `launchpad.cryptoworldz.xyz`, rejects the old W icon and placeholder/example assets, and produces no signing-key configuration. The build command remains Bubblewrap `build --skipSigning`.

Current next gate: deploy an exact derivative of the approved logo to the Worldz first-party host, verify maskable safe area, then generate the unsigned API-36 TWA project and AAB.
