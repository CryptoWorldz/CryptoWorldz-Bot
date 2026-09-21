# WorldzMINT™ — Public Fixed-Supply Mint Standard

Version: `WORLDZMINT-1`

WorldzMINT™ is the public token-genesis layer of WorldzLaunchPad™.

It is deliberately separate from a trading launch.

## WorldzMINT does

- Create a classic Solana SPL token with 6 decimals.
- Require a fixed whole-token supply between 1,000 and 1,000,000,000,000.
- Distribute the full genesis supply directly to disclosed destination wallets.
- Require creator/liquid allocation <=5%.
- Require designated liquidity reserve of 25–60%.
- Require community allocation >=20%.
- Cap designated treasury allocation at 15%.
- Require allocations to total exactly 100%.
- Require distinct genesis destination wallets.
- Create immutable token metadata in WorldzMINT v1.
- Permanently revoke Mint Authority.
- Permanently revoke Freeze Authority.
- Independently verify exact supply, exact destination balances, transaction signer and revoked authorities before granting a WorldzMINT proof.
- Register the verified mint with Worldz Trust Orbit™.

## WorldzMINT does not

- Create a trading market.
- Invent a market cap.
- Create fake or virtual liquidity.
- Guarantee Jupiter verification, listing or price availability.
- Guarantee price appreciation.
- Take any percentage of the token supply.
- Take any percentage of initial liquidity.
- Apply an ordinary-wallet transfer tax.

## Fees

WorldzMINT v1 takes **0% of token supply** and **0% of initial liquidity**.

The WorldzLaunchPad **10% rule applies only when a project separately enters a supported Worldz market-launch/fee route** such as Worldz Confidence Curve™:

- project side: 90% of collected supported project trading-fee revenue;
- WorldzLaunchPad side: 10% of collected supported project trading-fee revenue.

Minting alone does not activate this trading-fee route.

## Wallets

WorldzMINT uses the Solana Wallet Standard where available.

Jupiter Wallet is presented as a preferred compatible wallet when detected. Wallet branding does not weaken the cryptographic rule: the connected address must sign the mint transactions and Worldz proof messages itself.

## Three transaction stages

1. **Create Mint** — creates the mint account with the connected wallet as temporary Mint + Freeze authority.
2. **Genesis Distribution** — creates destination token accounts and mints the exact full supply directly into the five disclosed allocations.
3. **Finalise** — creates immutable token metadata and permanently revokes both Mint and Freeze authority.

Every transaction is simulated before broadcast by the browser client.

The backend does not trust the UI. It independently reads Solana after finalisation.

## Confidence stack

After minting:

- **Worldz Confidence Curve™** is the separate market-launch route.
- **Worldz Confidence Pulse™** measures live market evidence.
- **Worldz Confidence Constellation™** displays independent evidence markers.
- **Worldz Trust Orbit™ → Six Proof Rings™** preserves the full evidence passport.

## Truth rule

A WorldzMINT proof means only that the fixed-supply genesis facts were verified.

It does **not** mean the token has liquidity, a fair market price, a healthy holder distribution, an LP lock, Jupiter VRFD verification, a high Organic Score, or low investment risk.
