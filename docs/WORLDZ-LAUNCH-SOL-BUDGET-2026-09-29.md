# Worldz launch funding worksheet — 29 September 2026

**Status:** planning only. Requote the selected venue, pool, vault, wallet and live SOL/AUD price immediately before each signature. No purchase or launch has been authorised by this worksheet.

## Inputs JayJay can fill in

| Input | Meaning |
| --- | --- |
| `P` | Live AUD price of 1 SOL when reviewing the transaction |
| `L_W`, `L_R`, `L_P`, `L_M` | Real SOL allocated to the WLDZ, RVIV, PNEX and MRCL launch/pool paths respectively |
| `B_W`, `B_R`, `B_P` | Optional creator first-buy amounts in SOL for WLDZ, RVIV and PNEX |
| `V` | Number of new Streamflow vesting contracts, if Streamflow is chosen |
| `K` | Number of new Streamflow token locks, if Streamflow is chosen |
| `A` | Number of recipient associated token accounts that must be created |
| `T` | Number of Solana transaction signatures, including distributions |
| `F` | Chain/venue/pool/multisig/priority fees shown at review, excluding the entries above |

The MRCL creator first-buy target is **A$200**, so its SOL amount is **`200 / P`**. A token-supply percentage is a number of tokens; it does not determine the SOL side of a pool.

## Funding equation

`SOL needed = L_W + L_R + L_P + L_M + B_W + B_R + B_P + 200/P + 0.1747×(V+K) + 0.00407856×A + 0.000005×T + F + operating buffer`

The Streamflow amounts are its published individual-plan examples per vesting contract or lock, including its example network fee. **Do not count the 0.00407856 SOL ATA component twice** when it is already inside a quoted Streamflow contract cost. Streamflow also lists a **0.19% token fee for vesting** and **0.5% token fee for locks**; these token amounts are additional to the SOL budget. Its optional vesting auto-claim is quoted separately at **0.2647 SOL per contract**. [Streamflow costs](https://docs.streamflow.finance/en/articles/9675153-individual-vs-business-costs-of-using-streamflow)

Solana's base transaction fee is **0.000005 SOL per signature**. Priority fees, account rent and venue charges vary. [Solana fee documentation](https://solana.com/docs/core/fees)

## Worked setup examples, excluding liquidity and unknown venue fees

| Example | Calculation | SOL |
| --- | --- | ---: |
| Two vault vesting contracts | `2 × 0.1747` | 0.3494 |
| Ten individual team vesting contracts | `10 × 0.1747` | 1.7470 |
| One new token lock | `1 × 0.1747` | 0.1747 |
| Ten new recipient token accounts | `10 × 0.00407856` | 0.0407856 |
| Forty one-signature distributions in a day | `40 × 0.000005` | 0.0002 before priority/account creation |

The 10-token, six-hour cadence is **40 token distribution cycles per day** if each token runs four cycles. One cycle may contain many recipients or transactions. The recurring SOL requirement cannot be fixed until the implementation, recipient counts and fee payer are verified.

## Gates before spending

1. Confirm canonical token mints, chosen chain, supply allocations, real pool contribution, quote asset and exact venue quote.
2. Confirm each destination public address and signer opt-in. Miracle Church, Worldz Operations and Worldz Reserve are separate proposed 4-of-10, 5-of-10 and 6-of-9 profiles; current registry marks them not deployed or rollout pending.
3. Confirm the fee route, LP owner and lock, vesting contract count, tax/accounting treatment, simulation and readable transaction details.
4. Keep operating fees, real liquidity, creator buys, venue fees and humanitarian funds in separate budget lines. Record transaction signatures and Worldz Proof receipts after confirmation.

The proposed **2026–2030 Woodstock Returns Party** needs its own venue, travel, accessibility, safety, artist and community budget. It is **not included** in this token-launch SOL worksheet.
