# Worldz workflow and bot repair audit — 26 October 2026

## Scope and evidence

Inspected all 95 workflow definitions on main, including YAML parsing and Python/Bash syntax in embedded run steps. GitHub lists 141 workflow records; 46 have no matching workflow file in this checkout (including a dynamic GitHub workflow). These historical records are not 46 extra deployed services. The repository contains 997 tracked files before this repair.

Read the latest 1,000 run records, then requested the most recent run for each remaining current workflow. Latest-run evidence was retrieved for 91 of 95 current workflows; four history requests returned HTTP 403. Snapshot totals: 67 success, 20 failure, 3 skipped, 1 unfinished, 4 unavailable. Historical success does not prove current production health. Failed-run logs were investigated for the bot, LaunchPad, deployment, wallet-discovery, publishing and contract-validation problems below.

## Confirmed blockers and repairs

| Area | Evidence | Repair or remaining requirement |
| --- | --- | --- |
| ZED / Command Centre / DIPSHIT server | Restore run 40258552214 uploads and builds successfully, then returns HTTP 503: `bootstrap_supabase_runtime ... HTTP 401`. Phase 1 run 40261048305 encounters the same failure. | Protected environment loader previously filled blank OPENAI_API_KEY only. Fill blank server and bot credential slots, preserve nonblank managed values, and recognize the same service-key aliases as deployment. Live recovery must still be verified after release; missing/inaccessible protected files or stale nonblank managed credentials remain possible. |
| Supabase authorization | Read-only SQL confirms anon cannot execute `zed_runtime_bootstrap` or `zed_runtime_authorized`; service_role can. Deployment preflight succeeds with its server key. | Keep the database restrictions. Do not grant public execution. Real-group owner lookup now uses the server credential instead of a public key. |
| LaunchPad deployment | Run 40261048280 fails `node --check` at evm/app.js:29 because literal backslash-n text appears between statements. | Replace with real newlines. |
| Website guides | Syntax inspection finds invalid escaped JavaScript quotes in six worldz-guide.js copies. | Repair all six copies. |
| Syntax gate | `find ... -exec node --check {} +` passes multiple filenames to a command which checks only one entry file. | Check every tracked JS/CJS/MJS file separately, and every LaunchPad JS file before upload. |
| Launch inheritance | Run 39503677749 fails because the public inheritance contract still says 0.5 while platform policy says 0.25. Reproduced locally. | Synchronize the public configurable minimum to 0.25 in both inheritance copies; retain historical V2 values. Validator passes. |
| HQ / Live transport | Run 39532031655 times out connecting to SFTP. Workflow automatically treats FTP_PASSWORD as SFTP_PASSWORD. | Require an explicit SFTP_PASSWORD for SFTP; otherwise use the existing verified-TLS FTPS path. A reachable server and certificate-matching FTP_TLS_HOST/FTP_HOST remain deployment requirements. |
| Live checks race deployment | Phase 1 previously started on source push while production was still old or broken. | Start after successful runtime or LaunchPad deployment, with concurrency cancellation. |
| Redundant uploads | LaunchPad edits trigger full ecosystem deployment even though its uploader targets other roots. | Remove LaunchPad path from ecosystem trigger; retain dedicated LaunchPad deployment. |
| Live group test messages | Synthetic group proofs automatically run during ordinary changes. | Make both group-message proof workflows manual; suppress automatic owner notice unless explicitly opted in. |
| Optional GitHub Pages | Run 39373478354 returns 404: GitHub Pages publishing is not enabled. | Make this optional fallback manual. Hostinger remains the production route; enabling Pages is not necessary to repair the bots. |
| Solana holder discovery | Run 39510513511 reports HTTP 429 from public RPC providers. Script supports SOLANA_RPC_URL but workflow never passes it. | Pass a protected SOLANA_RPC_URL and use the production environment. A functioning RPC endpoint/quota is still needed. |
| On-chain creator discovery | Run 39515573193 has no BITQUERY_ACCESS_TOKEN. | Use the protected production environment. A valid configured Bitquery token is still needed; no credentials or wallet addresses are fabricated. |
| Pump.fun creator discovery | Run 39513600283 gets HTTP 429. | External API quota/access remains unresolved; repeated blind reruns do not repair it. |
| X publishing | Runs 35937034566 and 35835358260 report missing protected X connection/credentials. | Requires a valid authorized X connection. No social messages/posts were sent as part of this audit. |
| Solscan submission | Run 35827661174 stops at Cloudflare security verification. | Human verification or an officially supported submission route is needed; do not bypass the challenge. |
| Legacy Mission Priority | Run 35416454473 failed decoding a base64 image asset. | Historical builder failure; not rerun against production during bot repair. |
| Legacy NextGen | Run 36956094346 reports /ecosystem/ HTTP 404 while listed other routes pass. | Old generated-route mismatch, not proof of a bot failure. Needs separate current route verification before reuse. |
| OneDrop | Run 36977184453 times out in the Android wallet UI smoke test before deployment. | Remains gated; requires a dedicated browser/runtime investigation. |
| Registry noise | Registry watch runs hourly alongside six-hourly registry audits. | Reduce watch to six-hourly (20 fewer scheduled runs per day). |

