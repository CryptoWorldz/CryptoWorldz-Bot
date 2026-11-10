# WORLDZ / WorldzLaunchPad — Solana Foundation funding proposal
Date: 2026-11-10
Status: DRAFT — not submitted, no funding committed
Applicant: Worldz Incorporated / WorldzLaunchPad (legal entity and ABN to be confirmed)
Mission: Ending World Hunger — INVEST • BUILD • HELP

## Project overview
WorldzLaunchPad is a proposed public multi-chain token-launch infrastructure project. This funding application is specifically for reusable Solana public-good tooling: launch-proof verification, reproducible token-authority/supply checks, safe wallet connection patterns, and developer documentation. It is NOT a request to purchase $WORLDZ tokens or finance speculative trading liquidity.

## Existing evidence (do not overclaim)
- Repository: https://github.com/CryptoWorldz/CryptoWorldz-Bot
- Wallet AUTO read-only gate passed: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/42736421837
- FullScope AUTO read-only gate passed: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/42687881395
- Jupiter authenticated Price V3 smoke passed: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/42654645070 (price read only, NOT trading)
- Solana devnet isolated mint rehearsal failed: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/42639777778 (RPC faucet 410 Gone). No verified successful $WORLDZ devnet mint from this run.
- Supabase integration and infrastructure described in docs/WORLDZ-ECOSYSTEM-GITHUB-SUPABASE-JUPITER-AUDIT-2026-11-10.md; point-in-time audit only.
- No claim of production token mint, mainnet launch, deployed swap execution, verified LP funding, or completed hunger-relief outcomes.

## Public good and why Solana
Create reusable, openly documented Solana Token-2022 supply/authority verification, reproducible safe-launch receipts, and developer-facing checks that any Solana creator can use independently of WorldzLaunchPad. Solana-specific work involves SPL Token/Token-2022 mint authorities, account proofs and Solana transaction verification. Separate commercial launchpad services and Worldz token activities from the public-good scope.

## Proposed 12-week milestones
1. Weeks 1–4: Reproducible offline/test fixtures and chain-specific token-supply/authority proof checker. Deliverables: open-source checker, automated tests, evidence format, threat model.
2. Weeks 5–8: Wallet public-identity verification and non-signing safety checks; third-party review of security assumptions. Deliverables: test reports, user-facing proof receipts, documented limitations.
3. Weeks 9–12: Public developer documentation, example integrations, release audit, measurable adoption reporting. Deliverables: public docs, examples, published CI evidence and demonstration.

## Illustrative budget (USD; refine against supplier quotes and grant terms)
- Security and launch-proof validation: $8,000
- Solana integration and test infrastructure: $6,000
- Open-source developer tools and documentation: $5,000
- Testing, accessibility and reporting: $4,000
- Infrastructure and contingency: $2,000
Total requested: $25,000 USD. This is a proposed ask, not a funding commitment or approved cost.

## Funding and compliance boundaries
- No proceeds for speculative token liquidity, automated token buying, or guaranteed returns.
- Donation/impact funds, commercial revenues, grants and token treasury are separately accounted for.
- Determine Australian legal entity, ABN, ownership of IP, open-source licensing and token/regulatory implications before submission.
- No unsupported claims of existing grants, partnerships, endorsements, beneficiaries, or independently audited security.

## Source and submission
Solana Foundation official grants and funding: https://solana.org/grants-funding
The Foundation considers milestone-based public-good grants and convertible grants where a commercial component exists. The application requires project overview, public-good contribution, budget and milestones. Application not yet submitted.

## Outstanding before submitting
Confirm applicant legal name and jurisdiction; primary contact; current GitHub open-source license; precise public-good deliverable ownership; realistic time/cost assumptions; team capabilities; and whether the grant should be standard or convertible. Review application terms before submission.
