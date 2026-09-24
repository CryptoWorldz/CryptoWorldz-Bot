# REVIVE WorldzParTy Devnet Proof

Disposable Solana devnet proof harness for REVIVE's MagicFeeNumber™ + Legacy Flywheel™ architecture.

**Safety boundary:** this harness never uses the canonical mainnet RVIV mint. Network-executing scripts reject a mainnet RPC URL. Nothing in this directory authorizes mainnet execution.

## Proof levels

### Level 1 — deterministic / compile proof

Runs on every PR and push without moving tokens or SOL:

- Meteora DBC SDK 1.5.12 accepts the fixed **75-bps** curve definition with dynamic fee OFF.
- Creator / partner DBC split encodes **51 / 49**.
- Partner router reconciles exactly as **170 Referrer / 150 Legacy / 85 Worldz / 85 Impact = 490**.
- The Legacy bucket expands to **10 × weight 15**, one route per verified legacy mint.
- Six-hour accounting is exactly **21,600 seconds**.
- HODLer entitlement math is **50% equal + 50% integer-square-root weighting** using the minimum of the start/end balances.
- Project/system/distribution/reward/liquidity wallets are excluded from the live-holder scan input.
- The minimal Rust Legacy payout program compile-checks and requires the matching router authority signature.
- Ten Legacy vault PDAs derive uniquely for the devnet namespace.

Level 1 is **not** proof that a devnet transaction happened.

### Level 2 — DBC on-chain devnet proof

The push-only Stage A job must create a disposable Meteora DBC config, mint and pool on Solana devnet. The verifier then independently decodes the on-chain `PoolConfig` and pool through Meteora's state service and checks:

- actual DBC base-fee numerator = **75 bps**;
- dynamic fee = **OFF**;
- quote-fee collection mode;
- creator trading-fee percentage = **51%**;
- migration option = **DAMM v2**;
- migrated-pool target fee = **75 bps** with dynamic fee OFF;
- claimable migrated liquidity = **0%**;
- configured permanent-lock split = **60% Creator + 40% Partner = 100%**;
- pool → config and pool → base-mint relationships;
- confirmed clean creation transaction.

Evidence:
- `artifacts/revive-dbc-devnet-proof.json`
- `artifacts/revive-dbc-devnet-verified.json`

Level 2 proves the **stored DBC configuration**, not a completed DAMM v2 migration.

### Level 3 — live Legacy boundary proof

The read-only Legacy scanner queries all ten canonical legacy mints, aggregates token accounts by owner, applies the published minimums and removes known Worldz project/distribution wallets.

A single snapshot is only **one boundary**. A completed six-hour HODLer epoch requires another independently captured boundary at least 21,600 seconds later.

Evidence:
- `artifacts/legacy-live-boundary-snapshot.json`

### Level 4 — router execution + DAMM v2 migration proof

Still required before mainnet approval:

- deploy the Legacy payout program to devnet and record its real program ID;
- fund all ten program-controlled SOL vaults;
- execute test Creator / Referrer / Legacy / Worldz / Impact routing and reconcile receipts;
- complete a DBC → DAMM v2 graduation;
- inspect the migrated DAMM v2 pool;
- prove the actual post-migration permanent-lock accounts / positions;
- prove **0% claimable migrated LP and 100% permanently locked migrated LP** on-chain.

Only Level 4 can close the permanent-liquidity execution gate.

## Secrets and artifacts

Disposable payer/config/base-mint secret material is written only under `.runtime/`, which is gitignored and never uploaded as an artifact. Public proof artifacts contain addresses, configuration and transaction evidence only.

## Current release rule

**Static green ≠ devnet green. Devnet config green ≠ migration green. No mainnet execution until all required proof levels pass and the owner explicitly approves the final transaction.**
