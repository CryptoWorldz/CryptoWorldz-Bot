# WorldzAUTO Buy-Only™ Standard

Status: **CODE/SPEC FOUNDATION — MAINNET EXECUTION OFF BY DEFAULT**  
Date: **2026-09-27**

## Purpose

WorldzAUTO Buy-Only™ is a reusable WorldzLaunchPad™ execution mode for a legitimate launch bootstrap buy or explicitly approved treasury acquisition.

It is **BUY ONLY**. The AUTO module must never turn this mode into an automatic sell, round-trip trader, wash-volume engine, holder-fragmentation system, or external-score gaming mechanism.

## Provider truth

- DEX Screener documents automatic listing after a token has a liquidity pool and at least one transaction.
- Jupiter Organic Score is an observed post-launch signal built from genuine/organic activity and normalized against the wider ecosystem. Fresh-token scores can be volatile.
- Therefore one legitimate launch buy may satisfy the transaction needed for DEX Screener indexability, but no AUTO buy may be advertised as creating, guaranteeing, or improving a Jupiter Organic Score.

Provider behavior is observed, not controlled by Worldz.

## Default execution state

WorldzAUTO Buy-Only™ defaults to **PREPARE_ONLY / DISARMED**.

Allowed:
- observe the canonical mint, pool, route and quote;
- calculate the exact input amount inside an approved budget;
- build the proposed BUY transaction;
- simulate and show a readable transaction review;
- wait for the required external wallet or multisig approval;
- after signature, confirm and reconcile the result;
- verify the resulting pair/indexer state and create WorldzProof™.

Denied:
- SELL;
- automatic buy-then-sell or sell-then-buy loops;
- self-trading;
- repeated buys whose purpose is volume, maker-count, holder-count, trending or Organic Score manipulation;
- wallet splitting or fabricated holder activity;
- silent budget increases;
- silent slippage or price-impact limit increases;
- arbitrary mint/pair substitution;
- duplicate execution after a confirmed one-shot buy.

## Launch Bootstrap mode

For a newly launched token, the safest reusable default is **ONE_SHOT_BUY**:

1. Canonical identity and metadata gate passes.
2. Expected pool/curve exists and matches the launch registry.
3. AUTO obtains a fresh executable BUY quote.
4. Exact spend is bounded by the token-specific approved budget.
5. Slippage, price impact, priority/network fees and minimum received amount are shown before signing.
6. Transaction simulation must pass.
7. The externally controlled wallet or multisig approves/signs.
8. The transaction is broadcast once.
9. Confirmation and pre/post balances are reconciled.
10. The one-shot intent is permanently marked completed for that launch instance.
11. DEX Screener/Jupiter observations are re-read; provider latency remains PENDING rather than being treated as failure or success without evidence.

A retry is only permitted when the previous attempt is proven unconfirmed/failed and the idempotency key has not been consumed by a confirmed transaction.

## MRCL inheritance

MIRACLE ($MRCL) inherits WorldzAUTO Buy-Only™ for its approved genesis path.

Current owner-approved launch target:
- DBC launch allocation: **17,400,000 MRCL / 5%**;
- creator first-buy target: **AUD $200 equivalent in real SOL**;
- exact SOL is bound from live pricing at transaction review time;
- the first buy is a real market transaction, not virtual liquidity;
- AUTO prepares the BUY-only transaction but does not bypass wallet/multisig approval;
- successful first buy may provide the first real transaction needed for DEX Screener automatic listing, subject to DEX Screener indexing;
- no Jupiter Organic Score or label is promised at launch.

## Required safety controls

Every BUY intent must bind:
- canonical chain and mint;
- canonical expected pool/curve or approved router;
- quote asset and exact maximum spend;
- minimum amount received;
- explicit maximum slippage;
- explicit maximum acceptable price impact;
- explicit maximum network/priority fee;
- quote timestamp / expiry;
- destination wallet;
- launch/treasury purpose;
- unique idempotency key;
- simulation result;
- human-readable transaction summary;
- required signer/multisig policy.

If a required bound is absent, stale, mismatched, or exceeded: **FAIL CLOSED**.

## Circuit breakers

AUTO Buy-Only halts on:
- mint or pool mismatch;
- stale quote;
- failed simulation;
- budget breach;
- slippage/price-impact/fee breach;
- insufficient real liquidity;
- transaction ambiguity;
- duplicate/unknown signature state;
- provider route unexpectedly changing the output token;
- unexpected token extension/transfer-fee behavior;
- any attempt to invoke SELL while Buy-Only mode is active.

## Market-integrity rule

AUTO exists to execute an approved purchase safely, not to manufacture market activity.

Worldz must never describe automated activity as organic. Genuine users decide independently whether to buy, sell, hold, or ignore a token.

## Proof output

Each completed Buy-Only action records:
- intent ID;
- canonical mint;
- pair/pool;
- route;
- quoted and actual input/output;
- slippage/price-impact limits;
- transaction signature;
- confirmation state;
- pre/post balances;
- DEX Screener observation;
- Jupiter observation;
- timestamp;
- WorldzProof™ receipt.

## Reusable WorldzLaunchPad rule

WorldzAUTO Buy-Only™ becomes a reusable feature for eligible launches, but it is **not automatically armed** merely because a token is created. Token-specific funding authority, budget, signer policy and execution limits are required before mainnet value movement.
