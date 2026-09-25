# BitWorldz™ Deployment Plan

Status: BUILD READY FOR VALIDATION — NOT DEPLOYED

## Scope

Publish the BitWorldz public research surfaces without enabling any real Bitcoin or mainnet execution:

- https://bitworldz.cryptoworldz.xyz/
- https://launchpad.cryptoworldz.xyz/bitworldz/

The website may go live while BitPair execution remains research/devnet only.

## Locked safety state

The following must stay true before and after website deployment:

- `mainnetExecutionEnabled=false`
- no private keys or seed phrases accepted
- no automatic cross-chain movement
- wrapped or bridged BTC must never be labelled native BTC
- exact BTC asset identity is required before any executable BitPair
- 75 bps is a target gross trader fee only where the selected venue can prove it
- external bridge, DEX and network costs are disclosed separately
- every chain + BTC asset + venue combination has an independent release gate

## Build contents

1. BitWorldz subdomain gateway
2. WorldzLaunchPad BitPair Lab
3. OmniBTC / BTCMesh / BTC Passport / BitProof contracts
4. Eight-chain research matrix
5. Solana mock-BTC Devnet executable proof rail
6. Read-only real-WBTC compatibility probe
7. Deterministic BitWorldz validation and SDK self-test
8. Manual-only production deployment workflow

## Deployment sequence

### Gate 1 — repository validation

Required:

- `python scripts/validate_worldz_bitworldz.py`
- `node worldzpad-omnichain/bitworldz/sdk/self-test.mjs`
- `npm run static-proof` in `worldzpad-devnet/bitworldz`
- GitHub validation workflow green

A failure here blocks deployment.

### Gate 2 — public-host prerequisites

Before running the deployment workflow, confirm:

- DNS for `bitworldz.cryptoworldz.xyz` resolves to the existing Worldz web host.
- Remote web root `domains/bitworldz.cryptoworldz.xyz/public_html` exists or the FTP account can create it.
- Existing production FTP credentials remain available through the `cryptoworldz-production` GitHub environment.
- `launchpad.cryptoworldz.xyz` remains live.

No secret or credential is committed to the repository.

### Gate 3 — manual website deployment

Run the GitHub Actions workflow:

`Deploy BitWorldz`

It must remain `workflow_dispatch` only.

The workflow publishes only:

- `bitworldz.cryptoworldz.xyz/**`
- `launchpad.cryptoworldz.xyz/bitworldz/**`

It does not deploy the rest of CryptoWorldz, WorldzLaunchPad or the 18-site ecosystem.

### Gate 4 — live verification

Required live checks:

- BitWorldz subdomain returns HTTP 200.
- Page contains `BITWORLDZ`, `Research build` and `Bitcoin gateway` messaging.
- LaunchPad BitPair Lab returns HTTP 200.
- BitPair Lab contains `PRICE THE WORLD`, `Mainnet execution disabled` and the BitProof builder.
- `/bitworldz/app.js` returns HTTP 200.
- no mainnet execution flag has changed.

### Gate 5 — navigation activation

Only after Gate 4 passes:

- add BitWorldz to CryptoWorldz discovery navigation;
- add BitWorldz to WorldzLaunchPad navigation;
- add links from relevant SolWorldz / Bitcoin-facing research surfaces;
- add public sitemap entries.

This prevents live navigation from pointing at a dead route.

## BitPair execution plan after the website is live

### Phase A — Solana Devnet

Mock BTC only:

1. create 8-decimal mock-BTC SPL quote token;
2. revoke mock quote mint authority;
3. create TOKEN/mBTC Meteora DBC BitPair;
4. execute small buy;
5. execute partial sell;
6. inspect creator / partner fee accrual;
7. read reserves and migration progress;
8. create BitProof receipt.

Mock mBTC is not Bitcoin and must never be marketed as Bitcoin-backed.

### Phase B — real-BTC representation compatibility

Read-only first:

- verify exact mint / contract identity;
- verify asset class;
- verify custody / bridge / redemption model;
- verify selected venue accepts the quote asset;
- verify token-program compatibility;
- perform no signer action and no transaction until an independent release gate is approved.

### Phase C — per-chain adapters

Each of the eight Worldz targets is independent:

- Solana
- XRP Ledger
- Ethereum
- Base
- BNB Chain
- Sui
- HyperEVM
- Robinhood Chain

No chain inherits another chain's approval.

### Phase D — future Bitcoin-native lanes

Research independently:

- Stacks / sBTC
- Rootstock / rBTC
- Bitcoin L1 settlement

No direct Bitcoin-L1 launch primitive is assumed.

## Production release rule

A future real BTC-paired mainnet release requires all of the following:

- exact BTC asset identity verified;
- venue compatibility proven;
- buy and sell simulation/testnet receipts;
- fee receipts reconciled;
- liquidity protection proven;
- BitProof produced;
- chain + asset + venue release explicitly approved;
- mainnet execution flag changed in a deliberate reviewed commit.

Website deployment alone does not satisfy these conditions.
