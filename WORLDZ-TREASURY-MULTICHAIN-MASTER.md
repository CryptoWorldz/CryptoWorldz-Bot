# WorldzLaunchPad™ Multichain Treasury Master

Version: 2026-10-01 — WORLDZ-TREASURY-2

## Locked Governance

WorldzLaunchPad uses chain-native treasury wallets under one common governance policy.

- **Worldz Operations Treasury:** 5 signers, **3-of-5** approvals.
- **Worldz Reserve Treasury:** **not deployed / disabled**.
- **Reserve sweeps:** **OFF**.
- Approved revenue remains in the Operations Treasury until a separate Reserve Treasury is explicitly approved and deployed in the future.
- Private keys, seed phrases and recovery material must never be committed to GitHub.
- Each blockchain has its own treasury address. There is no fake "universal address".

Using the same five signers and the same 3-of-5 threshold for a second Reserve vault is not treated as added security, so Worldz does not require a duplicate Reserve Treasury.

## Current Solana Operations Signer Set

| Signer | Solana public wallet |
| --- | --- |
| JayJayTeamDev | `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u` |
| Stepper | `DwWj3EuyaL2ufZASdZ3DPGyaSEqnjzAPxfLAxq5MRLhJ` |
| Savage | `2DqyvXoA7VnyWH6n6yVV1XoS2pdBDHMKsj3tRRFaTpbn` |
| SolMusic | `FmFtkknYe3BaHJ2HJGquV2MqCrjX4c14jk4kbLHg27kJ` |
| Mahammad | `6VtCKsBA5pt5WcWF5sENEb9BM4FLp2Ezn5VYEcCY5Mok` |

These are public signer addresses only. Live Squads membership and threshold must still be independently re-read before Worldz marks the configuration as on-chain verified.

## Fee Route

WorldzLaunchPad receives only the applicable Worldz share of collected supported project trading-fee revenue defined by the active fee policy.

It does **not** take token supply, initial liquidity, or ordinary wallet transfers unless a separate explicit launch policy says otherwise.

Current treasury route:

`Supported Worldz fee allocation -> chain Operations Treasury (3-of-5)`

There is currently **no automatic Reserve sweep**.

## Chain Standard

| Chain family | Operations | Reserve | Provider |
| --- | --- | --- | --- |
| Solana | 3-of-5 | Not deployed | Squads v4 |
| EVM (Ethereum, Base, BNB, HyperEVM and supported EVM chains) | 3-of-5 | Not deployed | Safe Smart Account |
| XRP Ledger | 3-of-5 | Not deployed | Native SignerList multisigning |
| Sui | 3-of-5 | Not deployed | Native Sui multisig |

## Solana Operations Treasury

The existing Team Zed Treasury remains the configured Solana Operations vault:

- Squads multisig config: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault index: `0`
- Vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Permanent Worldz target governance: **3-of-5**
- Reserve Treasury: **not deployed**
- Reserve sweep: **disabled**

The five-member/3-of-5 change must be independently confirmed from live Squads state before automated production routing treats it as verified.

## Activation Gate

No chain's public mainnet fee routing activates until:

1. The five signer public addresses are registered and checked.
2. The chain-native Operations Treasury is proven at **3-of-5**.
3. The exact active Worldz fee route is proven end-to-end.
4. The treasury destination is verified on-chain.
5. The applicable Worldz Safe Launch and mainnet release gates pass.
6. Human authorization is completed.

A Reserve Treasury is **not** an activation requirement while Reserve status is disabled.
