# WLDZ Mainnet Launch Preparation

This directory is the fail-closed preparation package for #001 WORLDZ / `$WLDZ`.

It does **not** launch a token, create a mainnet mint, spend SOL, use a production signer, or authorize WorldzPad execution. The preparation workflow has read-only GitHub permissions and no mainnet wallet or RPC secrets.

## Accepted engineering baseline

The package pins the successful isolated execution proof from GitHub Actions Run `34155419579`, commit `9e7f41f7998b78be43d240f12812bc825b1e57f3`, artifact SHA-256 `317f354ff125fe44df2d370a8f6ca893da5f7ce4cede965a8a0441fef5db70ec`.

That baseline proved the Token-2022 100M supply model, 25/25/25/25 master allocations, revoked mint authority, no freeze authority, Meteora DAMM v2 WLDZ/wSOL with `OnlyB` and 200 bps, real isolated fee claim, AUTO 10/40/20/15/10/5 routing, HODL native-SOL distribution, LP addition, buyback/burn, Charity native-SOL distribution and fail-closed/atomic-rollback protections.

## Locked launch parameters

- Token: WORLDZ / `$WLDZ`
- Program: Token-2022
- Vanity mint target: `WLDZ...`
- Supply: 100,000,000
- Decimals: 9
- Master allocations: 25M Founder / 25M Liquidity / 25M People+Charity / 25M Ecosystem
- People+Charity: 14M Legends / 4M Boost / 7M Charity Endowment
- Founder policy target: 20M time-enforced locked / maximum 5M operational before launch costs
- Pool: Meteora DAMM v2 WLDZ/wSOL
- Fee collection: `CollectFeeMode.OnlyB`
- Base fee: 200 bps / 2.00%
- Bonding curve: disabled
- Liquidity lock: required
- AUTO: Board 10 / HODL 40 / LP Growth 20 / Buyback+Burn 15 / Charity 10 / Raaiiidd+Growth 5
- HODL: every 6 hours, 70% proportional + 30% Equalizer, excluding system/locked holdings

## Preparation sequence

1. **Secure mint ceremony** — generate the final vanity mint key using an offline/secure process. Commit only the public `WLDZ...` address; never commit seed material or signing keys.
2. **Production address packet** — independently verify the Squads multisig and every Founder, Liquidity, People+Charity, Ecosystem, Charity, Board and Raaiiidd destination public key. Two independent human checks are required.
3. **G.R.A.C.E. vesting** — select the production time-enforced vesting mechanism and prove the Founder/team lock behaviour on the exact production-compatible implementation.
4. **RPC/cluster proof** — configure the production Solana RPC outside Git, verify mainnet-beta and require simulation before every value-moving transaction.
5. **Funding segregation** — approve the launch-liquidity amount/source and keep launch liquidity, operating treasury, founder funds and Charity funds separately identifiable.
6. **Regulatory/disclosure gate** — resolve the exact AUSTRAC and ASIC position for the services that will actually be enabled and review token/service disclosures before execution.
7. **Independent security review** — review the exact production transaction builder, authorities, multisig policy, Meteora configuration, AUTO destinations and incident controls.
8. **Incident/accounting runbooks** — approve pause/recovery, reconciliation, audit trail and recordkeeping procedures.
9. **Final address ceremony** — compare every public key against the approved packet immediately before signing.
10. **Explicit launch authorization** — a separate launch change is required. This preparation package deliberately cannot set `launchAuthorization=true` or `executionEnabled=true`.

## Current expected result

`node worldzpad-mainnet/scripts/preflight.mjs` should return:

`WLDZ_MAINNET_PREP=PASS launch_authorized=0 execution_enabled=0 blockers=<N>`

A PASS means the **preparation framework itself is valid and the proven parameters have not drifted**. It does not mean mainnet launch is authorized. Outstanding public addresses and readiness controls remain listed as blockers until independently completed.

## Compliance boundary

As of September 2026, AUSTRAC says virtual asset service providers that provide designated services in Australia must be enrolled/registered as applicable and must not start registrable virtual asset services before approval, subject to any applicable transitional rules. ASIC INFO 225 applies broadly to digital-asset products/services and ASIC's current sector-wide no-action position has been extended to 30 September 2026 subject to its conditions. The Digital Assets Framework Act is due to commence 9 April 2027.

The exact legal position depends on the final service design and operator/entity. This repository gate therefore keeps AUSTRAC, ASIC and disclosure status as explicit unresolved launch blockers rather than assuming an exemption or licence.
