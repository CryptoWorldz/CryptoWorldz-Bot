# WORLDZ $WLDZ — Total Design v1

## Objective
Build #001 WORLDZ so the token can launch with small real Dev-funded liquidity while keeping virtual/concentrated-liquidity effects transparent, avoiding a tax on ordinary wallet transfers, avoiding AUTO selling WLDZ merely to create SOL fee revenue, and creating long-term liquidity, holder, charity and ecosystem engines.

## 100M master allocation — 25 / 25 / 25 / 25

### Founder — 25%
- 25,000,000 WLDZ total.
- 5,000,000 operational/unlocked at genesis.
- 20,000,000 controlled by G.R.A.C.E. linear vesting over 36 months.
- Locked Founder tokens are excluded from SOL holder rewards.

### Liquidity — 25%
- 25,000,000 WLDZ total.
- Launch: 1,000,000 WLDZ (1%) plus approximately A$200-equivalent Dev-funded SOL/wSOL.
- Remaining 24,000,000 WLDZ is a reserve, not live liquidity.
- Release capacity: +4M during Year 1, then up to +5M in each of Years 2–5.
- Reserve WLDZ can only be released when real matching quote liquidity exists and the addition is made at a TWAP-based real pool ratio.
- Unpaired WLDZ is never counted or marketed as real liquidity.
- LP/reserve balances are excluded from SOL holder rewards.

### People + Charity — 25%
- Legend Reserve: 14,000,000 WLDZ / 14%.
  - Current guaranteed 1% grants: Remedy, Stepper, Sxvage/Savage, SolMussic, Mahammad.
  - Nine additional named Legend candidates can receive 1% if active.
  - 20% of an activated Legend grant initially unlocks; 80% vests over 12 months.
- Worldz Boost: 4,000,000 WLDZ / 4%.
  - 16 seats × 250,000 WLDZ / 0.25%.
  - 20% initially unlocks; 80% vests over 12 months.
  - A 1% Legend cannot also receive a Boost seat.
- Charity Endowment: 7,000,000 WLDZ / 7%.
  - Dedicated Charity Vault.
  - Initial 12-month cliff.
  - No automatic liquidation.
  - Beneficiary disbursement only to verified/approved causes.

### Worldz Ecosystem — 25%
- 10M Infrastructure / Treasury — max 2M release per year.
- 5M Advertising / Growth — max 1M release per year.
- 5M Market Access / Listings / Integrations — max 1M release per year.
- 5M Future Expansion / Grants — max 1M release per year.
- Controlled by Worldz multisig policy.
- System-vault balances do not receive SOL holder rewards.

## Token standard
WLDZ remains a fixed 100M Solana Token-2022 asset, but the token itself does NOT use Token-2022 TransferFeeConfig and does NOT use a TransferHook for the 2% trading-fee system.

Reason:
- TransferFeeConfig taxes token transfers and withholds the fee in WLDZ.
- That would tax wallet-to-wallet transfers and would leave AUTO needing to sell WLDZ when SOL is required.
- A TransferHook adds integration/compute complexity and side-payment flows can require prior approval/delegation.
- WLDZ therefore targets only metadata-oriented Token-2022 extensions for the initial design.
- After the fixed 100M genesis mint and vault allocation, mint authority is revoked; freeze authority is unset.

## DEX fee architecture — 2% quote-side
Preferred implementation target: Meteora DAMM v2.

