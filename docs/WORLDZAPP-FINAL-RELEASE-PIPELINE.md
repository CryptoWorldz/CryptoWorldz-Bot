# WorldzApp™ — Final Android / Google Play Release Pipeline

## Built now

The release pipeline is prepared through the point where Google account identity and protected signing material become mandatory.

The final release workflow is **manual only**. It does not auto-submit to Google Play and cannot run successfully until:

1. final owner-approved icon binaries are present at their checksum-bound paths;
2. the upload keystore and passwords exist as protected workflow secrets;
3. the real Play App Signing SHA-256 certificate fingerprint is supplied;
4. the remaining Play declaration/testing gates are completed.

## Key separation

The **upload key** signs the AAB uploaded to Google Play. The **Play App Signing certificate fingerprint** is used for the Android ↔ website Digital Asset Links association. They must not be silently treated as the same identity.

No keystore, password, private key, seed phrase or Google service-account credential belongs in Git.

## Final AAB job

The manual workflow:

- validates API 36 and release contracts;
- requires the final icon hashes;
- builds the Bubblewrap TWA as an unsigned AAB;
- signs the AAB at runtime with the protected upload keystore;
- verifies the resulting JAR signature;
- renders Digital Asset Links from the real Play App Signing fingerprint;
- creates a release proof containing AAB hash/size and security state;
- uploads the signed candidate and proof as a protected workflow artifact;
- **does not publish or submit the app**.

Google Play submission remains an explicit later human-controlled action.
