# WorldzPay™ — 5-Year Payments Strategy

## Phase 1 — Foundation (current build)

WorldzPay is a payment-orchestration layer for Worldz products. It does not custody customer money, does not hold private keys, and does not claim an official relationship with X Money.

The first build provides:

- a provider-neutral payment intent model;
- reserved X Money adapter state that cannot execute until official access exists;
- planned card, bank, SOL, USDC and USDT adapters;
- deterministic idempotent WorldzPay intent IDs;
- settlement previews that connect eligible SOL revenue to the existing Worldz Legacy Core Revenue Share™ ledger;
- hard exclusion of protected funding sources such as token distribution wallets;
- simulation-only controls: no live transfers, no custody and no private-key handling.

## 5-year direction

### Phase 1 — 2026–2027
Build WorldzPay core, payment intents, provider adapters, audit records and WorldzProof integration.

### Phase 2 — 2027–2028
Add approved card/bank/stablecoin providers, merchant checkout, invoices, refunds and Command Centre billing.

### Phase 3 — 2028–2029
Add merchant/community SDKs, creator checkout, referral attribution and multi-chain settlement.

### Phase 4 — 2029–2030
If an official X Money developer or commerce integration becomes available and Worldz is approved, replace the reserved adapter with the official production connector.

### Phase 5 — 2030–2031
Connect WorldzPay to the future Worldz Digital Cash™ architecture while retaining regulated fiat/payment providers as external rails.

## Safety boundary

No provider marked disabled may move funds. X Money remains `RESERVED_OFFICIAL_ACCESS_REQUIRED` until verified official access and legal/compliance requirements are satisfied.
