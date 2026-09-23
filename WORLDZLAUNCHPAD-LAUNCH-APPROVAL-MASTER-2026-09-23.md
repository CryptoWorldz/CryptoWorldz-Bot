# WorldzLaunchPad Launch Approval Master

**Status:** Working approval master — on-chain WLDZ distribution still requires the authorised wallet signature.  
**Date:** 23 September 2026  
**Launch engine:** Meteora Dynamic Bonding Curve (DBC) virtual-liquidity configuration, graduating to DAMM v2 when its configured quote threshold is reached.

## Locked shared rules

- All public launch errors must be shown in plain English.
- Every external WorldMint / WorldzLaunchPad launch must disclose all allocations, vesting, trading fees and platform fees before launch.
- The 2% trading-fee router is separate from token supply allocations.
- The first 100 qualifying public WorldMint launches earn WLDZ only after on-chain and project verification.

## WORLDZ / WLDZ

Fixed supply: **100,000,000 WLDZ**

### Current distribution update

| Allocation | Share | WLDZ |
|---|---:|---:|
| JayJayTeamDev | 8.0% | 8,000,000 |
| Initial live liquidity | 15.0% | 15,000,000 |
| Staged liquidity reserve | 20.0% | 20,000,000 |
| Legacy Purple Diamond Handz pool | 5.0% | 5,000,000 |
| First 100 verified public WorldMint launches | 10.0% | 10,000,000 |
| OneWorldz charity impact | 10.0% | 10,000,000 |
| Worldz Treasury | 10.0% | 10,000,000 |
| General reserve | 5.0% | 5,000,000 |
| Stepper | 1.0% | 1,000,000 |
| Future team reserve | 4.0% | 4,000,000 |
| Dev City | 5.0% | 5,000,000 |
| Community / Command Centre rewards | 2.0% | 2,000,000 |
| Operations / security / infrastructure | 5.0% | 5,000,000 |
| **Total** | **100.0%** | **100,000,000** |

### Dev City

- 50 wallets.
- 0.1% WLDZ each.
- 100,000 WLDZ each.
- Total: 5,000,000 WLDZ (5.0%).
- Pool staging wallet: `2b9kxWY6zNCYh6D3WzZBFsvzck9tSkscaiCbap7CSB1m`.

### Purple Diamond Handz

- Total WLDZ pool: 5,000,000 WLDZ.
- Distribution staging wallet: `ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U`.
- Existing snapshot root remains the entitlement source for the legacy fan-out.

### Team

- JayJayTeamDev: 8,000,000 WLDZ.
- Stepper: 1,000,000 WLDZ.
- Future verified team reserve: 4,000,000 WLDZ.

### Distribution wallet registry

The owner-supplied wallet set and the existing ZED Command Centre four-wallet roles are recorded in:

`worldzpad-mainnet/wldz-distribution.wallets.json`

The active Command Centre wallet purposes remain:
- Dev & Launch
- AUTO / Diamond Buy investment
- Treasury Multisig
- Rewards

The AUTO / Diamond Buy wallet keeps its existing investment purpose.

### First 100 public WorldMint launches

- 0.1% WLDZ each.
- 100,000 WLDZ each.
- Total: 10,000,000 WLDZ (10%).
- A launch qualifies only when it uses the official WorldzLaunchPad / WorldMint configuration and the creator/project verification requirements are met.

## REVIVE, PHENIX and MIRACLE

Apply this fixed-supply allocation to each token.

| Allocation | Share |
|---|---:|
| JayJayTeamDev | 8.0% |
| Stepper | 4.0% |
| Future team | 8.0% |
| Initial liquidity allocation | 10.0% |
| Locked liquidity reserve | 20.0% |
| Dev City: 50 wallets x 0.2% | 10.0% |
| Charity impact | 8.0% |
| Worldz Treasury | 5.0% |
| General reserve | 5.0% |
| Security / operations | 3.0% |
| Ecosystem grants | 4.0% |
| Legacy Purple Diamond Handz | 3.0% |
| Command Centre Kitty | 5.0% |
| Fair early-access allocation | 7.0% |
| **Total** | **100.0%** |

## Command Centre Kitty

The 5% Kitty is for verifiable community contribution, including onboarding, translations, testing, education, moderation and scam reporting.

## 24-hour early access

- A gated 24-hour access period runs on the same Meteora DBC virtual curve.
- It is not a separate half-price sale.
- A per-wallet purchase cap is set in the public launch configuration.
- After the window, the same curve opens to the public.

## External WorldzLaunchPad launches

- WorldzLaunchPad takes 10% of each external project's collected supported trading-fee revenue only; 90% remains for that project's disclosed fee routing.
- WorldzLaunchPad takes 0% of creator token supply and 0% of initial liquidity.
- The platform fee-claimer destination and every project's fee routing must be visible before a creator launches.
- The 2% DBC trading-fee configuration and its complete 100% fee-router destination table must be finalized before any mainnet configuration is approved.

## Four-wave release order

1. WORLDZ
2. REVIVE — no sooner than 72 hours after WLDZ public opening and operational verification.
3. PHENIX — no sooner than 72 hours after REVIVE.
4. MIRACLE — no sooner than 72 hours after PHENIX.

Each next wave requires successful verification of the prior token’s metadata, curve, fee-claimer, allocation/vesting records and public claim paths.
