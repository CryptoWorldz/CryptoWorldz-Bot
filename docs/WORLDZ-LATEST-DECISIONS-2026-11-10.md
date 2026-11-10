# WORLDZ latest-instruction reconciliation — 2026-11-10

This document supersedes older *planning* instructions when they conflict with the founder's latest requests. It does not override verified deployed chain state or grant signing authority.

## Decision register

- **Brand:** WORLDZ Incorporated, WorldzLaunchPad and Purple Diamond Crew; SPARKY @SparkyWorldzBot; public raid label Worldz Raidz. Preserve legacy API/database identifiers as internal compatibility aliases, not active marketing.
- **Token:** proposed new flagship Worldz / $Worldz, fixed supply 100,000,000. WLDZ and RVIV are historical, not active flagship names. Do not destroy old token records, holders' evidence, or transaction receipts.
- **Liquidity allocation:** competing PR #429 (30%) and PR #407 (40%) are both *unmerged proposals*. Neither overrides the other by default. Maintain 100M genesis in planning-only status, preserve both proposals for comparison, and do not mint or distribute while this material allocation is unresolved. A 40% liquidity reserve is a defensible cross-chain planning scenario but is not an executed or irrevocably approved token allocation. The rest of the 11-bucket plan must be rebalanced before any supply commitment.
- **Chain priority:** Solana first, XRP/XRPL second, followed by independently validated adapters; no unverified wrapped-asset backing claim.
- **Treasury:** developer-controlled future custody is the latest founder decision; no mandatory new community multisig. Existing multisig wallet contracts and previous commitments are historical evidence and cannot be silently changed. Mainnet fee routing remains disabled until destination ownership, secure custody and end-to-end evidence are verified. The 50/30/20 revenue treasury lane is not a token genesis allocation.
- **Fees:** current public policy: supported 0.25% minimum, 1% default, 3% cap with venue-specific limitations; Worldz's 3/5/8% share is of *collected eligible project trading-fee revenue*, not of every trade. Do not revive stale 90/10 public claims.
- **Raids:** replace public manual I RAIDED reward-claim UX with evidence-gated verification; do not award points solely because someone opened a link. Preserve old callback and submissions as compatibility data until the new attribution route has end-to-end evidence. X credits exhausted => fail closed without retry spend.
- **SPARKY referral rewards:** proposed $5-equivalent, cap 20 per Legend, 7-day qualification, planning ledger only; disabled campaign, no mint, no payout.
- **LaunchPad:** retain the full functional builder restored in merged PR #433; selectively integrate PR #430 purple Fee Studio UI only after regression testing, mobile QA, and wallet custody wording review.
- **Funding:** protect limited budget; avoid unauthorized payments, token transfers, live reward commitments or unverifiable donation claims.

## Verified conflicts and code actions

- `src/ronald-raider.js` previously displayed the manual I RAIDED callback. This reconciliation branch removes the public button and makes proof-pending messaging explicit while preserving the old handler for backwards compatibility.
- `src/telegram.js` previously advertised manual I RAIDED completion and WLDZ as WORLDZ. Updated the guidance to evidence-gated participation and labels WLDZ as historical.
- `src/grace/adapters.js` and `test/grace-core.test.js`: ported PR #432's non-retryable X API credit-exhaustion protection.
- **Remaining work:** implement and verify actual X-account attribution and API entitlement before any automatic RaidPoints; test/refine SPARKY referral migrations from PR #428; reconcile 30% vs 40% and verify recipient signer control before genesis; remove obsolete *future* mandatory multisig requirements through a tested migration; selectively integrate PR #430; verify main-branch Hostinger deployment and live Telegram behavior. These are not claimed complete.

## Safety release gates

`publicMainnetCreatorLaunchesEnabled` stays false. No new mint, token distribution, reward crediting, payout, wallet transfer, treasury route or paid X API call is authorized by this document.