- Base token: WLDZ.
- Token B / quote token: wrapped SOL.
- Quote mint: `So11111111111111111111111111111111111111112`.
- DAMM v2 program: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`.
- `CollectFeeMode.OnlyB` / quote-side single-token fee collection.
- Base DEX trading fee target: 200 bps / 2.00%.
- Ordinary WLDZ wallet transfers: 0% Worldz fee.
- No bonding curve and no graduation phase.
- Concentrated price-range liquidity may create a capital-efficiency / virtual-reserve effect, but WorldzPad must never call that virtual amount real withdrawable liquidity.

Important accounting rule: external DEX protocol fees are read from the deployed pool configuration and displayed separately. AUTO splits only the NET claimable Worldz-side position fee revenue actually available after the DEX's own protocol deduction. This prevents a false promise that WorldzPad controls fee revenue it never receives.

## AUTO fee engine
AUTO reconciles and routes the actual claimable wSOL/SOL revenue.

Net Worldz-side fee split:
- 10% WorldzPad Board Treasury.
- 40% HODLer SOL rewards.
- 20% real LP growth.
- 15% buyback + burn.
- 10% Charity / Impact.
- 5% Raaiiidd / Support / Growth.

Total = 100%.

Fee claims are evaluated every six hours. If claiming/distributing would be uneconomic, the value rolls into the next epoch instead of wasting the reward on transaction costs.

## 6-hour HODL reward system
Forty percent of net fee revenue is assigned to holders each six-hour epoch.

Weighting:
- 70% proportional pool: normal unlocked eligible WLDZ balance.
- 30% Worldz Equalizer: square-root weighting for verified Command Centre profiles.
- Linked verified wallets are aggregated before Equalizer calculation to reduce wallet-splitting abuse.
- Unverified holders remain eligible for the 70% proportional component.

Excluded balances:
- liquidity reserve and LP vaults;
- locked Founder WLDZ;
- locked Legend/Boost WLDZ;
- Charity Endowment;
- ecosystem/treasury system vaults;
- Board treasury;
- burned WLDZ.

Reward accounting is finalized every six hours into a cumulative claimable balance. It does not require AUTO to push a separate transaction to every holder every six hours.

## LP Growth engine
Twenty percent of net fee revenue goes to the LP Growth wSOL vault.

AUTO may pair that real wSOL with WLDZ from the scheduled Liquidity Reserve only when:
1. WLDZ is available under the long-term release schedule;
2. a TWAP-based real pool ratio can be calculated;
3. the deposit can be made as balanced real liquidity;
4. Real Value/slippage checks pass.

If there is insufficient WLDZ release capacity, wSOL remains in the LP Growth vault. If there is insufficient real wSOL, WLDZ remains locked. This prevents fake/unpaired liquidity accounting.

## Buyback + burn
Fifteen percent of net fee revenue accumulates in wSOL.

AUTO executes small open-market buys rather than one large transaction:
- maximum 0.5% of real quote reserve per single buy;
- maximum 2% of real quote reserve per day;
- skip execution when slippage/Real Value gates fail.

Purchased WLDZ is burned with the token program from the AUTO-owned account, reducing live supply. A dead-wallet transfer is not treated as a burn.

## Charity engine
Two independent resources support approved charities:
1. 7M WLDZ long-term Charity Endowment with a 12-month initial cliff.
2. 10% of ongoing AUTO net fee revenue paid in SOL.

The SOL route is preferred for routine disbursements so charities do not need to dump WLDZ to obtain usable funds. Selling/distributing the 7M WLDZ endowment requires explicit multisig approval plus a Real Value/liquidity impact check.

## WorldzPad Board Treasury
The 10% Board route is not defined as a personal hot wallet. It is a WorldzPad treasury controlled by the established multisig:
- JayJayTeamDev;
- Remedy;
- Stepper.

Policy: JayJayTeamDev plus one of Remedy/Stepper is required for a treasury action. Sxvage/Savage remains Executive Leader #4 but is not a multisig signer.

## Real Value requirements
Command Centre / WorldzPad must display separately:
- spot price / spot valuation;
- actual real pool reserves;
- virtual/concentrated-liquidity representation;
- estimated realisable value;
- slippage / price impact;
- external DEX protocol fee;
- net Worldz claimable fee revenue;
- fee-route totals;
- LP additions;
- bought/burned WLDZ;
- Charity SOL receipts/disbursements;
- live post-burn supply.

## Security / execution boundary
This repository contains the public contract, simulators and ZED integration manifest. It does not contain the private mainnet signer or the separate Command Centre runtime source.

Mainnet execution path:
1. generate fixed-supply mint/vault transaction plan;
2. create external runtime DAMM v2 adapter on devnet;
3. prove OnlyB quote-side fee accounting and pool config;
4. prove six-hour AUTO reconciliation on devnet;
5. test LP addition / buyback / burn / reward claim / Charity routes;
6. security review and authority review;
7. explicit JayJayTeamDev mainnet signing.

No website or public repository is permitted to silently mint, withdraw, swap or sign mainnet transactions.
