# WorldzPad™ Foundation v1

WorldzPad™ is the OneWorldz / CryptoWorldz launch, revival, fee-routing and impact infrastructure layer. It is Solana-first and designed for later chain-specific Worldz expansion.

## Operating model

- **ZED commands it** — launch registry, approvals, health, alerts and operator workflow.
- **AUTO runs the money engine** — fee accounting, reward settlement, liquidity instructions, buyback/burn instructions and treasury accounting.
- **G.R.A.C.E. runs vesting and team systems** — dev/team locks, vesting, beneficiary records, permissions and scheduled allocations.
- **Multisig protects it** — sensitive treasury/authority actions stay behind established multisignature governance. Wallet addresses and secrets are not stored in this public specification.
- **ImpactBased gives every launch purpose** — fee-enabled launches require a visible impact/charity route.
- **WorldzPad launches it** — public configuration, disclosures, launch mode, locks, fee routes and post-launch monitoring.

## Protocol fee rules

1. Token fee choices are exactly 0.50%, 0.75%, 1.00% ... 3.75%, 4.00%.
2. 4.00% is the hard maximum for WorldzPad v1.
3. WorldzPad receives **10% of collected fee revenue**, not 10% of token supply and not a 10% transaction fee.
4. Example: a 2.00% token fee makes the WorldzPad protocol share effectively 0.20% of taxable volume.
5. SOL holder rewards are a mandatory route for fee-enabled WorldzPad launches.
6. At least one Charity / Impact route is mandatory.
7. The project's remaining distribution bucket must balance to exactly 100% before launch configuration can pass.
8. Optional routes include LP addition, buyback, burn, treasury, dev, team, marketing, community, named wallets and additional charities.
9. Reward cadence options: hourly, every 6 hours, daily, weekly, monthly, yearly.

## Real Value™ rule

WorldzPad must not present a spot-price wallet valuation alone where liquidity depth materially changes what could be realised.

The UI separates:

- **Spot Value** — balance multiplied by current quoted spot price.
- **Realisable Value** — estimated output after AMM depth, curve and slippage.
- **Locked Value** — current market value of balances that are subject to locks/vesting.

The production version may use live routing/liquidity data only after the data source and calculation are verified.

## Legacy Revival™

WorldzPad revives genuine legacy tokens by preserving original mints where technically and legally viable.

Required sequence:

1. Identity and authority audit.
2. Dev/distribution/treasury wallet census.
3. Holder and liquidity snapshot.
4. Current legal/classification review.
5. Recovery budget with personal/project/charity funds separated.
6. Liquidity design and Real Value simulation.
7. Published dev/team/beneficiary locks and vesting.
8. Staged revival rather than an undisclosed instant relaunch.
9. ZED monitoring after revival.

Known legacy record carried into v1:

- Limited Edition (`$LMTD`)
- Known mint: `Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY`
- Historical maximum supply: 10,000,000

All balances, authorities, LP positions and holder data must be re-verified on-chain before funds are committed.

## Launch registry

- **#001 Worldz `$WLDZ`** — flagship Solana-first WorldzPad launch; design/compliance stage.
- **#002 Reserved** — identity deliberately not locked yet.
- **#003 Phenix `$PHENIX`** — future finance/currency infrastructure concept.

A registry number does not mean a token is live or approved.

## Execution gates

Public information, simulation and architecture may be deployed before regulated execution.

The following remain disabled until resolved:

- token minting through WorldzPad;
- swaps/exchange execution;
- custodial or transfer instructions;
- fee-withdraw authority automation;
- automated reward/charity settlement;
- live treasury execution.

Production execution requires, at minimum:

1. entity/operator responsibility documented;
2. AUSTRAC position resolved for all planned designated virtual-asset services;
3. ASIC / financial-product and financial-service classification resolved;
4. token-specific disclosures and risk statements;
5. multisig and authority review;
6. smart-contract/integration security review;
7. testnet acceptance evidence;
8. accounting, tax, recordkeeping and incident controls.

## Lock and vesting integration

WorldzPad is designed to orchestrate audited external lock/vesting protocols such as Jupiter Lock where appropriate, while preserving a clear distinction between:

- **vesting/locking** — controls when tokens can move; and
- **rewards/staking** — a separately funded economic program.

No yield is represented as being created merely because tokens are locked.

## Funding-first principle

Before relying on founder personal funds for liquidity, WorldzPad should pursue suitable non-token funding and support channels: ecosystem grants, hackathons, competitions, responsible venture investment, bank innovation programs, cloud credits and startup support.

Personal financially managed funds, DSP-related personal assets/income, project funds, protocol treasury funds, charity funds and third-party investment must remain separately identifiable and must not be assumed interchangeable.

## v1 release boundary

This repository controls the public CryptoWorldz / ImpactBased / WorldzPad surfaces and Hostinger deployment. The linked Command Centre runtime at `cryptobotz.cryptoworldz.xyz` is separate from this connected repository; v1 creates the public ZED → WorldzPad bridge without claiming that runtime internals were modified.
