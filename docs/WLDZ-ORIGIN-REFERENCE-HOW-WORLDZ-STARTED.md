# WLDZ Origin Reference — How WORLDZ #001 Started

**WorldzFullBuild™ classification:** HISTORICAL REFERENCE / ORIGIN RECORD  
**Historical build period:** 7 September 2026  
**Added to WorldzFullBuild™:** 27 September 2026  
**Authority:** Reference only. Current canonical WorldzFullBuild contracts and verified on-chain/live evidence always override this document where later work differs.

## Why this record exists

This document preserves the engineering path that produced the early WORLDZ ($WLDZ) architecture. It is intentionally retained so future WorldzLaunchPad™ work can reuse the reasoning, proof discipline and regression lessons without accidentally treating an old pre-mainnet plan as the current live configuration.

It does **not** remint, redefine, replace or downgrade the current canonical WLDZ token.

## Starting idea

The early WLDZ build targeted:

- WORLDZ / $WLDZ as WorldzLaunchPad™ token #001;
- 100,000,000 genesis supply;
- Token-2022 on Solana;
- no bonding curve and no graduation stage;
- a direct WLDZ/wSOL market;
- real liquidity kept distinct from virtual/display liquidity;
- wallet-to-wallet WLDZ transfers left untaxed;
- trade economics generated at the DEX/pool layer rather than by blindly applying a Token-2022 transfer fee.

The key technical insight was that SOL-side economics should be funded from quote-side trading revenue instead of requiring AUTO to sell WLDZ simply to obtain SOL.

## Early 25 / 25 / 25 / 25 allocation model

The design was deliberately simplified into four equal master buckets:

1. **25% Founder / Dev**
2. **25% Liquidity Growth**
3. **25% People + Charity**
4. **25% Worldz Ecosystem + Expansion**

Within the historical People + Charity bucket, the working structure was:

- 14% WLDZ Legends reserve;
- 4% Worldz Boost reserve;
- 7% Charity endowment.

This was an origin-stage architecture, not a statement that later/current WLDZ allocations must remain identical.

## Quote-side 2% trading-fee experiment

The early flagship fee experiment targeted a fixed **2.00% / 200 bps DEX trading fee**.

The crucial distinction was:

- **no Worldz wallet-transfer tax**;
- Token-2022 TransferFee extension **not** used as the primary WLDZ trading-tax mechanism;
- WLDZ/wSOL pool with wSOL as quote-side Token B;
- Meteora DAMM v2 `CollectFeeMode.OnlyB` used in testing so generated LP fees could be observed and claimed on the wSOL side.

The historical AUTO split of net Worldz-side claimable fee revenue was:

- 10% Board / WorldzPad Treasury;
- 40% HODLer rewards;
- 20% LP growth;
- 15% buyback + burn;
- 10% Charity / Impact;
- 5% Raaiiidd / Growth.

Again, this is retained as the **origin experiment**. Current WorldzFullBuild fee policy controls any live/current economics.

## HODL reward experiment

The test model used six-hour epochs and split the HODLer bucket:

- 70% proportional to eligible holdings;
- 30% Worldz Equalizer™ using square-root weighting.

The intent was to keep larger holdings meaningfully rewarded while improving the per-token outcome for smaller genuine holders. System, locked, reserve, LP and Charity holdings were excluded from the test reward population.

## Test progression

The early build deliberately moved through increasingly strong evidence rather than jumping directly to mainnet.

### Phase 1 — token/vault proof

The harness proved in an isolated Solana execution environment:

- exactly 100,000,000 TEST WLDZ minted;
- four 25M master vaults;
- mint authority revoked;
- freeze authority unset;
- allocation totals independently reconciled;
- AUTO split and Equalizer arithmetic reconciled.

### Phase 2 — real Meteora program proof

Using the actual Meteora DAMM v2 program in an isolated validator environment, the harness created a TEST WLDZ/wSOL pool and verified:

- 1,000,000 TEST WLDZ initial pool allocation;
- test wSOL quote liquidity;
- fixed 200 bps fee;
- `OnlyB`;
- no bonding curve / no graduation.

### Phase 3 — swap + fee claim proof

The harness then executed a controlled WLDZ→wSOL swap and proved:

- WLDZ-side LP fee = 0;
- wSOL-side LP fee > 0;
- wSOL fee claim succeeded;
- pending fee state cleared after claim.

A Meteora SDK convenience-layer ATA issue was discovered during this phase. The final test path bypassed only the faulty convenience account builder and called the genuine DAMM v2 on-chain swap and claim instructions with explicit token accounts.

### Final isolated pre-mainnet test

GitHub Actions Run **34155419579** completed successfully and produced the historical hard-gate line:

`WLDZ_FINAL_PRE_MAINNET=PASS`

That isolated test covered:

- fee routing reconciliation;
- native-SOL HODL distributions;
- LP addition;
- wSOL buyback followed by an actual Token-2022 burn;
- Charity native-SOL distribution;
- G.R.A.C.E.-style allocation separation;
- duplicate epoch rejection;
- wrong-wallet rejection;
- excessive LP release rejection;
- insufficient-wSOL rejection;
- atomic rollback proof.

Historical proof artifact digest:

`sha256:317f354ff125fe44df2d370a8f6ca893da5f7ce4cede965a8a0441fef5db70ec`

### Mainnet preparation gate

The next historical step built a non-spending, fail-closed mainnet-preparation layer.

GitHub Actions Run **34156629413** passed with:

`WLDZ_MAINNET_PREP=PASS launch_authorized=0 execution_enabled=0`

That gate explicitly prevented a preparation pass from becoming permission to mint, spend SOL or broadcast mainnet transactions.

## Important lessons carried into WorldzFullBuild™

The origin work established several permanent engineering principles:

1. **Separate design from execution proof.**
2. **Never call a simulated/local action a public-mainnet action.**
3. **Real liquidity must mean actually paired on-chain assets.**
4. **Do not make AUTO sell WLDZ merely to manufacture SOL-side rewards when quote-side routing can fund them directly.**
5. **Wallet transfers and market-trading fees are different concepts.**
6. **Reconcile every fee bucket and every token allocation exactly.**
7. **Use fail-closed gates for duplicate epochs, bad authorities, insufficient funds and excessive reserve release.**
8. **Keep mainnet execution disabled until public addresses, authorities, security, disclosures and human approval are resolved.**
9. **SDK convenience failures must never be hidden as protocol success or protocol failure; isolate the failing layer and prove the underlying program directly.**
10. **Historical experiments are useful reference material but never override the latest canonical token identity or live WorldzFullBuild rules.**

## Current-status boundary

This origin record predates later WLDZ launch work.

For current facts use, in order:

1. verified on-chain evidence;
2. verified live/deployment evidence;
3. the current versioned WorldzFullBuild contract;
4. this document only as historical engineering context.

**Current canonical WLDZ identity must always be taken from the active WorldzFullBuild source of truth, never reconstructed from this origin record.**
