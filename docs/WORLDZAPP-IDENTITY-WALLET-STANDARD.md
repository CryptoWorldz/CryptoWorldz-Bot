# WorldzApp™ Identity + External Wallet Standard v1

Status: **CODE BUILT — STAGE 3 FOUNDATION / NO SIGNING AUTHORITY**  
Date: **2026-09-27**  
Parent: **WorldzFullBuild™**

## Core identity rule

WorldzApp separates three states that must never be collapsed:

1. **wallet connected** — a wallet exposed a public account to the app;
2. **wallet control verified** — a future user-approved challenge signature proves control of that public account;
3. **treasury signer authority** — a separately approved treasury-specific role plus actual chain-native multisig membership.

A wallet connection does not prove a person's real-world identity and does not grant treasury authority.

## Session model

WorldzApp browser sessions are session-only by default.

Allowed session data:

- random session identifier;
- public identity label/role;
- public wallet address;
- chain/network;
- wallet/provider label;
- non-sensitive capability view;
- connection/control-proof status.

Forbidden:

- seed phrase;
- mnemonic;
- private key;
- recovery phrase;
- hardware-wallet secret;
- wallet unlock password/access code;
- exported signing key.

Public-address persistence beyond the browser session requires explicit consent.

## EVM connection path

WorldzApp implements public-account connection through:

- **EIP-6963** multi-provider discovery where available;
- **EIP-1193** provider requests;
- legacy `window.ethereum` only as a fallback when EIP-6963 discovery yields no provider.

Stage 3 requests only public accounts and chain ID. No EVM transaction-signing or broadcast method is implemented.

## Solana connection path

Preferred mobile/web direction:

- Solana Wallet Standard;
- Solana Mobile Wallet Standard / Mobile Wallet Adapter registration for mobile browser/native handoff.

The current no-dependency web foundation also contains a legacy injected-provider public-account fallback so existing browser wallets can connect to WorldzApp without requiring the user to paste Worldz URLs inside a wallet browser.

Signing remains disabled.

## WalletConnect

WalletConnect/AppKit is the planned remote/mobile connection layer for supported wallets.

Requirements before enabling:

- WorldzApp project configuration;
- approved application metadata/domain;
- mobile deep-link testing;
- QR testing;
- session expiry/disconnect handling;
- chain allow-list;
- no signing capability exposed until the later simulation/approval stage.

## WorldzCard™ / Tangem

Tangem remains the first WorldzCard™ hardware/card integration research target.

Current official Tangem material documents WalletConnect support for Solana and supported EVM networks. WorldzApp therefore treats Tangem as a compatible external-wallet connection research path, not as a partnership and not as a Worldz custody provider.

Keys remain inside the Tangem wallet/device.

## XRPL

Xaman is the first XRPL external-wallet integration research target because its developer platform supports account interaction and signing-request flows.

Stage 3 does not embed Xaman credentials or signing. App registration and a dedicated connector remain a gated follow-up.

## Sui

Use the current Sui dApp Kit generation:

- `@mysten/dapp-kit-core`
- `@mysten/sui`

The legacy dApp Kit tied to deprecated JSON-RPC must not be introduced.

## Telegram / Command Centre identity

Telegram identity may be federated into WorldzApp later, but:

- Telegram login is not wallet-control proof;
- Telegram admin role is not treasury signer authority;
- treasury signer membership remains treasury-specific and chain-native.

## Current implemented browser capability

The current browser foundation can:

- create a session-only public WorldzApp session;
- discover EIP-6963 EVM providers;
- request an EVM public account and chain ID through EIP-1193;
- connect a legacy injected Solana provider as a fallback;
- display the connection as `CONNECTED_UNVERIFIED_CONTROL`;
- clear the browser session.

It cannot:

- sign a transaction;
- sign a message/control challenge;
- broadcast a transaction;
- change multisig signers;
- bridge, swap or stake;
- grant treasury signer authority.

## Next gates

1. integrate Solana Mobile Wallet Standard;
2. integrate WalletConnect/AppKit project configuration;
3. integrate Sui dApp Kit v2;
4. design Xaman XRPL app registration/connector;
5. build challenge-signature control proof;
6. only then proceed to transaction simulation and multisig approval infrastructure.