## Validation and release boundary

443 Node tests pass locally. All 320 pre-existing tracked JavaScript files pass syntax checks; the new checker also passes. Repository structure and launch-inheritance validators pass. Workflow YAML and embedded Python/Bash syntax pass. Initial PR checks caught a stale assertion expecting automatic group proof; it was updated to enforce deliberate manual dispatch and the full suite was rerun.

No production deployment or bot recovery is claimed. Automatic approval review rejected the direct main push because it would trigger production deployments and live bot changes. Repairs are isolated in PR #397; release approval is required. After approval: merge the tested change, observe runtime/LaunchPad deployment, require HTTP 200 healthy runtime, verify both webhook URLs and authentication, then verify replies with an explicitly authorized test. Do not delete queued Telegram updates or historical run evidence.

## All current workflow definitions

The trigger column describes the repaired branch. Last-run results describe the historical snapshot, not the repaired branch CI.

| Workflow | Triggers | Last observed result | Run |
| --- | --- | --- | --- |
| actions-artifact-cleanup.yml | workflow_dispatch, push, schedule | success | [run 40176842607](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40176842607) |
| announce-wldz-canonical.yml | push, workflow_dispatch | success | [run 35827116551](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35827116551) |
| announce-worldzlaunchpad-global.yml | workflow_dispatch | success | [run 35831288512](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35831288512) |
| audit-wldz-owner-direct-control.yml | push, workflow_dispatch | success | [run 35719408464](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35719408464) |
| audit-wldz-owner-flow.yml | workflow_dispatch, push | success | [run 35705010312](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35705010312) |
| audit-wldz-spending-limits-public-rpc.yml | workflow_dispatch, push | success | [run 35719206877](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35719206877) |
| audit-worlddexpush.yml | pull_request, workflow_dispatch | success | [run 36977184487](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36977184487) |
| audit-worldz-18-domains.yml | workflow_dispatch, push | success | [run 39530321732](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39530321732) |
| audit-worldz-dexscreener.yml | workflow_dispatch, schedule, pull_request, push | success | [run 40234643141](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40234643141) |
| audit-worldz-jupiter-vrfd.yml | workflow_dispatch, schedule, pull_request, push | success | [run 40232928050](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40232928050) |
| audit-worldz-mainnet-readiness.yml | pull_request, workflow_dispatch | success | [run 37240902200](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240902200) |
| audit-worldz-token-identity-onchain.yml | push, pull_request, workflow_dispatch | success | [run 36338823403](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36338823403) |
| bitworldz-solana-btc-devnet.yml | pull_request, push, workflow_dispatch | success | [run 36492492641](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36492492641) |
| community-suite-live-proof.yml | workflow_dispatch | skipped | [run 40259405505](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40259405505) |
| deploy-chain-gateways.yml | workflow_dispatch, push | success | [run 40044885057](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40044885057) |
| deploy-command-centre-miniapp.yml | push, workflow_dispatch | failure | [run 37258109234](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37258109234) |
| deploy-mission-priority.yml | push, workflow_dispatch | failure | [run 35416454473](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35416454473) |
| deploy-onedrop-live.yml | pull_request, push, workflow_dispatch | failure | [run 36977184453](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36977184453) |
| deploy-revive-distribution-launchpad.yml | push, workflow_dispatch | success | [run 36223632839](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36223632839) |
| deploy-revive-distribution.yml | push, workflow_dispatch | success | [run 36200021665](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36200021665) |
| deploy-revive-launch.yml | push, workflow_dispatch | success | [run 36184086714](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36184086714) |
| deploy-revive-launchpad-console.yml | push, workflow_dispatch | success | [run 36185631406](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36185631406) |
| deploy-revive-wallet-bridge.yml | push, workflow_dispatch | success | [run 36183737773](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36183737773) |
| deploy-spam2ham.yml | push, workflow_dispatch | success | [run 35479878788](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35479878788) |
| deploy-worldz-new-sites.yml | push, workflow_dispatch | failure | [run 39532031655](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39532031655) |
| deploy-worldzhq-live.yml | workflow_dispatch | failure | [run 38870040314](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/38870040314) |
| deploy-worldzlaunchpad.yml | push, workflow_dispatch | failure | [run 40261048280](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40261048280) |
| deploy-worldzlinkz.yml | pull_request, push, workflow_dispatch | success | [run 37240960341](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240960341) |
| deploy.yml | push, workflow_dispatch | in_progress | [run 40261048418](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40261048418) |
| diagnose-hostinger-dns.yml | workflow_dispatch, push | success | [run 39374306135](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39374306135) |
| diagnose-revive-distribution-runtime.yml | push, workflow_dispatch | success | [run 36200072977](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36200072977) |
| diagnose-revive-latest-approval.yml | push, workflow_dispatch | success | [run 36199393922](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36199393922) |
| diagnose-revive-recent-signatures.yml | push, workflow_dispatch | success | [run 36234610927](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36234610927) |
| diagnose-worldz-live-tls.yml | workflow_dispatch, push | success | [run 39530492977](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39530492977) |
| diagnose-worldz-public.yml | push, workflow_dispatch | success | [run 38870952804](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/38870952804) |
| full-audit-branch.yml | push | success | [run 34819185778](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/34819185778) |
| index-worldz-public-identity.yml | push, workflow_dispatch | success | [run 35831308548](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35831308548) |
| indexnow-worldzlaunchpad.yml | workflow_run | skipped | [run 40261065426](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40261065426) |
| nextgen-worldzecosystem.yml | push, workflow_dispatch | failure | [run 36956094346](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36956094346) |
| publish-donateworldz-masterpiece.yml | push, workflow_dispatch | success | [run 35416955409](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35416955409) |
| publish-heroes-now.yml | push, workflow_dispatch | success | [run 35389676108](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35389676108) |
| publish-mission-html-fast.yml | push, workflow_dispatch | success | [run 35416805295](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35416805295) |
| publish-worldz-github-pages.yml | workflow_dispatch | failure | [run 39373478354](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39373478354) |
| publish-worldzlaunchpad-x-direct.yml | workflow_dispatch | failure | [run 35835358260](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35835358260) |
| publish-worldzlaunchpad-x.yml | push, workflow_dispatch | failure | [run 35937034566](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35937034566) |
| repo-hygiene-audit.yml | workflow_dispatch, push, pull_request, schedule | success | [run 40258552263](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40258552263) |
| repository-integrity.yml | pull_request, push, workflow_dispatch | success | [run 40083267360](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40083267360) |
| restore-zed-auto-grace.yml | push, workflow_dispatch | failure | [run 40258552214](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40258552214) |
| revive-bulk-send-capacity.yml | push, workflow_dispatch | success | [run 36200706670](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36200706670) |
| rexsecure-appeal-freeze-live-proof.yml | push, workflow_dispatch | unavailable (HTTP 403) | — |
| rexsecure-confidence-live-proof.yml | push, workflow_dispatch | success | [run 37158552287](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37158552287) |
| rexsecure-runtime-scoring-live-proof.yml | push, workflow_dispatch | unavailable (HTTP 403) | — |
| submit-wldz-solscan.yml | push, workflow_dispatch | failure | [run 35827661174](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35827661174) |
| sync-grace-x-hostinger-env.yml | push, workflow_dispatch | success | [run 35868914725](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35868914725) |
| validate-onedrop.yml | pull_request | success | [run 36977184621](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36977184621) |
| validate-suiworldz-native.yml | push, workflow_dispatch, pull_request | success | [run 39531915244](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39531915244) |
| validate-worldz-bitworldz.yml | pull_request, push, workflow_dispatch | success | [run 36492492550](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36492492550) |
| validate-worldz-fullbuild.yml | pull_request, push, workflow_dispatch | success | [run 37240960337](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240960337) |
| validate-worldz-fullscope.yml | pull_request, workflow_dispatch | success | [run 37269575795](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37269575795) |
| validate-worldz-future-tokens.yml | pull_request, push, workflow_dispatch | success | [run 37017010282](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37017010282) |
| validate-worldz-launch-capabilities.yml | pull_request, workflow_dispatch | success | [run 39532201800](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39532201800) |
| validate-worldz-launch-inheritance.yml | pull_request, push, workflow_dispatch | failure | [run 39503677749](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39503677749) |
| validate-worldz-linked-assets.yml | pull_request, push, workflow_dispatch | success | [run 36275841111](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36275841111) |
| validate-worldz-omnichain.yml | push, pull_request | success | [run 37240960374](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240960374) |
| validate-worldz-proof-receipt.yml | pull_request, workflow_dispatch | success | [run 37240902103](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240902103) |
| validate-worldz-provider-handoffs.yml | pull_request, push, workflow_dispatch | success | [run 36338823449](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36338823449) |
| validate-worldz-superstack.yml | pull_request, workflow_dispatch | success | [run 40083267413](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40083267413) |
| validate-worldz-token-identity.yml | pull_request, push | success | [run 39532031667](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39532031667) |
| validate-worldz-universal-flywheel.yml | pull_request, workflow_dispatch | success | [run 36977184622](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36977184622) |
| verify-hostinger-worldz.yml | push, workflow_dispatch | failure | [run 39209509342](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39209509342) |
| wldz-allocation-step1.yml | workflow_dispatch, push | success | [run 36083695536](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36083695536) |
| wldz-live-state-guard.yml | workflow_dispatch, push | success | [run 36492492578](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36492492578) |
| worldspeaker-treasury-test.yml | workflow_dispatch | success | [run 35553816379](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35553816379) |
| worldz-bonk-revshare-discovery.yml | push, workflow_dispatch | success | [run 39514628132](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39514628132) |
| worldz-dev-city-discovery.yml | push, workflow_dispatch | success | [run 39512903744](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39512903744) |
| worldz-inbox-community-optin.yml | push, workflow_dispatch | success | [run 36972033527](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36972033527) |
| worldz-inbox-immediate-team-dm.yml | push, workflow_dispatch | success | [run 36971229250](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36971229250) |
| worldz-inbox-nonadmin-outreach.yml | push, workflow_dispatch | success | [run 37056381089](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37056381089) |
| worldz-launchpad-creator-discovery.yml | push, workflow_dispatch | failure | [run 39513600283](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39513600283) |
| worldz-launchpad-full-route-browser-audit.yml | push, workflow_dispatch | unavailable (HTTP 403) | — |
| worldz-launchpad-phase1-live-audit.yml | push, workflow_dispatch | failure | [run 37177915750](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37177915750) |
| worldz-onchain-launch-creators.yml | push, workflow_dispatch | failure | [run 39515573193](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39515573193) |
| worldz-phase1-production-proof.yml | workflow_run, workflow_dispatch | failure | [run 40261048305](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40261048305) |
| worldz-phase1-runtime-audit.yml | push, workflow_dispatch | success | [run 37113660864](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37113660864) |
| worldz-public-voice-ci.yml | pull_request, workflow_dispatch | success | [run 37269575753](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37269575753) |
| worldz-public-voice-live-proof.yml | push, workflow_run, workflow_dispatch | skipped | [run 40259405611](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40259405611) |
| worldz-registry-watch.yml | push, workflow_dispatch, schedule | success | [run 40253272762](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/40253272762) |
| worldz-squads-live-proof.yml | pull_request, push, workflow_dispatch | unavailable (HTTP 403) | — |
| worldz-wallet-discovery.yml | push, workflow_dispatch | failure | [run 39510513511](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39510513511) |
| worldzpad-devnet.yml | workflow_dispatch, push | success | [run 36492492384](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/36492492384) |
| worldzpad-mainnet-prep.yml | workflow_dispatch, pull_request, push | success | [run 37240960348](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/37240960348) |
| zed-hostinger-build-status.yml | push | success | [run 35554079577](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/35554079577) |
| zed-load-diagnostic.yml | push, workflow_dispatch | success | [run 39877666108](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39877666108) |
| zed-pr-verification.yml | pull_request, workflow_dispatch | success | [run 39532201817](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39532201817) |
| zed-start-real-group-proof.yml | workflow_dispatch | failure | [run 39877666104](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/39877666104) |

