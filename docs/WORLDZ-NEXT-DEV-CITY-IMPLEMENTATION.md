# WORLDZ flagship + Dev City: implementation foundation

Status: **draft / research only**, no mint, transfers, deployment, or fee collection authorized by these files.

## Existing components reused
- `tools/worldz-dev-city-discovery.mjs`: collects public Solfate DevList members.
- `tools/worldz-launch-record-creators.mjs`: Bitquery on-chain creator-signature research; requires BITQUERY_ACCESS_TOKEN.
- `launchpad.cryptoworldz.xyz/dev-city-top-100.v1.json`: existing directory and reported historical research snapshot.
- `launchpad.cryptoworldz.xyz/dev-city-launchpad-20-research.v1.json`: platforms listed, not proven top twenty.
- `worldzpad-mainnet/tokenomics/worldz-token-dna.v1.json`: general token-launch safe-design engine.

## Flagship migration
New $WORLDZ is **not** the historical WLDZ mint. Do not replace history with misleading data, delete old token proof records or redirect existing holder links without clearly marking legacy status. REVIVE is deferred; disable any active distribution after a dedicated review. Never reuse lost-signature dev wallet automatically.

## Build sequence
1. Add public Dev City list read-only from verified on-chain or developer registry records; show evidence and provenance.
2. Import launch records on a scheduled, rate-limited ingestion job with retries, deduplication and schema tests; separate signer from proven developer identity.
3. Add developer wallet signature-claim flow, consent and manual review; no unsolicited token sending.
4. Build $WORLDZ allocation calculator including vesting, circulating float, liquidity quote capital, and price sensitivity.
5. Review wallet recovery and existing 3-of-5 multisig signer replacement feasibility *before* creating a new treasury.
6. Test actual Meteora/Raydium/Jupiter fee paths: 1.25% is an aspirational all-in target, never a guaranteed universal tax or fee.
7. Assess Solana token-program fee compatibility and multi-chain representation; do not create independent supply on 8 chains.
8. Obtain legal and security review, CI checks, staged deployment and explicit launch authorization.

## Economics notes
Allocation percentages sum to 100. 100 Dev City slots x 0.2% = 20%. Initial LP tokens are 3% and later LP reserve is 27%, not a claim that 30% is immediately liquid. The price target US$0.045 does not imply executable liquidity. Burn cannot guarantee price appreciation. Fees paid to other DEX/protocols cannot be controlled unilaterally.

## Safeguards
- All artifacts in this change are configuration and planning files, **not active mint wiring**.
- Keep historical WLDZ and RVIV evidence available, label separately.
- No private keys, seed phrases or signing keys in this repository.
- Do not show unverified wallets as Worldz-approved or Worldz partners.
