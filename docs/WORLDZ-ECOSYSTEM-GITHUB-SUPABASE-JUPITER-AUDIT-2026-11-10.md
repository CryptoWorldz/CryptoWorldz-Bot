# WORLDZ Ecosystem Audit — GitHub × Supabase × Jupiter — 2026-11-10

## Scope and evidence
Read-only inspection of CryptoWorldz/CryptoWorldz-Bot default-branch recursive Git tree, code search, active Supabase CryptoWorldz-Bot project, Supabase Edge Function definitions and GitHub Jupiter API smoke run. This is a point-in-time evidence map, **not** confirmation of production execution or a complete functional test of every Worldz module.

- GitHub default branch: `main`, 1,026 tracked blob paths; recursive tree was **not truncated**.
- 686 paths match the broad case-insensitive Worldz/Jupiter/AUTO/Legend/LaunchPad/DEX/Cast naming filter (includes tests, docs, workflow/config, legacy files and repeated references — **not 686 independent features**).
- Supabase project: CryptoWorldz-Bot, healthy, Sydney region (`ap-southeast-2`), 32 deployed Edge Functions.
- Supabase security adviser found 19 `rls_enabled_no_policy` informational findings. Several are intentionally private service-role-only records; review exposure before modifying. Supabase health adviser returned no findings.

## Named Worldz systems identified
| Family | Main source | Actual finding |
|---|---|---|
| WorldzCast | `src/worldzcast.js`, `public/miniapp/worldzcast.js`, `worldzcast_posts`, `worldzcast_deliveries` | 24 post records (22 completed, 1 cancelled, 1 draft); 267 delivery records, all marked `sent` in database. Marked sent means bot/platform acceptance; it does not independently prove user views. |
| WorldzLaunchPad | `launchpad.cryptoworldz.xyz/`, `worldzlaunch.com/`, `worldzpad-mainnet/`, `worldzpad-omnichain/` | Multi-chain Safe Launch contracts, launch plans, deployment sites and creator/fee prototypes; production market execution not proven |
| WorldzFullScope | `src/fullscope/core.js`, `src/fullscope/telegram.js`, `worldz_fullscope_chains`, `worldz_fullscope_tokens` | 8 chains × 20 slots = 160 planned capacity; 4 registered token records, 2 with addresses |
| WorldzWatch | `src/fullscope/telegram.js` | Read/monitor command surface and database event architecture; not proof of an active chain indexer |
| WorldzScan | `src/worldzscan.js`, `tests/worldzscan-jupiter-contract.cjs` | DEX Screener/Jupiter token intelligence and risk signals |
| WorldDexPush | `worldzpad-mainnet/worlddexpush/`, `launchpad.cryptoworldz.xyz/worlddexpush/` | Jupiter VRFD and DEX Screener submission/readiness packages; upstream listing not guaranteed |
| WorldzFullBuild | `docs/WORLDZFULLBUILD-PROJECT-SOURCE-OF-TRUTH.md`, `worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json` | Master integration design, some rules historically superseded by later owner decisions |
| Worldz Raidz / Legend | `src/shill-rewards.js`, `src/legend-v8.js`, `src/command-registry.js`, `src/reward-auto.js` | Raid, Shill, points and profile code; rewards not inferred from speculative market activity |
| Worldz token distribution/Legacy | `worldzpad-mainnet/legacy-flywheel/`, `worldzpad-mainnet/tokenomics/`, Supabase legacy evidence tables | Historical allocation/proof designs. No fee routing or buy execution demonstrated. |
| Worldz Squads | `src/worldz-squads.js`, `worldz_squads` | Team/Legend squad performance framework |

## Jupiter integrations: distinct functions
1. **Price V3**: `.github/workflows/jupiter-api-smoke.yml` reads `https://api.jup.ag/price/v3` via secret `JUPITER_API_KEY`. GitHub run [42654645070](https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/42654645070) completed **success** at 2026-11-09T16:25:38Z. Confirms API key worked in that workflow; **no swap** was tested.
2. **Public quotes**: `src/auto/zed-router.js` reads `/ultra/v1/order` and exposes read-only buy and exit quote surfaces. The route may need migration to current Jupiter API endpoints; a live quote request was not executed in this audit.
3. **Token intelligence**: `src/worldzscan.js` fetches Jupiter identity signals and DEX Screener pairs.
4. **Token verification submissions**: `worldzpad-mainnet/worlddexpush/jupiter-vrfd-worldz.v1.json`; upstream review distinct from Worldz-owned metadata. The historical WLDZ/RVIV entries must **not** reappear as active public tokens.
5. **Recurring buy runtime**: `src/auto/dca-worker.js` + `src/auto/external-trader.js` depend on a distinct configured remote signer/executor, and `auto_dca_settings` hard gates. Jupiter API access **alone does not authorise wallet signing or swap execution**.
6. **Hosted AUTO Edge Function**: `diamond-buy-auto` version 2 marked active, but its DCA controls remain fail-closed and `dca/tick` returns `external_dca_worker_required`. The separate `diamond-buy-auto-health` states signing and submission are unavailable.

## Supabase proof and integration mismatches
- `auto_dca_settings`: **one settings record**, `enabled=false`, `execution_enabled=false`, `paused=true`, `emergency_stop=true`, `buy_only=true`, `multiwallet_enabled=false`. Wallet address is present (not reproduced in audit).
- `auto_dca_schedules`: **0**; `auto_dca_executions`: **0**. No live AUTO buy evidence from these tables.
- `auto_tokens`: 2 historical records: RECAP disabled; WLDZ **allowlisted**. WLDZ is retired by the owner's latest decision; **do not execute / show as current buy target**.
- `worldz_fullscope_tokens`: 4 Solana entries, WLDZ/RVIV labeled `live` with addresses; PNEX/MRCL `planned` without addresses. Owner has retired WLDZ/RVIV; Supabase statuses are stale relative to current policy. Do not mutate or destroy archival history until change policy reviewed.
- **Missing runtime bridge**: `src/auto/dca-repository.js` reads allowed buy targets from `auto_tokens` exclusively. `src/auto/http.js` validates schedules against this separate allowlist; it does **not** automatically read the 160-slot FullScope registry. Integrate only via vetted approval/eligibility mapping rather than unrestricted auto-additions.
- Existing Worldz legacy proof asset/snapshot records are not evidence of routed LP fees or automatic legacy buys.

## Safe next gates (no funds at risk)
1. Reconcile retired WLDZ/RVIV state across FullScope, AUTO allowlist, VRFD website packages, indexes and preview UI, retaining historic audit records.
2. Define a **read-only** FullScope-to-AUTO candidate mapping for verified, chain-appropriate token identities. Do not bypass owner allowlists or AUTO's single-wallet buy-only control.
3. Test currently supported Jupiter authenticated quote routes; identify and migrate deprecated endpoints only with proof. Do not place swaps.
4. Inspect separate external executor runtime and signing readiness without reading or exposing credentials; run non-signing simulations.
5. Reconcile DEX Screener liquidity/pair discovery and Legacy Hope Chest chart links with mint verification.
6. Verify deployment health/CI for each site and ZED runtime before merge or deployment; confirm Legends opt-in authorization separately.

**No production settings, real trades, migrations, live Edge Functions, repository branches or token allowlists were changed in this audit.**
