# WorldzApp™ — Google Play Release Gate

Status: **PLAY READINESS FOUNDATION BUILT / SUBMISSION NOT YET AUTHORIZED**  
Date: **2026-09-27**

WorldzApp's Android packaging foundation targets Android 16 / API 36 and Android App Bundle distribution. This release gate converts Google Play submission requirements into explicit WorldzFullBuild™ checks.

## Already built and proven

- WorldzApp installable PWA core.
- Android Trusted Web Activity packaging foundation.
- compileSdk / targetSdk 36.
- Android App Bundle release target.
- Stage 4B live unsigned simulation proof.
- Stage 5B live WLDZ Squads approval-state proof.
- Stage 5C fail-closed Safe / XRPL / Sui public proof harness.
- app-level signing, execution and mainnet broadcast remain OFF.

## Play submission gates

1. Lock the final Android application ID before the Play app identity becomes permanent.
2. Use only the owner-approved Worldz centre-logo Android icon and maskable assets.
3. Verify the Play developer identity and developer-account requirements.
4. Complete Play App Signing without committing signing secrets to source control.
5. publish Digital Asset Links using the actual Play App Signing SHA-256 certificate fingerprint.
6. publish a first-party privacy policy after the final production data-flow audit.
7. complete Data safety from the exact production behavior, including third-party SDK/provider behavior.
8. complete the Financial features declaration from the exact submitted feature set.
9. complete ads, target-audience, content-rating and app-access declarations.
10. provide durable reviewer access if any submitted functionality is restricted.
11. meet the applicable internal/closed testing requirements for the developer account.
12. complete Android device, accessibility, link, offline/fallback and wallet-handoff QA.
13. create truthful store listing screenshots and text from the exact submitted build.
14. build and sign the AAB, then perform final human release authorization.

## Crypto/non-custodial rule

WorldzApp currently connects to external wallets without collecting seed phrases or private keys. The Financial features declaration is still required. The exact selections and distribution jurisdictions must be rechecked against current Google Play requirements immediately before submission.

## Account deletion rule

The current WorldzApp core does not create a Worldz-hosted consumer account. If account creation is enabled in a submitted release, account-deletion requirements become a release gate: an in-app request path plus the required external web resource must exist before submission.

## Truth rule

Passing this repository gate means the Play submission architecture is prepared. It does **not** mean Google has approved the app. Only Google Play review can grant store approval.
