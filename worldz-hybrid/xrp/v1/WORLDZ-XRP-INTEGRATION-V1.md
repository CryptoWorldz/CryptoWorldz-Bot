# WORLDZ XRP Integration V1 — Solana-first hybrid
Status: PROPOSED / RESEARCH / NO MAINNET TRANSACTIONS
Date: 2026-10-28
Owner: WORLDZ INCORPORATED™
Priority: Solana #1 → XRP ecosystem #2 (wXRP pair → XRPL EVM → native XRPL).

## 0. Scope and hard constraints
- New asset: WORLDZ ($WORLDZ), distinct from historical WLDZ/RVIV. Do not delete their historical on-chain records.
- Proposed global genesis: 100,000,000 WORLDZ, 6 decimals, classic SPL on Solana. **No mint address exists or is claimed here.**
- **Liquidity reserve: exactly 40% = 40,000,000 WORLDZ globally**; not 40% on each network, and not a mandate to deploy it all on day one.
- Illustrative future reserve accounting: up to 5% of supply per each of eight network markets (8 × 5% = 40%), subject to secure bridges and supported markets. Allocated reserve != circulating/pooled supply.
- Prefer testnet/read-only quote paths; no wallet signature, asset movement, automatic deployment, or live LP provision from this document.
- No ordinary-wallet transfer tax. No promised returns. Fully disclose allocations, vesting and LP control.
- WORLDZ Chain remains future separate L1 *project*, not a presently supported route or extra supply.

## 1. Source verification register
Official sources:
- Hex Trust wXRP issuer description: https://www.hextrust.com/resources-collection/hex-trust-to-issue-and-custody-wrapped-xrp-wxrp
- Hex Trust live service/status page: https://www.hextrust.com/services/wrapping/wxrp
- Jupiter current API documentation: https://dev.jup.ag/docs/ and https://api.jup.ag/swap/v1/quote (API key required; confirm currently supported Swap version)
- XRPL token tutorial: https://xrpl.org/docs/tutorials/tokens/fungible-tokens/issue-a-fungible-token
- XRPL EVM official mainnet deployments: https://docs.xrplevm.org/pages/bridge/deployed-contracts-mainnet

**Important contradictory evidence:** Hex Trust's public wXRP service page has displayed 'Solana Coming Soon' even though other announcements describe an April 2026 Solana rollout. Treat actual on-chain liquidity and issuer-confirmed Solana mint as UNVERIFIED until checked on the issuer's current official channel and on-chain RPC. Do not adopt a mint merely because a wallet or aggregator labels it 'verified'. A previously surfaced candidate `6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2` remains **UNVERIFIED CANDIDATE — NEVER AUTO-TRADE**.

## 2. Solana wXRP pair verification (read only)
1. Obtain mint from Hex Trust-controlled documentation/support with timestamp and link; compare it to Token Program owner, supply, decimals, mint/freeze authorities and token metadata using independent Solana RPC.
2. Query independent indexer/Jupiter discovery for existence, quote liquidity, route venues, spread and historical depth; independently validate issuer/reserve/redemption terms (institutional restrictions may apply).
3. Alert when no usable market exists. Quote routes are evidence of trading possibility, not a claim of reserves/redemption.
4. Do not initiate trades until WORLDZ canonical mint exists, issuer confirmation passes, and risk/security signoff is recorded.

## 3. Jupiter integration / quote acceptance
- Runtime configuration: JUPITER_API_KEY stored in secret manager, never repo or client bundle. HTTPS server-side quote gateway with rate limiting.
- Detect and pin the *current supported* Jupiter quote endpoint/version from official docs. Legacy Metis `GET /swap/v1/quote` is documented but may be superseded by Swap V2; do not assume old endpoints remain production supported.
- Query WORLDZ mint ↔ issuer-verified wXRP mint with exact input base units. Validate expected input/output mint, amount, slippage limit, quote freshness, time to live, venue and route plan.
- Read-only results: outAmount, impact, route, effective price, failure reason and timestamp; retain no secrets.
- Test cases: absent WORLDZ mint, incorrect/unknown wXRP mint, zero liquidity, API 401/429/5xx, stale quote, extreme price impact, swapped decimals, oversized amounts. Fail closed.
- Completion proof: reproducible quote response plus exact timestamp, chain, mint IDs, API version and market-depth caveats. **No Jupiter success claimed yet.**

## 4. Initial pool simulation (no deposits)
- Starting budget to analyse: US$200 *paired-asset side* for Solana WORLDZ/wXRP, NOT a guaranteed launch price. AUD/USD conversion needs explicit treatment when budget is in AUD.
- For simple equal-value full-range starting estimate: `WORLDZ_amount = USD_quote_value / proposed_WORLDZ_USD_price`. At $0.045, $200 pairs with ~4,444.44 WORLDZ; at $0.0002, $200 pairs with 1,000,000 WORLDZ.
- Concentrated-liquidity AMMs have different position maths and out-of-range risk. Use selected pool's native simulator/SDK; don't treat the simple estimate as an actual deposit quote.
- Report exact price, decimal adjustment, market depth, slippage for buys *and sells*, expected fees, impermanent-loss exposure, pool ownership, LP position lock rules, and reserve remaining.
- Never confuse 40% designated reserves with 40% actively pooled.

