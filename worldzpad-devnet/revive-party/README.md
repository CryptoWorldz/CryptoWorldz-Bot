# REVIVE WorldzParTy Devnet Proof

Disposable Solana devnet execution harness for REVIVE's MagicFeeNumber™ architecture.

This harness never uses the canonical mainnet RVIV mint and refuses a mainnet RPC URL.

It proves:
- Meteora DBC SDK accepts a fixed 75-bps curve with dynamic fee OFF;
- DBC fee ownership is 51% Creator / 49% Worldz partner;
- migrated DAMM v2 fee target is 75 bps with dynamic fee OFF;
- migrated LP distribution encodes 60% creator permanent lock + 40% partner permanent lock + 0% claimable = 100% permanent-lock target;
- 10 deterministic Legacy Flywheel PDA addresses derive uniquely;
- exact partner-router weights are 170 / 150 / 85 / 85.

The first on-chain stage creates a disposable DBC config, mint and pool using an ephemeral devnet keypair. No private key file is uploaded.

Later stages build on the resulting proof to execute holder accounting, fee claims/router payouts and migration evidence.
