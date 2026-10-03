# Worldz Token DNA Engine™ v1

**Date:** 4 October 2026  
**Status:** DESIGN LOCKED — IMPLEMENTATION / MAINNET EXECUTION GATED  
**Machine policy:** `worldzpad-mainnet/tokenomics/worldz-token-dna.v1.json`

## Decision

WorldzLaunchPad is not just a token minting page.

The product direction is now:

> **Worldz helps a creator design a token economy, understand it, simulate it, prove it and only then launch it.**

This work inherits the Worldz Safe Launch Standard, Worldz Fee Flow V3, WorldzFullScope chain-native adapters and WorldzProof. It does not loosen those controls.

## Research rule

The design is based on recurring mechanics seen in major crypto networks and protocols:

1. **Real demand beats artificial scarcity.**
2. **Network/product activity should create token utility or value capture where appropriate.**
3. **Supply credibility matters:** fixed/max supply, emissions, burns and mint authority must be explicit.
4. **Unlocks are part of market structure:** day-0 float alone is not enough.
5. **Liquidity is tokenomics:** a token must have a real buy and sell path with disclosed depth and LP protection.
6. **Distribution matters:** hidden insider concentration and surprise unlocks are unacceptable.
7. **Utility must name a real function:** fees, access, staking/security, settlement, collateral, rewards or product use.
8. **Burns are not magic:** a burn is strongest when it is connected to real activity and verifiable onchain.
9. **No guaranteed-value story:** Worldz does not promise price appreciation, yield or a future ranking.
10. **Proof over claims:** a lock, vest, burn, treasury route or cross-chain supply claim is not complete until it can be proven.

## Create Your Own Money™ — three levels

### 1. BEGINNER

**Make Your Own Money — Beginner**

For somebody creating a token for the first time.

Worldz explains each decision in plain English, asks what the token is *for* before asking for economics, and keeps advanced controls hidden.

The user gets:

- purpose-first wizard;
- simple Community/Meme, Utility, Impact and Creator starting presets;
- fixed-supply safe defaults;
- visual allocation and wallet/vault explanation;
- day-0 / day-30 / day-90 / year-1 / year-2 supply timeline;
- explanations of liquidity, vesting, treasury, fees and FDV;
- simulation before signature;
- readable launch review;
- WorldzProof after confirmed actions.

The Beginner flow cannot bypass the Safe Launch Standard.

### 2. INTERMEDIATE

**Make Your Own Money — Intermediate**

For the everyday crypto user who already has a token idea.

Adds:

- allocation editor inside Worldz limits;
- cliff + vesting editor;
- quote asset and chain selection;
- Worldz Flash / Curve / Curve Pro selection where supported;
- Fair Fee Builder;
- BUILD / GROW / BOOST Worldz contribution selection;
- liquidity and graduation targets;
- concentration and unlock-pressure warnings;
- creator/referrer economics;
- full launch-manifest preview.

The Intermediate flow still cannot bypass the Safe Launch Standard.

### 3. ADVANCED

**Make Your Own Money — ADVANCED: Worldz Leaders**

For serious builders and future Worldz ecosystem leaders.

Adds professional controls:

- custom Token DNA;
- supported Meteora DBC curve and fee-scheduler configuration;
- all eight WorldzFullScope chain adapters as each becomes verified;
- advanced vesting and multisig topology;
- disclosed project-side revenue routing;
- cross-chain supply planning;
- WorldzConnect routing;
- payment/card compatibility planning;
- machine-readable manifest export;
- complete WorldzProof/security checklist.

Advanced does **not** mean unsafe. Hidden blacklists, honeypots, undisclosed mint authority and hidden discounts remain prohibited. Permanent Delegate-style global authority is off by default and requires a separately reviewed use case.

## Token DNA review

Every launch should show more than name, ticker and total supply.

Worldz Token DNA displays:

- real circulating float;
- market-cap / FDV context;
- next 30 / 90 / 365-day unlocks;
- founder liquid percentage;
- top-wallet concentration;
- liquidity allocation and depth;
- LP lock/protection;
- named sources of real token demand;
- activity-linked value capture;
- treasury governance;
- buy and sell path proof;
- cross-chain supply invariant;
- privileged authorities.

## The four Worldz tokens

### #001 WORLDZ (WLDZ)

**Keep the canonical 100M token. Do not remint it.**

Its improvement path is **utility and demand**, not a replacement supply:

- preserve fixed supply and revoked mint/freeze authority;
- preserve 0% wallet transfer tax;
- use Worldz ecosystem utility/access where technically and legally appropriate;
- preserve the Fee Flow V3 core-family market-buy lane only when executable with real market-data and price-impact checks;
- add cross-chain identity without silently creating extra global supply;
- publish WorldzProof for liquidity, fee routing and treasury actions.