## 5. XRPL EVM contract design (research/testnet)
- Consider ERC-20 WORLDZ representation governed by auditable bridge mint/burn permissions, strict access controls, rate limits, pause and independent multisig, or a suitable standard adapter proven compatible.
- No standalone unrestricted 100M mint. Define escrow or burn provenance and redemption back to Solana; each issued remote WORLDZ must have backed source liability.
- Verify actual XRPL EVM chain ID/RPC, gateway and deployer details from official documentation at implementation time.
- Axelar deployed gateway and ITS addresses are documented at https://docs.xrplevm.org/pages/bridge/deployed-contracts-mainnet ; presence of contracts **does not** prove a direct Solana→XRPL EVM WORLDZ route.
- Test malicious replay, message reordering, duplicate mint, failed redemption, bridge outage and admin-key compromise. Require third-party audit for mainnet.

## 6. Native XRPL testnet issued asset
- Use XRPL Testnet faucet, dedicated **cold issuer** and separate **hot distributor**. Use 160-bit hexadecimal currency encoding for 'WORLDZ' if necessary (5+ character codes), not assume a 3-letter ISO code.
- Receiver creates TrustSet trust line to the exact issuer+currency code; use issuer-domain, authorized trust line/freeze flags carefully and document policy.
- Issue test tokens from cold issuer to a hot wallet only after correct trust line setup. Test recipient trust lines, Payment, offers on native DEX and AMM funding prerequisites on testnet.
- Never treat XRP Ledger's native IOU issuance as the same thing as a mintable Solana SPL asset. Production issuer must have transparent collateral/bridge liability rules, and a verified redemption process.
- Mainnet issuer configuration and 'no freeze' claims must be reviewed before any irreversible flag settings.
- Test results must record transaction hashes, issuer address, currency hex, TrustSet proof, account reserve, and flows for issue, trade and redeem.

## 7. Global supply invariant (bridge ledger)
For the fixed 100M origin model with escrow:
`effective_global = Solana_total_minted - Solana_bridge_escrow + sum(valid_remote_outstanding)`
and require `effective_global <= 100,000,000` at all times, including in-flight liabilities and redemptions. Count any separately burned origin tokens appropriately; do not count an escrowed original and its backed representation twice.
- Every cross-chain operation gets unique nonce/message ID, chain IDs, tx hashes, origin escrow/burn amount, destination mint, finality evidence, status, and reconciliation snapshots.
- Indexers are monitoring/evidence tools, **not** trust anchors or independent mint authority. On mismatch pause all new mints and transfers, preserve evidence, notify multisig.
- Unbacked native-XRPL-issued tokens must not be presented as canonical WORLDZ.
- Explicitly handle wrapped-XRP liquidity separately: wXRP is *quote asset* exposure, not a bridge/collateral for the WORLDZ supply unless independently designed.

## 8. Repository architecture proposed
`worldz-hybrid/xrp/v1/` contains this specification.
Next PRs (none authorised here):
- `config/networks.json`: verified chain IDs/endpoints and operational status.
- `config/tokens.json`: immutable canonical IDs and verification references (unknowns null).
- `src/quotes/jupiter.ts`: read-only server quote integration.
- `src/simulate/solana-pool.ts`: no-send pool estimator.
- `src/supply/reconcile.ts`: independent balance reconciliation.
- `tests/`: unit, integration, testnet, adversarial and failure-gate evidence.
Never bundle live RPC secrets, signing keys or recovery phrases.

## 9. Release gates
G0: published tokenomics including fixed 40% LP reserve, community/founder/treasury disclosures and vesting, distinct destination addresses.
G1: independently verified issuer-backed wXRP mint; eligible redemption and risk disclosures.
G2: read-only Jupiter route evidence for real WORLDZ mint and verified wXRP; realistic quotes, both directions.
G3: Solana genesis devnet full distribution, authority-revocation and LP-lock proofs; before mainnet, security and legal review.
G4: XRPL EVM bridge testnet invariant proofs and independent audit.
G5: Native XRPL issuer testnet proofs, bridge backing and redemption; issuer settings reviewed by independent auditor.
G6: every mainnet transaction requires explicit multisig/human approval with amount limits, rollback/incident plan and signed manifest.

## 10. Relationship to existing Worldz standards
- `WORLDZMINT-STANDARD.md` already specifies classic SPL, 6 decimals, revoked authorities, LP 25–60%, community >=20%, independent verification. This plan fixes WORLDZ-specific LP at 40%.
- `WORLDZLAUNCHPAD-SAFE-LAUNCH-STANDARD.md` describes *platform-wide* creator rules and LP lock gates; WORLDZ tokenomics are a distinct project.
- `WORLDZ-FEE-FLOW.md` is launchpad revenue routing, **not** WORLDZ genesis allocation; historical WLDZ/RVIV routes may require a separate policy change, never silent deletion.
- Do not alter live infrastructure or existing token authorities via this documentation-only PR.
