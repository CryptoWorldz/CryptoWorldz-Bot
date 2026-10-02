# WorldzLaunchPad™ Multichain Treasury Master

Version: 2026-10-02 — WORLDZ-TREASURY-3

## Locked Governance

Worldz uses separate chain-native treasuries for distinct purposes.

- **Worldz Operations Treasury:** 5 signers, **3-of-5** approvals.
- **Worldz Miracle Team Treasury:** 8 signers, **4-of-8** approvals, separate from Operations.
- **Worldz Reserve Treasury:** **not deployed / disabled**.
- **Reserve sweeps:** **OFF**.
- Private keys, seed phrases and recovery material must never be committed to GitHub.
- Each blockchain has its own treasury address. There is no fake universal address.

The Miracle Team Treasury is **not** a renamed Reserve Treasury. It is a separate team/impact treasury with a different signer set and purpose.

## Current Solana Operations Signer Set

| Signer | Solana public wallet |
| --- | --- |
| JayJayTeamDev | `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u` |
| Stepper | `DwWj3EuyaL2ufZASdZ3DPGyaSEqnjzAPxfLAxq5MRLhJ` |
| Savage | `2DqyvXoA7VnyWH6n6yVV1XoS2pdBDHMKsj3tRRFaTpbn` |
| SolMusic | `FmFtkknYe3BaHJ2HJGquV2MqCrjX4c14jk4kbLHg27kJ` |
| Mahammad | `6VtCKsBA5pt5WcWF5sENEb9BM4FLp2Ezn5VYEcCY5Mok` |

Current Operations governance is **3-of-5**. Mainnet actions still re-read live Squads state immediately before proposal creation/execution.

## Miracle Team Treasury signer plan

Target governance: **4-of-8**.

Verified/documented team wallets already eligible as signer candidates:

1. JayJayTeamDev
2. Stepper
3. Savage
4. SolMusic
5. Mahammad

Three additional signer slots remain **PENDING** until three distinct consenting Legend/Admin/Miracle Team members provide verified public Solana wallets.

Rules:
- Remedy is not a signer candidate.
- Do not invent signer addresses.
- One person using multiple wallets must not be counted as multiple independent Miracle Team signers.
- Owner-controlled extra wallets may be used as clearly-labelled allocation/custody wallets, but they do not create extra human multisig independence.
- Signer consent and live Squads membership proof are required.

## Treasury-bound revenue route

Before the Miracle Team Treasury is live-verified:

`Treasury-bound revenue -> 100% Worldz Operations Treasury (3-of-5)`

After the separate Miracle Team Treasury passes deployment and live proof:

`Treasury-bound revenue -> 70% Worldz Operations Treasury (3-of-5) + 30% Worldz Miracle Team Treasury (4-of-8)`

The 30% is taken only from revenue that otherwise would have gone 100% to Operations Treasury custody. It does **not** create a new fee and does not override explicit Creator, Referrer, Legacy, WLDZ/RVIV/PNEX/MRCL, LP, Buyback/Burn, Impact or Builder lanes.

## Chain Standard

| Chain family | Operations | Miracle Team | Reserve |
| --- | --- | --- | --- |
| Solana | 3-of-5 Squads v4 | 4-of-8 Squads v4 target | Not deployed |
| EVM | 3-of-5 Safe target | 4-of-8 Safe target if separately approved | Not deployed |
| XRP Ledger | 3-of-5 SignerList target | 4-of-8 SignerList target if separately approved | Not deployed |
| Sui | 3-of-5 native multisig target | 4-of-8 native multisig target if separately approved | Not deployed |

## Solana Operations Treasury

- Squads multisig config: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault index: `0`
- Vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Governance: **3-of-5**
- Reserve Treasury: **not deployed**
- Reserve sweep: **disabled**

## Miracle Team activation gate

The 30% route remains OFF until all are true:

1. All 8 signer public wallets are recorded and consented.
2. A separate Solana Squads Miracle Team multisig is created.
3. Live chain state proves **4-of-8**.
4. The new Miracle Team vault address is recorded.
5. A 70/30 treasury-bound revenue split is simulated end-to-end.
6. Human approval is completed.
7. Worldz Proof receipt records the deployment/activation evidence.

Until then, treasury-bound revenue remains 100% in the existing 3-of-5 Operations Treasury.
