# Worldz Confidence Curve™ + Confidence Pulse™

Status: DESIGN / DEVNET REQUIRED / MAINNET DISABLED

This document defines a proposed WorldzLaunchPad™ launch model for genuine price discovery and evidence-backed market confidence. It is not a price-support system and must never manufacture volume, guarantee appreciation, or trade against users to make a chart look healthy.

## 1. Product names

- **Worldz Confidence Curve™** — the launch path.
- **Worldz Confidence Pulse™** — live market-quality telemetry.
- **Worldz Confidence Constellation™** — independent positive evidence markers shown to users.
- **Worldz Trust Orbit™** — the wider proof passport containing the Six Proof Rings.

The products are separate:
- Confidence Curve creates/bootstrap a market.
- Confidence Pulse measures what genuinely happens.
- Confidence Constellation presents independently verified positive evidence.
- Trust Orbit preserves the full evidence, including negative and unknown states.

## 2. Solana launch primitive

Preferred first implementation candidate: **Meteora Dynamic Bonding Curve (DBC)**.

DBC uses a virtual bonding curve for token price discovery and can migrate/graduates into Meteora DAMM v1/v2 once the configured minimum quote threshold is reached.

Worldz requirements remain stricter than the underlying launch primitive:

1. Fixed token supply.
2. Mint full genesis supply once.
3. Revoke mint authority.
4. Revoke freeze authority.
5. Public tagged allocation manifest.
6. No wallet-transfer tax.
7. No sell blacklist / honeypot / hidden private allocation.
8. Creator/team limits must satisfy the current Worldz Safe Launch Standard.
9. WorldzLaunchPad receives only 10% of collected supported project trading-fee revenue; it takes 0% token supply and 0% initial liquidity.
10. Creator-controlled post-graduation LP must be locked under the applicable Worldz launch policy.

No public mainnet route may be enabled until the adapter, fee route, liquidity migration, locks, authority state and Treasury route are proven end-to-end.

## 3. Real quote capital, not fake liquidity

"Virtual liquidity" or a virtual curve is a pricing/bootstrap mechanism. It must never be marketed as if the same amount of real quote capital is sitting in an LP.

The UI must separately show:

- **Virtual Curve Liquidity** — model/curve state.
- **Real Quote Collected** — actual SOL/quote deposited by market participants.
- **Graduation Quote Threshold** — actual quote required for migration.
- **Graduated Real LP** — actual token + quote liquidity after migration.

The distinction is compulsory.

## 4. Confidence-backed market display

Raw market cap is always displayed as raw market cap.

Worldz does not invent a second fake market cap. Instead, a market cap can earn independent evidence markers only when genuine market activity supports it.

### Matched Organic Volume

For a 24-hour window:

```
Matched Organic Volume
= 2 × min(organic buy volume, organic sell volume)
```

For Solana, Jupiter Tokens V2 organic-volume fields are an approved external signal when available.

The metric intentionally values two-sided organic participation. A one-sided burst of buys or sells cannot masquerade as deep two-sided activity.

### Matched Organic Turnover

```
Matched Organic Turnover %
= Matched Organic Volume / circulating market cap × 100
```

It is shown as evidence, not as a guaranteed price-strength score.

Worldz-controlled wallets, team wallets, Treasury automation and deliberate self-trading must never be used to manufacture this metric. Where an external source classifies organic activity, Worldz presents that classification transparently.

## 5. Worldz Confidence Constellation™

No single opaque "safe score" is permitted. Each star is independent.

### ⭐ Market Confidence
Evidence:
- circulating market cap;
- matched organic buy/sell volume;
- matched organic turnover;
- genuine organic buyers;
- Jupiter Organic Score / label when available.

A high market cap alone never earns this star.

### ⭐ Liquidity Confidence
Evidence:
- real quote liquidity;
- quote/token depth;
- simulated buy and sell price impact;
- post-graduation LP proof;
- LP lock proof.

Nominal liquidity alone is insufficient if modest trades cause extreme slippage.

### ⭐ Holder Confidence
Target standard for the strongest Worldz badge:
- no untagged, non-system wallet above **5%** of circulating supply;
- top-holder concentration always displayed;
- linked/related wallets aggregated where evidence supports the linkage.

Worldz may use stricter project-specific limits. Raw chain distribution remains visible even when system wallets are classified separately.

