# WorldzApp™ Stage 5C — Live Multisig Proof Runbook

Status: **HARNESS BUILT / WORLDZ SAFE-XRPL-SUI PROFILES REQUIRED**

Stage 5C proves public multisig configuration and approval evidence. It never submits an approval, requests a signature, executes a transaction or broadcasts.

## Already proven

- Solana / Squads v4 — WLDZ operational profile — Stage 5B PASS.
- Approval submission: OFF.
- Signing: OFF.
- Execution: OFF.
- Broadcast: OFF.

## Safe proof gate

Required public configuration:

- `WORLDZ_SAFE_ADDRESS`
- `WORLDZ_SAFE_TX_HASH`
- `WORLDZ_SAFE_TX_SERVICE_URL`
- optional `WORLDZ_SAFE_API_KEY` supplied only as a secret if the selected service requires it

Proof reads:

1. Safe account status;
2. owner list;
3. threshold;
4. selected Safe transaction record and its Safe address;
5. reject evidence unless that transaction belongs to the configured Worldz Safe;
6. selected Safe transaction confirmation list;
7. normalize through the Worldz Stage 5 count-threshold adapter.

Do not create a Safe solely to make CI green. The address must belong to an approved Worldz treasury profile.

## XRPL proof gate

Required public configuration:

- `WORLDZ_XRPL_RPC_URL` — environment/secret configured; HTTPS required
- `WORLDZ_XRPL_MULTISIG_ACCOUNT`
- `WORLDZ_XRPL_TX_HASH`

Proof reads:

1. validated `account_info` with signer lists;
2. exactly one SignerList;
3. SignerQuorum;
4. SignerEntries and weights;
5. require the proof transaction to be validated;
6. require the proof transaction Account to equal the configured Worldz multisig account;
7. read public transaction Signers;
8. normalize through the Worldz Stage 5 weighted-quorum adapter.

Do not create or modify a SignerList merely to satisfy this check.

## Sui proof gate

Required public configuration:

- `WORLDZ_SUI_MULTISIG_ADDRESS`
- `WORLDZ_SUI_MULTISIG_CONFIG_JSON`
- `WORLDZ_SUI_PROOF_TX_DIGEST`

Sui native multisig is a weighted key configuration, not a Safe-style on-chain owner contract. Worldz must first approve and publish the intended public multisig configuration. The proof layer must verify the address/configuration relationship using the current Sui SDK/tooling before the profile can become LIVE, then bind known public transaction evidence to that profile.

Until that verification is implemented and run against an approved Worldz Sui profile, Sui remains `WORLDZ_PROFILE_REQUIRED`.

## Release rule

The Stage 5C live profile gate passes only when all required Worldz profiles have explicit public identifiers and verifiable public evidence.

A third-party example, documentation sample, fixture or unrelated multisig does not count as Worldz proof.

Android packaging remains downstream of this gate. The existing PWA is preserved as the application core that will later be packaged.
