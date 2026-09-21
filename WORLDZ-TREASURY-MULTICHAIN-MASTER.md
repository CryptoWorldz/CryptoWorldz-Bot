# WorldzLaunchPad™ Multichain Treasury Master

Version: 2026-09-21 — WORLDZ-TREASURY-1

## Locked Governance

WorldzLaunchPad uses chain-native treasury wallets under one common governance policy.

- **Worldz Operations Treasury:** 10 signers, **5-of-10** approvals.
- **Worldz Reserve Treasury:** 9 signers, **6-of-9** approvals.
- Worldz policy never requires more than **6 approvals** for either treasury.
- Private keys, seed phrases and recovery material must never be committed to GitHub.
- Each blockchain has its own treasury address. There is no fake "universal address".

## Fee Route

WorldzLaunchPad receives **10% of the collected supported project trading-fee revenue only**.

It does **not** take 10% of token supply, initial liquidity, or ordinary wallet transfers.

Route:

`Supported launch fee -> chain Operations Treasury (5-of-10) -> approved reserve sweep -> chain Reserve Treasury (6-of-9)`

## Chain Standard

| Chain family | Operations | Reserve | Provider |
| --- | --- | --- | --- |
| Solana | 5-of-10 | 6-of-9 | Squads v4 |
| EVM (Ethereum, Base, BNB, HyperEVM and supported EVM chains) | 5-of-10 | 6-of-9 | Safe Smart Account |
| XRP Ledger | 5-of-10 | 6-of-9 | Native SignerList multisigning |
| Sui | 5-of-10 | 6-of-9 | Native Sui multisig |

## Solana Migration

The existing verified Team Zed Treasury remains the current Solana vault:

- Squads multisig config: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault index: `0`
- Vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Current verified governance: **2-of-3**
- Target governance: **5-of-10**

The vault is not represented as upgraded until the existing Squads threshold approves the member additions and threshold change on-chain. Mainnet fee routing stays disabled until that proof exists.

## Activation Gate

No chain's public mainnet fee routing activates until:

1. Signer public addresses are registered and independently checked.
2. The chain-native Operations Treasury is proven at 5-of-10.
3. The exact Worldz 10% fee-only route is proven end-to-end.
4. The treasury destination is verified on-chain.
5. The applicable Worldz Safe Launch and mainnet release gates pass.
6. Human authorization is completed.

The Reserve Treasury is separately deployed at 6-of-9 and receives funds only through approved treasury transactions.