### ⭐ Dev Confidence
Target for the strongest marker:
- dev personal/liquid wallet **≤2%** of circulating supply;
- any larger developer allocation must live in a separately tagged vesting/treasury account and is not disguised as a personal wallet.

This marker does not alter the broader Worldz Safe Launch creator/team allocation cap.

### ⭐ Team Confidence
Target:
- total unlocked team holdings **≤5%** at genesis;
- remaining approved team allocation uses enforceable vesting;
- minimum public Worldz standard remains at least a 90-day cliff and 18-month vesting; projects can voluntarily exceed it.

### ⭐ Treasury Confidence
A large Treasury balance may be excluded from **adjusted circulating concentration** only when all conditions hold:
- publicly tagged as Treasury;
- controlled by verified multisig;
- disclosed balance;
- classified non-circulating;
- no hidden market trading;
- movements are auditable;
- any amount transferred into circulating/market wallets is immediately reclassified.

The raw Treasury balance is never hidden.

### ⭐ Authority Confidence
Requires:
- mint authority revoked;
- freeze authority revoked/absent;
- exact fixed supply verified on-chain.

### ⭐ Market Identity Confidence
External/current signals may include:
- Jupiter token record;
- VRFD status;
- Jupiter Organic Score;
- reliable price availability.

External verification never becomes a Worldz or Jupiter guarantee.

## 6. Confidence Pulse telemetry

Worldz Confidence Pulse v1 records, where available:

- raw market cap;
- real liquidity;
- organic buy volume;
- organic sell volume;
- matched organic volume;
- matched organic turnover;
- two-sided organic balance;
- organic buyer count;
- organic share of total volume;
- Jupiter Organic Score and label;
- top-holder percentage;
- dev-balance percentage;
- authority state;
- Worldz launch proof state.

The current Trust Orbit backend exposes these metrics as `WORLDZ-CONFIDENCE-PULSE-1`.

## 7. Anti-manipulation rule

The following activity must not be treated as evidence of organic confidence:

- wash trades;
- self-trading between linked wallets;
- platform-generated volume;
- Treasury loops;
- AUTO trades whose purpose is to create volume or a chart pattern;
- coordinated transactions intended to fake holder count;
- hidden market-maker wallets presented as retail participants.

AUTO may execute separately approved treasury/liquidity operations, but those operations must be tagged and excluded from Worldz's own confidence claims where possible.

There is **no programmed 5%, 10%, hourly, daily or monthly price-rise target** in Confidence Curve.

## 8. Fair-start controls

Supported launch routes may add anti-bot/fair-start controls that do not trap sellers, such as:
- transaction simulation;
- initial purchase caps at the launch venue;
- Meteora Alpha Vault or equivalent anti-bot primitive where compatible;
- tagged creator initial buy;
- no preferential private creator price;
- public curve and graduation parameters before signing.

There is no sell lock for ordinary public buyers.

## 9. Graduation

Underlying technical graduation follows the selected chain-native launch primitive.

For Meteora DBC, graduation/migration occurs according to its configured quote threshold and migration configuration.

A separate **Worldz Confidence Graduation™** label is awarded only after Worldz can prove the required evidence set. Technical pool graduation must never be falsely described as proof that the market is healthy.

## 10. Worldz Trust Orbit relationship

Confidence Pulse feeds the existing **Organic Market Ring**, **Distribution Ring**, **Authority Ring**, and **Locks & Control Ring**.

Trust Orbit remains the source of truth.

A positive Confidence marker can disappear later if a time-varying condition changes. Immutable proofs, such as revoked mint authority, remain permanent.

## 11. Development sequence

1. Backtest Confidence Pulse metrics against established and newly launched Solana tokens.
2. Establish evidence thresholds using observed distributions rather than arbitrary marketing numbers.
3. Build a Devnet Confidence Curve using Meteora DBC.
4. Prove exact real-quote accounting and migration.
5. Prove LP ownership/lock.
6. Prove platform 10% fee-only routing.
7. Integrate tagged system-wallet circulation accounting.
8. Add Trust Orbit historical snapshots / Confidence Timeline.
9. Security review and adversarial/wash-trade simulations.
10. Mainnet remains fail-closed until every applicable Worldz release gate passes.

## 12. Core promise

**Worldz Confidence Curve™ does not promise the price will rise. It makes genuine confidence harder to fake and easier to see.**
