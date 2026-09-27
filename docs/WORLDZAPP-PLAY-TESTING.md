# WorldzApp™ — Google Play Testing Runbook

Status: **test plan built; execution awaits the final release-equivalent Android binary.**

## Release candidate acceptance

A candidate does not enter Play testing unless:

- API 36 Android checks pass;
- the exact final owner-approved WorldzApp logo binaries match their locked checksums;
- the AAB passes archive integrity checks;
- an upload-signed candidate passes `jarsigner -verify`;
- signing secrets exist only in protected runtime secrets, never in source;
- transaction signing/execution/mainnet broadcast remain disabled unless a later separately approved release changes that boundary;
- privacy/support URLs and declarations match the candidate.

## Device QA

Run on at least one real Android phone before Play submission, then extend across the devices required by the selected testing track.

Check launch, return-from-background, back navigation, external-wallet handoff, network loss/recovery, deep links, privacy/support, font scaling, TalkBack/focus order, touch targets, rotation and dark-theme contrast.

## Wallet/security QA

The reviewer must be able to inspect the public app without an account, wallet or payment. Connecting a wallet must never request a seed phrase, recovery phrase, private key or wallet unlock password.

Simulation, multisig evidence and transaction authority must remain visibly distinct.

## Screenshot capture

Capture the store screenshots only after the final release-equivalent build passes QA. See `apps/worldzapp-android/play-screenshot-plan.v1.json`.

No mock screenshot may advertise a roadmap capability as live.
