# WORLDZ Wallet — Android read-only beta

This Android WebView shell reuses the existing WorldzApp website at https://launchpad.cryptoworldz.xyz/worldz-app/ .

**This is NOT a self-custody wallet.** No wallet creation, recovery phrases, private-key storage, signing, swaps or transfers. Do not deposit assets into it. It is a preview shell only.

## Build
GitHub Actions: `Worldz Wallet Android Beta APK` builds a debug APK and SHA-256 checksum. Download the artifact from a successful run. Debug APKs are for internal testing only, not a public financial-product release.

Local build (JDK 17, Android SDK API 36, Gradle 8.13): `gradle :app:assembleDebug`.

## Security boundaries
HTTPS-only host allowlist for internal navigation; external HTTPS links open outside the app. No JavaScript-to-native bridge, no filesystem access, no WebView DOM storage, no mixed content, no Android backup. No transaction authority. The remote site is independently controlled and must be reviewed before distribution.

## Release gates
- Confirm the live HTTPS page and navigation on a physical Android device.
- Audit redirect handling, third-party content, privacy disclosures and accessibility.
- Perform low-memory and offline/network-failure testing.
- Create and protect a release signing key outside source control.
- Obtain explicit owner approval before any public signed APK or download page.
- Self-custody key generation and trading require separate audited native implementation.
