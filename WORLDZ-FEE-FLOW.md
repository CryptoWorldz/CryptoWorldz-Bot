# Worldz Fee Flow™ — Worldz-Owned Launch Standard

Version: `WORLDZ-FEE-FLOW-1`
Status: **current working default for Worldz-owned launches**

This file supersedes older Worldz-owned token fee-routing and initial-LP figures wherever they conflict with this standard. It does not change the separate public-creator WorldzLaunchPad platform rules.

## Collected supported trading-fee revenue

Route only trading-fee revenue actually collected/claimable through a supported Worldz-owned launch route. Ordinary wallet-to-wallet transfers carry no Worldz transfer tax.

- **10%** WorldzLaunchPad Treasury
- **30%** LP Growth
- **20%** Holders + Legacy
- **20%** Community / Growth / Marketing
- **10%** OneWorldz Impact
- **5%** Operations
- **5%** Reserve

Total: **100%**

## LP Growth deployment

The 30% LP Growth bucket is deployed from actual collected treasury receipts in four stages:

1. **20%** of the available LP Growth bucket
2. **25%**
3. **25%**
4. **30%**

Total deployed across the four stages: **100% of that available LP Growth bucket**.

Unused or gated value remains in its designated LP Growth vault until a later approved stage. No virtual, unpaired or unavailable value is described as real liquidity.

## Initial liquidity

Worldz-owned launches start with **15% of the fixed token supply active in LP at launch** and build from there.

Current Worldz launch control retains a further **20% designated staged liquidity reserve** for controlled additions. No extra token supply is minted to top up LP.

LP additions must use real matching quote liquidity and pass the applicable price-impact, slippage, treasury, lock and execution checks.

## REVIVE Legacy Revival snapshot

REVIVE fixed supply: **200,000,000 RVIV**.

Legacy Revival launch pool: **10% = 20,000,000 RVIV**.

Fresh snapshot:
- Batch: `4b7faa3f-c6cd-435f-9840-43a04cd090a0`
- Snapshot root: `b0a58be30c8323bf22d57939cd989be6b1631f5dd17a682cd829d0cc6a85e548`
- Legacy assets: **10**
- Positive legacy token-account rows: **239**
- Unique eligible snapshot-owner wallets: **216**
- Status: **COMPLETE**

Distribution:
- **50% of the 20M RVIV pool** is divided equally across eligible unique snapshot-owner wallets.
- **50%** is distributed using square-root weighting of normalized historical legacy holdings.
- Claim requires proof of control of the snapshot owner wallet.
- Unclaimed or non-signable entitlements remain reserved; they are not silently redistributed.

The entitlement ledger reconciles to exactly **20,000,000 RVIV**.

## Mint and launch sequence

1. Mint **#001 WORLDZ — WLDZ — 100,000,000**
2. Mint **#002 REVIVE — RVIV — 200,000,000**
3. Mint **#003 PHENIX — PNEX — 250,000,000**
4. Mint **#004 MIRACLE — MRCL — 348,000,000**
5. Launch **WORLDZ** with the current Worldz-owned launch controls.

Each genesis mint remains fixed-supply. Mint and freeze authorities are permanently revoked after the required metadata/finalisation stage. Mainnet wallet approvals remain explicit and cannot be bypassed.