## Historical/dynamic workflow records without current source

- `.github/workflows/audit-live-wldz-rviv-lp-quote.yml`
- `.github/workflows/deploy-bitworldz.yml`
- `.github/workflows/deploy-oneworldz-attempt-4.yml`
- `.github/workflows/deploy-purplediamondcrew.yml`
- `.github/workflows/deploy-revive-rent-recovery.yml`
- `.github/workflows/derive-pnex-squads-vaults.yml`
- `.github/workflows/mission-branch-check.yml`
- `.github/workflows/mobile-visual-repair-proof.yml`
- `.github/workflows/phenix-full-devnet-proof.yml`
- `.github/workflows/phenix-launch-readiness.yml`
- `.github/workflows/recovery-check.yml`
- `.github/workflows/revive-existing-pool-readonly-audit.yml`
- `.github/workflows/revive-mainnet-readonly-preflight.yml`
- `.github/workflows/revive-party-devnet.yml`
- `.github/workflows/revive-squads-mainnet-cost-preflight.yml`
- `.github/workflows/revive-squads-mainnet-preflight.yml`
- `.github/workflows/revive-squads-rent-recovery.yml`
- `.github/workflows/revive-squads-rent-unlock-preflight.yml`
- `.github/workflows/revive-squads-spending-limits.yml`
- `.github/workflows/revive-treasury-control-readonly.yml`
- `.github/workflows/validate-legacy-flywheel.yml`
- `.github/workflows/validate-phenix-launch-prep.yml`
- `.github/workflows/validate-pnex-chance-vault.yml`
- `.github/workflows/validate-pnex-fee-router.yml`
- `.github/workflows/validate-pnex-final-package.yml`
- `.github/workflows/validate-pnex-pdh.yml`
- `.github/workflows/validate-pnex-staged-liquidity.yml`
- `.github/workflows/validate-pnex-streamflow-vesting.yml`
- `.github/workflows/validate-revive-v1.yml`
- `.github/workflows/validate-worldz-launch-quality.yml`
- `.github/workflows/validate-worldz-public-readiness.yml`
- `.github/workflows/validate-worldz-x-save.yml`
- `.github/workflows/validate-worldzparty-staging.yml`
- `.github/workflows/verify-worldzapp-android-api36.yml`
- `.github/workflows/verify-worldzapp-google-play-readiness.yml`
- `.github/workflows/verify-worldzapp-live-simulations.yml`
- `.github/workflows/verify-worldzapp-play-phase2.yml`
- `.github/workflows/verify-worldzapp-play-phase3.yml`
- `.github/workflows/verify-worldzapp-play-release-pack.yml`
- `.github/workflows/verify-worldzapp-production-live.yml`
- `.github/workflows/verify-worldzapp-stage5b-squads.yml`
- `.github/workflows/verify-worldzapp-stage5c.yml`
- `.github/workflows/verify-worldzapp-unsigned-aab.yml`
- `.github/workflows/visual-proof-oneworldz.yml`
- `.github/workflows/worldzapp-live-read-proof.yml`
- `dynamic/agents/github-advanced-security`
