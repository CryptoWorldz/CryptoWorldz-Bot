# WorldzAutoInvest™ + WealthBuild™ Standard

Status: **CODE FOUNDATION / USER-SELF-DIRECTED / MAINNET ADAPTER NOT RELEASED**  
Date: **2026-09-27**

## Product split

**WorldzAutoInvest™** is the public buy-only automation engine.

**WealthBuild™** is the Command Centre MAX™ user interface for creating, reviewing, cancelling and proving an AutoInvest plan.

The names describe automation and planning. They do not promise profit, wealth creation, price appreciation, yield or investment performance.

## Separation from owner AUTO

The existing owner-only AUTO/DCA and WorldzAUTO Buy-Only™ launch-bootstrap controls remain separate.

Public AutoInvest:
- never receives the owner AUTO wallet, signer, keys, budgets or privileged endpoints;
- never receives treasury authority;
- never inherits an owner allowlist as a recommendation list;
- never creates market activity for a Worldz token merely because the platform launched it.

A user's plan is owned by that user and bound to that user's wallet.

## Self-directed only

WorldzAutoInvest™ does not choose a token for the user, rank tokens as investments, predict returns or decide how much the user should invest.

The user must select:
- wallet;
- buy asset / canonical mint;
- input asset;
- amount per purchase;
- cadence;
- number of purchases or total budget;
- slippage / price-impact limits where the provider exposes them;
- start and cancellation choices.

The UI must show:
- total planned spend;
- schedule;
- asset identity;
- provider/router;
- fees when known;
- risk acknowledgement;
- cancellation behavior;
- execution state.

## Buy-only rule

AutoInvest is **BUY ONLY**.

Denied:
- automated SELL;
- automatic take-profit or stop-loss;
- buy/sell loops;
- wash trading or self-trading;
- randomised multi-wallet activity;
- holder/maker/volume fabrication;
- provider-score or trending manipulation;
- hidden token substitution.

Selling remains a separate user-directed wallet action outside AutoInvest unless a future separately reviewed product explicitly adds it.

## Non-custodial architecture

Preferred public architecture:

**Command Centre MAX™ / WealthBuild™ → provider recurring-order adapter → user's external wallet approval → provider/on-chain recurring order → WorldzProof™ observations**

Worldz should not custody seed phrases or private keys.

The first Solana adapter target is Jupiter Recurring/DCA functionality. Jupiter currently exposes recurring orders to users. Provider behavior, supported assets, intervals, fees, cancellation and execution conditions must be read from the current provider integration instead of guessed.

Provider-specific rule: if the provider does not support pause/resume, WealthBuild must present **Cancel / Recreate**, not fake pause controls.

## Default state

Public AutoInvest defaults to:
- **PLAN_ONLY** before wallet connection;
- **REVIEW_REQUIRED** after a valid plan is built;
- **AWAITING_USER_SIGNATURE** before provider order creation;
- never server-auto-signing for the user.

Worldz servers do not hold a retail user's signing key.

## Required plan bindings

Each plan binds:
- user identity/session reference;
- external wallet address;
- chain;
- exact canonical output mint;
- input mint/currency;
- amount per purchase;
- cadence;
- occurrence count or end condition;
- maximum total spend;
- provider/router;
- slippage/price-impact limits when available;
- fee disclosure when available;
- unique plan ID / idempotency key;
- creation timestamp;
- order transaction / provider order ID after signature;
- cancellation state;
- WorldzProof™ records.

## Safety and best-practice gates

Before public mainnet release:
1. Independent member authentication boundary.
2. No owner/executive AUTO authority reuse.
3. No seed/private-key custody.
4. Canonical token identity verification.
5. Clear warnings for unverified / high-risk assets from available provider data.
6. Fresh provider quote/order data before signing.
7. Exact total planned spend shown before approval.
8. User-controlled cancel path.
9. Duplicate-order prevention.
10. Per-user rate limiting.
11. Audit log without secret material.
12. Security review of provider adapter.
13. Privacy/data-retention review.
14. Jurisdiction/compliance review before broad public financial-product distribution.
15. WorldzProof™ receipt for order creation/cancellation observations.

## Market-integrity rule

Public AutoInvest is for genuine self-directed accumulation.

Automated user purchases are never labelled as "organic" by Worldz merely because they are external user orders. Worldz does not coordinate users to manipulate DEX Screener, Jupiter Organic Score, trending systems, holder counts, makers or volume.

## WealthBuild™ Command Centre experience

Minimum screens:
1. **Choose** — user selects chain/token/input asset.
2. **Build** — amount, cadence, occurrences/total budget.
3. **Safety** — identity/risk/fee/provider disclosures.
4. **Review** — exact plan and maximum spend.
5. **Sign** — external wallet/provider order approval.
6. **Track** — executions, spend, received amount, next scheduled event.
7. **Cancel** — stop future purchases using the provider-supported cancellation path.
8. **Proof** — signatures/order IDs and WorldzProof™ evidence.

## Initial public scope

Solana first:
- external Solana wallet;
- SOL or USDC input where the chosen provider supports it;
- canonical SPL token output;
- Jupiter recurring-order adapter target;
- buy-only;
- no leverage;
- no borrowing;
- no perps;
- no yield promise;
- no auto-sell.

Other chains require their own adapter and release gate.

## Truth state

The specification, validator and Command Centre surface can be CODE_BUILT while public value-moving execution remains OFF.

Do not label AutoInvest as live until the provider adapter, user wallet flow, cancellation flow, security gates and production verification have passed.
