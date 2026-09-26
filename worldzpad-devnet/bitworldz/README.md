# BitWorldz OmniBTC™ — Solana BTC-paired test rail

This directory is the executable research harness for the first BitWorldz launch rail.

## Target pipeline

```
Static safety proof
→ create 8-decimal mock-BTC SPL quote token on Solana devnet
→ revoke mock quote mint authority
→ create TOKEN/mBTC Meteora DBC BitPair
→ execute a small buy
→ execute a partial sell
→ read on-chain creator/partner fee accrual
→ calculate the Worldz partner-route preview
→ read pool reserves + migration progress
→ create BitProof receipt
→ run a separate read-only mainnet WBTC identity/DBC-compatibility probe
```

## Commands

```bash
npm install
npm run static-proof
npm run live-bitpair
npm run real-btc-compat
npm run bitproof
```

The live devnet step uses `SOLANA_RPC_URL` and optionally `DEVNET_PAYER_SECRET_JSON`. If no payer is supplied, it creates an ephemeral devnet payer and attempts faucet funding.

The read-only compatibility step uses the currently pinned Pump-supported Solana WBTC mint:

`3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh`

It performs **no mainnet transaction and uses no signer**.

## Proof boundaries

A successful pre-graduation run proves the exact devnet quote mint, DBC config/pool creation, buy/sell transactions, decoded fee accrual and current pool reserves.

It does **not** yet prove:

- a completed DAMM v2 graduation;
- actual post-graduation permanent-lock accounts;
- executed Worldz router transfers;
- that the pinned real WBTC mint can create a DBC pool under current token-badge/permission rules;
- bridge/custody/redemption safety for real Bitcoin;
- mainnet release.

Those are explicit later gates, not implied by a green devnet run.

## Safety

Mainnet execution is OFF. Mock mBTC has no Bitcoin backing and must never be represented as real Bitcoin.
