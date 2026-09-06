# WorldzPad™ — Flash Direct Launch Contract

WorldzPad™ is the OneWorldz / CryptoWorldz launch, revival, fee-routing and Real Value™ infrastructure layer. Solana is the first execution network.

## Command architecture

- **ZED commands it** — launch registry, operator workflow, status, alerts and launch contracts.
- **AUTO runs the money engine** — fee accounting, SOL holder rewards, LP routing and treasury accounting.
- **G.R.A.C.E. runs vesting and team systems** — locks, schedules, beneficiary records and permissions.
- **Multisig protects sensitive treasury/authority actions** where configured.
- **ImpactBased is available** for optional transparent charity/impact routing; it is not mandatory for a token launch.
- **WorldzPad launches it** through a machine-readable launch contract consumed by the execution runtime.

## Sole deployer rule

The sole authorised deployer under WorldzPad is **JayJayTeamDev**. WorldzPad is not configured in this release as an open public token-creation service for third-party deployers.

The public GitHub repository contains no private signing material. Mainnet signing is an explicit action performed by the authorised operator through the separate Command Centre/runtime and supported DEX adapter.

## Flash Direct™ launch technology

WorldzPad's launch profile is **not a bonding curve**.

The locked model is:

- instant/direct DEX market architecture;
- virtual liquidity permitted for pricing/market-depth mechanics;
- real Dev-funded liquidity accounted separately;
- no bonding-curve graduation requirement;
- virtual liquidity must never be represented as real withdrawable liquidity;
- Real Value™ must separate spot/display value from actual realisable liquidity value.

## Protocol fee rules

1. WorldzPad token fee choices are exactly 0.50%, 0.75%, 1.00% ... 3.75%, 4.00%.
2. **4.00% is the WorldzPad hard maximum.**
3. WorldzPad receives **10% of collected token fee revenue**.
4. WorldzPad does **not** receive 10% of token supply.
5. WorldzPad's 10% share is **not** a 10% transaction tax. Example: a 2% token fee makes the WorldzPad protocol share effectively 0.20% of taxable volume.
6. **SOL holder rewards** are the mandatory fee-routing category.
7. Charity / Impact is optional.
8. The remaining project distribution bucket must total exactly 100%.
9. Optional routes can include Charity / Impact, LP addition, buyback, burn, treasury, dev, team, marketing, community and named wallets.
10. Reward cadence options: hourly, every 6 hours, daily, weekly, monthly, yearly.
11. No guaranteed return, APY or token price is represented by the protocol.

## #001 — WORLDZ `$WLDZ`

Locked Flash Direct launch contract:

- Network: Solana
- Token: WORLDZ
- Ticker: `$WLDZ`
- Vanity mint-prefix target: `WLDZ…`
- Fixed genesis supply: **100,000,000 WLDZ**
- Initial genesis ownership: **100% Dev**
- Initial LP token allocation: **1% = 1,000,000 WLDZ**
- Initial real quote-side liquidity target: **approximately A$200 equivalent in Dev-funded SOL**, converted at execution time
- Virtual liquidity: enabled by the selected supported Flash Direct DEX/runtime mechanism
- Bonding curve: **NO**
- Graduation requirement: **NO**
- Presale: **NO**
- Customer custody by the public WorldzPad site: **NO**
- SOL holder rewards: **YES**, from configured collected token fee revenue
- Charity / impact wallet: optional
- Buyer risk disclosure: required
- Real Value™ disclosure: required

## Locked launch registry

- **#001 WORLDZ `$WLDZ`** — Flash Direct command contract ready.
- **#002 REVIVE `$RVIV`** — identity locked; vanity mint-prefix target `RVIV…`.
- **#003 PHENIX `$PNEX`** — identity locked; vanity mint-prefix target `PNEX…`.

## ZED machine contract

The build publishes the same machine-readable contract to:

- `impactbased.oneworldz.com/worldzpad.launch-contract.json`
- `cryptoworldz.xyz/worldzpad/worldzpad.launch-contract.json`

The operator-facing configuration is published at:

- `impactbased.oneworldz.com/launch-console/`
- `cryptoworldz.xyz/worldzpad/`

The launch contract is **ready for runtime integration**. This repository does not contain the separate `cryptobotz.cryptoworldz.xyz` runtime source or private signer, so this release does not falsely claim to have performed a mainnet mint.

## Real Value™ rule

WorldzPad must display separately:

- **Spot Value** — token balance × current quoted spot price.
- **Realisable Value** — estimated proceeds based on actual real liquidity, AMM/DEX mechanics, fees and slippage.
- **Locked Value** — market value of balances subject to genuine locks/vesting.
- **Virtual Liquidity** — explicitly labelled as virtual/pricing liquidity and never presented as withdrawable reserves.

## Legacy Revival™

WorldzPad retains the Legacy Revival path for genuine existing tokens such as Limited Edition `$LMTD`. Existing mint identity should be preserved where technically viable, with current authority, holder, LP and wallet data re-verified before any value is committed.

Known historical `$LMTD` mint recorded for verification:

`Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY`

## Release boundary

The connected repository controls the public CryptoWorldz / ImpactBased / WorldzPad surfaces and their existing production deployment pipeline. The separate Command Centre runtime at `cryptobotz.cryptoworldz.xyz` is linked but its internal source is not present in this repository.

Accordingly this release can make the launch profile, ZED bridge, validation contract and operator console production-ready, but it cannot legitimately claim a mainnet token was signed or minted until the external runtime/signer performs that action.
