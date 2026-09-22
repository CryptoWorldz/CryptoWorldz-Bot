# WORLDZ $WLDZ — Mainnet Launch Candidate

Status: PREPARED / NOT SIGNED / NO VALUE MOVED
Version: 2026-09-22-WLDZ-FLASH-1

## Canonical token

- Name: WORLDZ
- Symbol: WLDZ
- Mint: `AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U`
- Supply: 100,000,000 WLDZ
- Decimals: 6
- Token program: classic SPL Token
- Mint authority: revoked
- Freeze authority: revoked
- Genesis status: verified_fixed_supply
- Supply vault: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Current Squads multisig: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault index: 0
- Current governance threshold: 2-of-3

## Launch engine

Use **Meteora DAMM v2 one-sided WLDZ/wSOL launch** with the already-minted canonical WLDZ.

This is the Worldz Flash-style route for WLDZ:
- no second WLDZ mint;
- no presale;
- no ordinary wallet-transfer tax;
- WLDZ is deposited as the one-sided base asset;
- initial quote amount is zero;
- buyers add real SOL/wSOL into the pool as trading starts;
- the concentrated price range creates capital-efficiency / virtual-reserve effect;
- UI/accounting must never describe the virtual/concentrated representation as real withdrawable SOL liquidity.

### Why not Meteora DBC for canonical WLDZ

Meteora DBC's current SPL pool initializer creates the base mint account as a new signer account. Canonical WLDZ already exists and has its mint authority revoked. Therefore DBC cannot be used for this exact mint without creating a second token. A second WLDZ mint is prohibited.

Worldz Curve / Curve Pro can remain available for future tokens that are created through that launch path.

## Candidate launch controls

- Venue: Meteora DAMM v2
- Program: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`
- Pair: WLDZ / wSOL
- Quote mint: `So11111111111111111111111111111111111111112`
- Initial active WLDZ ceiling: 15,000,000 WLDZ = 15% of fixed supply
- Candidate base amount: 15,000,000 WLDZ
- Initial quote amount: 0 SOL
- Candidate opening price: 0.000001 SOL per WLDZ
- Candidate opening FDV: 100 SOL
- Fee collection: quote side / Token B only
- Base trading fee: 200 bps / 2.00%
- Dynamic fee: disabled for first launch
- Activation: explicit mainnet authorization only
- Alpha Vault: disabled in candidate
- Position liquidity: permanently lock after pool creation
- Position fees: remain claimable while liquidity is permanently locked
- Staged liquidity reserve: 20% remains outside active launch position; no extra minting

## Fee revenue route

Worldz-owned collected supported trading-fee revenue:
- 10% WorldzLaunchPad Treasury
- 30% LP Growth
- 20% Holders + Legacy
- 20% Community / Growth / Marketing
- 10% OneWorldz Impact
- 5% Operations
- 5% Reserve

Only actual collected/claimable revenue is routed.

## Treasury execution rule

The 15M WLDZ is currently owned by the Squads vault. It must not be passed through a personal hot wallet merely to create the pool.

The launch transaction should be proposed as a **Squads v4 vault transaction** from vault index 0. The vault creates/funds the one-sided Meteora position and retains control of the position NFT until it is permanently locked.

Current launch approval requirement: 2-of-3 Squads approvals.

## Release gates before any signature

1. Build exact Meteora DAMM v2 one-sided pool transaction from canonical WLDZ.
2. Simulate the full transaction against mainnet state.
3. Prove exactly 15,000,000 WLDZ is the maximum active launch deposit.
4. Prove quote amount starts at zero.
5. Prove 2.00% quote-side fee configuration.
6. Build permanent-lock transaction for the resulting position.
7. Wrap the value-moving transaction in a Squads vault proposal.
8. Display exact pool, position, price range, fee settings and token movement before any user signature.
9. No transaction executes until the required Squads approvals are reached.

## Truth rule

No second WORLDZ mint. No fake SOL reserve. No claim that concentrated/virtual reserves are real cash liquidity.
