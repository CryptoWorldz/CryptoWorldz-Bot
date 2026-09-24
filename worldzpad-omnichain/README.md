# Worldz Omnichain™ — private build

Status: **architecture + executable fee/disclosure core; every mainnet adapter disabled.**

This layer sits above the existing REVIVE / MagicFeeNumber™ / Legacy Flywheel™ build. It does not replace the Solana implementation and does not authorize a token launch.

## Product shape

A user or white-label partner submits one `WORLDZ-LAUNCH-INTENT-V1`.

Worldz then:

1. selects the chain-native adapter;
2. creates or binds the token using that chain's native model;
3. creates the native market/liquidity path;
4. calculates the actual fee path;
5. shows every deduction and recipient before signing;
6. attributes the creator and one primary referrer;
7. simulates or proves the launch on testnet/devnet;
8. records token, fee, authority and liquidity evidence in `WORLDZ-PROOF-V1`;
9. requires explicit release approval before any mainnet execution.

## Eight adapters

| Key | Domain | Family | Test network | Main network | Current build status |
|---|---|---|---|---|---|
| solana | solworldz.xyz | SVM | devnet | mainnet-beta | Devnet implementation in progress |
| xrpl | xrpworldz.xyz | XRPL | testnet | mainnet | Testnet adapter required |
| base | baseworldz.xyz | EVM | Base Sepolia / 84532 | Base / 8453 | Shared EVM adapter planned |
| ethereum | ethworldz.xyz | EVM | Sepolia / 11155111 | Ethereum / 1 | Shared EVM adapter planned |
| bnb | bnbworldz.xyz | EVM | BSC Testnet / 97 | BSC / 56 | Shared EVM adapter planned |
| sui | suiworldz.xyz | Move | testnet | mainnet | Move adapter required |
| hyperevm | hyperworldz.xyz | EVM | HyperEVM Testnet / 998 | HyperEVM / 999 | Shared EVM adapter planned |
| robinhood | robinworldz.xyz | EVM | Robinhood Testnet / 46630 | Robinhood Chain / 4663 | Shared EVM adapter planned |

## MagicFeeNumber™ across chains

The v1 target remains **75 bps / 0.75% gross trading fee** where the selected venue can actually implement it.

The Worldz-controlled revenue split remains:

- **51% Creator**
- **17% Referrer**
- **15% Legacy Flywheel™**
- **8.5% WorldzLaunchPad™**
- **8.5% OneWorldz Impact**

Those percentages apply to **actual Worldz-controlled fee revenue after external protocol/DEX deductions**, not blindly to trade volume on every chain.

The trader sees the real fee path before signing:

`Trader fee → external protocol/DEX → Creator → Referrer → Legacy → Worldz → Impact`

Network gas is displayed separately. No adapter may hide extra protocol charges beneath the MagicFeeNumber label.

## LaunchPad-to-LaunchPad referral

A competing launchpad, API partner, community, website or white-label operator can be the primary Worldz referrer.

The current v1 referrer share is **17% of Worldz-controlled revenue**. If a referrer wants a sub-affiliate arrangement, it must come from that referrer's share rather than increasing the trader fee.

This makes Worldz infrastructure useful even to a platform that keeps its own brand.

## Chain-native design

Worldz does **not** force Solana mechanics onto every chain.

- **Solana:** Meteora DBC → DAMM v2 is the reference implementation; Raydium/Jupiter integrations remain adapter-level capabilities.
- **XRPL:** use native issued-token/MPT rules, CLOB DEX and AMM capabilities. Do not fake a 75-bps model with an undisclosed transfer tax.
- **EVM family:** share deterministic token, fee-router, referral and proof contracts, while liquidity venues remain chain-specific.
- **Sui:** use Move + PTBs and Sui-native market/liquidity adapters.
- **HyperEVM:** EVM deployment first; HyperCore integration remains separately gated because Hyperliquid exposes additional native market primitives.

## Legacy Flywheel cross-chain rule

Every supported Worldz launch contributes **15% of Worldz-controlled collected revenue** to Legacy Flywheel accounting.

The ten legacy reward vaults remain on Solana. Non-Solana revenue accrues on its source chain until an **approved and audited** conversion/bridge route can deliver SOL. There is no automatic bridge simply because a bridge exists.

## Safety gates

No chain gets mainnet permission from another chain's success.

Each adapter must independently prove:

- token creation / binding;
- supply and authority state;
- exact gross fee and all external deductions;
- creator/referrer/router receipts;
- Legacy Flywheel accounting;
- liquidity/market creation;
- permanent lock or documented non-custodial equivalent where applicable;
- buy and sell path;
- transaction simulation/testnet receipts;
- Worldz Proof record.

Then, and only then, an explicit owner release may enable mainnet execution.

## Current build files

- `worldz-omnichain.v1.json` — platform contract and release phases.
- `chain-registry.v1.json` — eight chain-native adapters.
- `fee-policy.v1.json` — fee, referral and cross-chain Legacy rules.
- `schemas/launch-intent.schema.json` — common launch request.
- `schemas/worldz-proof.schema.json` — common proof receipt.
- `sdk/omnichain-core.mjs` — integer fee math and pre-sign disclosure.
- `sdk/self-test.mjs` — deterministic MagicFee/referral test.
- `scripts/validate_worldz_omnichain.py` — repository safety validator.