### #002 REVIVE (RVIV)

**Keep the canonical 200M token. Do not remint it.**

- preserve fixed supply and revoked authorities;
- preserve the real existing venue economics where already deployed/immutable;
- do not confuse the historical 75-bps/MagicFee adapter with economics for new WorldzLaunchPad intakes;
- make REVIVE/Legacy utility and community use the demand story rather than new inflation;
- retain core-family market-buy eligibility under Fee Flow V3;
- prove distributions, claims, locks and cross-chain representations.

### #003 PHENIX (PNEX)

The current 250M prelaunch structure is stronger than a low-float/high-FDV launch and does **not** need to be thrown away.

Preserve:

- 10% PHENIX Chance immediate;
- 15% Chance vested over 12 months;
- 45% liquidity, including 5% genesis target + 40% staged reserve;
- 10% developer, 0% immediate, 90-day cliff + 24 months;
- 1% Purple Diamond Handz;
- 19% PHENIX Total Supply FlyWheel.

Before mint:

- publish the complete real-float timeline;
- bind staged liquidity and FlyWheel releases to proof;
- keep ProofBurn approval/activity driven rather than marketing-driven;
- define concrete PNEX utility;
- display unlock-to-liquidity pressure before signature.

### #004 MIRACLE (MRCL)

Preserve the committed 46%:

- 20% Miracle Team Vault;
- 20% MiracleMagicSupply;
- 5% genesis liquidity;
- 1% Purple Diamond Handz.

**Do not invent the remaining 54% / 187.92M MRCL.**

Before mint, all remaining supply must have disclosed destinations and timelines. No surprise unlock and no hidden insider allocation.

The Team Vault remains separate from the Worldz Miracle Team Treasury revenue lane. Treasury routing remains gated until the 4-of-7 signer structure is actually proven.

## Worldz Layer 1 + Layer 1.5 + 8

The Token DNA Engine is deliberately portable into the future architecture.

### Layer 1 — Worldz Chain

Future research/specification target.

The chain should natively understand:

- Token DNA registry;
- fixed/max supply;
- vesting and locks;
- fee routing;
- liquidity/market adapters;
- staking/security if chosen by the final consensus model;
- treasury multisig registry;
- WorldzProof;
- privileged-authority disclosure.

**Native-asset decision remains open.** The WDC concept remains separate from the existing WLDZ/RVIV/PNEX/MRCL family until an explicit later decision. Building the chain must not silently replace WLDZ.

### Layer 1.5 — WorldzConnect

WorldzConnect becomes the coordination layer for:

- chain abstraction;
- asset identity;
- cross-chain messaging;
- global supply accounting;
- bridge / NTT / OFT-style adapters after independent security review;
- gas abstraction;
- routing;
- payment settlement;
- Worldz Card orchestration;
- proof/reconciliation.

Hard rule: a wrapped or bridged token is never described as native, and a multi-chain token is never described as one fungible supply unless the mint/burn/escrow model and global supply invariant are auditable.

### +8 WorldzFullScope rails

1. Solana / SolWorldz
2. Ethereum / EthWorldz
3. Base / BaseWorldz
4. BNB Chain / BNBWorldz
5. Robinhood Chain / RobinWorldz
6. HyperEVM / HyperWorldz
7. XRP Ledger / XRPWorldz
8. Sui / SuiWorldz

Every rail keeps an independent mainnet release gate.

## Worldz Card™

The architecture should assume normal merchants should **not** have to understand or hold WLDZ/RVIV/PNEX/MRCL.

Target flow:

```
User asset
   ↓
User-approved quote / conversion
   ↓
Compliant settlement asset
   ↓
Licensed card/payment partner
   ↓
Visa/Mastercard-style merchant rail
   ↓
Ordinary merchant settlement
```

Worldz tokens may later provide optional ecosystem utility, access, rewards, fee benefits or routing, but the merchant-facing settlement layer should remain simple.

## X Money / X Payments

Keep an adapter slot, not a fake integration.

As of 4 October 2026, Worldz has not verified a public X Money payment API suitable for third-party money movement.

Therefore:

- X social APIs stay separate from payment custody/movement;
- WorldzPay / WorldzConnect should expose a provider-adapter interface;
- an `X_MONEY` adapter stays disabled until a supported API/partnership and legal route exist;
- no X Money partnership claim is allowed without evidence.

## Product outcome

The WorldzLaunchPad pitch becomes:

> **Your Idea. Your Token. Your Economy.**
>
> Beginner teaches you. Intermediate lets you build it. Advanced lets Worldz Leaders engineer it.
>
> Every level still ends with the same rule: **Understand → Simulate → Sign → Prove.**

