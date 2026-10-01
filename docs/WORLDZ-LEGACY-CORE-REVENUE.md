# Worldz Legacy Core Revenue Share™ — NBC • LMTD • INVEST

Version: `WORLDZ-CORE-LEGACY-REVENUE-2026-10-01-A`

## Locked source design

Eligible **net Worldz-controlled SOL revenue** contributes **15%** to the Legacy Core pool.

The pool is divided equally:

- **5% of eligible net revenue → NBC**
- **5% → LMTD**
- **5% → INVEST**
- **85% remains with the originating Worldz revenue stream** for its existing treasury/operating policy.

Within each token's 5% share:

- **50%** — transparent market buyback allocation
- **25%** — liquidity-growth allocation
- **25%** — holder-reward allocation

That means each token receives, from total eligible net revenue:

- **2.5% buyback**
- **1.25% liquidity growth**
- **1.25% holder rewards**

No market trade is enabled by this source release. Allocations accrue until the required treasury/multisig, token identity, liquidity, market-data and execution gates pass.

## Revenue sources

The policy includes Community Suite Starter Trial, Rent, Rent-to-Own and Own receipts, Community Suite add-ons, custom AI/branding work, Worldz-hosted services/subscriptions, affiliate/partner revenue and the **Worldz-owned platform share** of LaunchPad revenue.

For LaunchPad revenue, this is applied only after the existing creator/referrer/Legacy Flywheel/Worldz/Impact split. It does not reduce those protected allocations.

## Distribution-wallet rule

Historical distribution wallets are explicitly **excluded as funding destinations**.

Known watch-only/history addresses:

- NBC Distribution — `PdABvvq4F7YjwsVRq2CCQeBNZTBq5WfkQvn8VmhRY34`
- LMTD Distribution — `2turuerVWbeDPRZfK2iixzRnrC6zjbAzHo9NZfww6rFn`
- INVEST Distribution — `Hd3cMfHMHQe4j8xfpnbDkWEgDo4gbrH2eimh6vpxjC37`

Each token requires a new dedicated multisig-controlled vault or program-derived revenue vault.

## Recorded identities

- NBC Dev wallet — `3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt`
- NBC mint — **not yet verified in the repository; required before holder rewards or buyback execution**
- LMTD mint — `Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY`
- INVEST mint — `VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC`

## Buyback safety

Revenue-funded buys must use real market data, public receipts, no self-trading/wash trading, estimated price impact no greater than 1%, and at least six hours between automated chunks. If a gate fails, SOL stays accrued rather than forcing a trade.

## Protected exclusions

Do not route customer/pass-through funds, refunds, taxes, external fees, impact donations, liquidity principal, borrowed/investment principal, internal treasury transfers or balances merely sitting in historical distribution wallets.

WorldzApp's existing 50% liquidity / 50% development revenue policy remains untouched.

## Execution status

**SOURCE CONFIGURED — MAINNET ROUTING DISABLED.**

The next live gate is creation/approval of dedicated treasury vaults and verification of the NBC mint. No source file should claim that SOL has been routed until an on-chain receipt proves it.
