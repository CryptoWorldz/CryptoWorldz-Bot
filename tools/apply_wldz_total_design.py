#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAD = ROOT / "impactbased.oneworldz.com"
CRYPTO = ROOT / "cryptoworldz.xyz"
TOTAL_SUPPLY = 100_000_000
WSOL_MINT = "So11111111111111111111111111111111111111112"
METEORA_DAMM_V2_PROGRAM = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"

MASTER = {
    "founder": 25_000_000,
    "liquidity": 25_000_000,
    "peopleCharity": 25_000_000,
    "ecosystem": 25_000_000,
}
PEOPLE = {
    "legendReserve": 14_000_000,
    "worldzBoost": 4_000_000,
    "charityEndowment": 7_000_000,
}
ECOSYSTEM = {
    "infrastructureTreasury": 10_000_000,
    "advertisingGrowth": 5_000_000,
    "marketAccess": 5_000_000,
    "futureExpansionGrants": 5_000_000,
}
FEE_SPLIT = {
    "worldzPadBoard": 10,
    "holderRewards": 40,
    "lpGrowth": 20,
    "buybackBurn": 15,
    "charityImpact": 10,
    "raaiiiddGrowth": 5,
}

policy = {
  "version": "1.0-wldz-total-design",
  "token": {
    "name": "WORLDZ",
    "ticker": "WLDZ",
    "network": "solana",
    "program": "token_2022",
    "totalGenesisSupply": TOTAL_SUPPLY,
    "decimals": 9,
    "mintAuthorityAfterGenesis": "revoked",
    "freezeAuthority": None,
    "transferFeeExtensionEnabled": False,
    "transferHookEnabled": False,
    "ordinaryWalletTransfersTaxed": False,
    "recommendedExtensions": ["MetadataPointer", "TokenMetadata"],
    "metadataUpdateAuthority": "worldz_multisig_until_explicitly_frozen"
  },
  "masterAllocation": {
    "founder": {"tokens": MASTER["founder"], "percent": 25},
    "liquidity": {"tokens": MASTER["liquidity"], "percent": 25},
    "peopleCharity": {"tokens": MASTER["peopleCharity"], "percent": 25},
    "ecosystem": {"tokens": MASTER["ecosystem"], "percent": 25}
  },
  "founderAllocation": {
    "totalTokens": 25_000_000,
    "totalPercent": 25,
    "operationalUnlockedAtGenesisTokens": 5_000_000,
    "graceLockedTokens": 20_000_000,
    "vestingMonths": 36,
    "lockedTokensReceiveSolRewards": False,
    "deployer": "JayJayTeamDev"
  },
  "peopleCharityAllocation": {
    "legendReserve": {
      "tokens": PEOPLE["legendReserve"], "percent": 14,
      "guaranteedNowTokens": 5_000_000,
      "conditionalActiveLegendTokens": 9_000_000,
      "grantTokensPerLegend": 1_000_000,
      "grantPercentPerLegend": 1,
      "grantVesting": {"initialUnlockPercent": 20, "remainingLinearMonths": 12}
    },
    "worldzBoost": {
      "tokens": PEOPLE["worldzBoost"], "percent": 4,
      "seats": 16, "tokensPerSeat": 250_000, "percentPerSeat": 0.25,
      "grantVesting": {"initialUnlockPercent": 20, "remainingLinearMonths": 12}
    },
    "charityEndowment": {
      "tokens": PEOPLE["charityEndowment"], "percent": 7,
      "initialCliffMonths": 12,
      "walletType": "dedicated_multisig_controlled_charity_vault",
      "beneficiaries": "approved_joining_charities_only",
      "automaticTokenLiquidation": False,
      "preferOngoingSolFeeDistributionsBeforeSellingEndowment": True
    }
  },
  "liquidityAllocation": {
    "totalTokens": 25_000_000,
    "totalPercent": 25,
    "initialLaunchTokens": 1_000_000,
    "initialLaunchPercent": 1,
    "initialDevQuoteLiquidityAudTarget": 200,
    "remainingReserveTokens": 24_000_000,
    "releaseCapacityByYearTokens": {"launch": 1_000_000, "year1Additional": 4_000_000, "year2": 5_000_000, "year3": 5_000_000, "year4": 5_000_000, "year5": 5_000_000},
    "releaseRequiresMatchingRealQuoteLiquidity": True,
    "releasePriceSource": "time_weighted_real_pool_price",
    "unpairedReserveDoesNotCountAsLiquidity": True,
    "reserveAndLpTokensReceiveSolRewards": False,
    "minimumPositionLockMonths": 12,
    "realValueDisclosureRequired": True
  },
  "ecosystemAllocation": {
    "totalTokens": 25_000_000,
    "totalPercent": 25,
    "buckets": {
      "infrastructureTreasury": {"tokens": 10_000_000, "percent": 10, "maxAnnualReleaseTokens": 2_000_000},
      "advertisingGrowth": {"tokens": 5_000_000, "percent": 5, "maxAnnualReleaseTokens": 1_000_000},
      "marketAccess": {"tokens": 5_000_000, "percent": 5, "maxAnnualReleaseTokens": 1_000_000},
      "futureExpansionGrants": {"tokens": 5_000_000, "percent": 5, "maxAnnualReleaseTokens": 1_000_000}
    },
    "control": "worldz_multisig",
    "systemVaultTokensReceiveSolRewards": False
  },
  "dexArchitecture": {
    "preferredPool": "Meteora DAMM v2",
    "programId": METEORA_DAMM_V2_PROGRAM,
    "baseToken": "WLDZ",
    "quoteToken": "wSOL",
    "quoteMint": WSOL_MINT,
    "collectFeeMode": "OnlyB",
    "onlyBFeeToken": "wSOL",
    "userFacingBaseTradingFeeBps": 200,
    "userFacingBaseTradingFeePercent": 2.0,
    "bondingCurve": False,
    "graduation": False,
    "liquidityStyle": "direct_dex_concentrated_price_range_with_real_reserves",
    "virtualLiquidityMeaning": "capital_efficiency_and_virtual_reserve_math_only_not_withdrawable_assets",
    "externalDexProtocolShare": "read_from_deployed_pool_config_and_display_separately",
    "worldzFeeSplitBasis": "net_claimable_quote_token_position_fees_after_external_dex_protocol_fee",
    "reasonForNoToken2022TransferFee": "avoid_taxing_wallet_transfers_and_avoid_collecting_fee_in_WLDZ",
    "reasonForNoTransferHook": "maximise_wallet_dex_router_compatibility_and_avoid_side_payment_preapproval"
  },
  "autoFeeEngine": {
    "accountingAsset": "wSOL_or_unwrapped_SOL",
    "claimCycleSeconds": 21600,
    "claimCycleLabel": "every_6_hours",
    "minimumClaimRule": "claim_when_value_exceeds_max(5x_estimated_execution_cost,0.0005_SOL); otherwise_roll_forward",
    "routesPercentOfNetClaimableWorldzFeeRevenue": FEE_SPLIT,
    "worldzPadBoardControl": {"multisigSigners": ["JayJayTeamDev", "Remedy", "Stepper"], "jayJayRequired": True, "requiredAdditionalSignerCount": 1},
    "feeRevenueNeverCountedAsUserPrincipal": True,
    "systemWalletsSeparated": True
  },
  "holderRewards": {
    "routePercentOfNetFeeRevenue": 40,
    "epochSeconds": 21600,
    "epochSettlement": "accrue_claimable_SOL_each_epoch",
    "pushToEveryWalletRequired": False,
    "claimMode": "cumulative_claimable_ledger_or_merkle_claim_adapter",
    "weighting": {
      "proportionalPoolPercent": 70,
      "equalizerPoolPercent": 30,
      "equalizerFormula": "sqrt(eligible_verified_profile_WLDZ_balance)",
      "verifiedProfilesAggregateLinkedWallets": True,
      "unverifiedHoldersReceiveProportionalPool": True,
      "equalizerRequiresVerifiedCommandCentreProfile": True
    },
    "ineligibleBalances": ["liquidity_reserve", "lp_vaults", "founder_locked", "legend_locked", "boost_locked", "charity_endowment", "ecosystem_vaults", "board_treasury", "burned_tokens"],
    "guaranteedReturn": False,
    "guaranteedApy": False
  },
  "lpGrowthEngine": {
    "routePercentOfNetFeeRevenue": 20,
    "quoteVault": "LP_GROWTH_WSOL_VAULT",
    "tokenSource": "LIQUIDITY_RESERVE_WLDZ_VAULT",
    "pairingRule": "pair_only_scheduled_available_WLDZ_with_real_wSOL_at_TWAP_pool_ratio",
    "balancedAdditionRequired": True,
    "cannotReleaseUnpairedWldz": True,
    "excessQuoteLiquidityRollsForward": True
  },
  "buybackBurnEngine": {
    "routePercentOfNetFeeRevenue": 15,
    "asset": "wSOL",
    "execution": "small_TWAP_style_open_market_buys_then_token_program_burn",
    "maxSingleBuyPercentOfRealQuoteReserve": 0.5,
    "maxDailyBuyPercentOfRealQuoteReserve": 2.0,
    "skipWhenRealValueOrSlippageGateFails": True,
    "burnMethod": "burn_owned_WLDZ_not_dead_wallet_transfer",
    "liveSupplyUpdatedAfterBurn": True
  },
  "charityEngine": {
    "endowmentTokens": 7_000_000,
    "endowmentPercent": 7,
    "endowmentCliffMonths": 12,
    "ongoingFeeRoutePercent": 10,
    "ongoingFeeAsset": "SOL",
    "beneficiarySelection": "verified_and_approved_cause",
    "disbursementControl": "JayJayTeamDev_plus_one_of_Remedy_or_Stepper",
    "endowmentTokenSaleRequiresExplicitMultisigAndRealValueImpactCheck": True,
    "automaticEndowmentDumping": False
  },
  "raaiiiddGrowthEngine": {
    "routePercentOfNetFeeRevenue": 5,
    "asset": "SOL",
    "uses": ["verified_raaiiidd_bounties", "supporter_rewards", "advertising_bounties", "growth_campaigns"],
    "purchaseAmountAloneDoesNotGuaranteeReward": True
  },
  "realValue": {
    "showSpotValue": True,
    "showActualRealReserveLiquidity": True,
    "showVirtualLiquiditySeparately": True,
    "showEstimatedRealisableValue": True,
    "showSlippage": True,
    "showExternalDexProtocolFee": True,
    "showWorldzNetFeeRevenue": True,
    "neverLabelVirtualLiquidityAsWithdrawableLiquidity": True
  },
  "executionBoundary": {
    "publicRepoContainsPrivateSigner": False,
    "publicRepoCanSilentlyMint": False,
    "mainnetExecutionEnabledHere": False,
    "commandCentreRuntimeSourcePresentHere": False,
    "nextExecutionStep": "external_runtime_devnet_adapter_then_audit_then_explicit_mainnet_signature"
  }
}

# Merge the complete #001 design into the existing launch contract generated earlier.
contract_paths = [PAD / "worldzpad.launch-contract.json", CRYPTO / "worldzpad" / "worldzpad.launch-contract.json"]
for p in contract_paths:
    contract = json.loads(p.read_text(encoding="utf-8"))
    contract["version"] = "2.0-wldz-total-design"
    contract["wldzTotalDesign"] = policy
    for token in contract.get("launchRegistry", []):
        if token.get("ticker") == "WLDZ":
            token["genesisDevOwnershipPercent"] = 25
            token["masterAllocationPercent"] = {"founder": 25, "liquidity": 25, "peopleCharity": 25, "ecosystem": 25}
            token["tradingFeePercent"] = 2
            token["token2022TransferFeePercent"] = 0
            token["feeCollection"] = "Meteora_DAMM_v2_OnlyB_wSOL"
            token["ordinaryWalletTransfersTaxed"] = False
            token["initialLpTokenAmount"] = 1_000_000
            token["initialLpTokenPercent"] = 1
    p.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")

for target in [PAD / "wldz.tokenomics.json", CRYPTO / "worldzpad" / "wldz.tokenomics.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")

# Update final generated team/people JSON to point at the fixed People + Charity quarter rather than an undifferentiated Dev wallet.
for p in [PAD / "worldzpad.team-policy.json", CRYPTO / "worldzpad" / "worldzpad.team-policy.json"]:
    data = json.loads(p.read_text(encoding="utf-8"))
    data["allocationSource"] = "WLDZ_PEOPLE_CHARITY_QUARTER_LEGEND_RESERVE"
    data["legendReserveTokens"] = 14_000_000
    data["legendReservePercent"] = 14
    data["additionalMinting"] = False
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
for p in [PAD / "worldzpad.people-policy.json", CRYPTO / "worldzpad" / "worldzpad.people-policy.json"]:
    data = json.loads(p.read_text(encoding="utf-8"))
    data["allocationSource"] = "WLDZ_PEOPLE_CHARITY_QUARTER"
    data["masterPeopleCharityPercent"] = 25
    data["charityEndowmentPercent"] = 7
    data["charityEndowmentTokens"] = 7_000_000
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

# Operator-facing tokenomics page with a deterministic fee calculator.
dir_ = PAD / "wldz-tokenomics"
dir_.mkdir(parents=True, exist_ok=True)
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WLDZ Tokenomics | WorldzPad</title><meta name="description" content="WORLDZ WLDZ complete supply, liquidity and SOL fee-routing architecture."><link rel="stylesheet" href="/worldzpad.css"></head><body data-oneworldz-build="2026-09-07-wldz-total-design-v1"><nav class="nav"><a href="/">WorldzPad</a><a class="brand" href="/wldz-tokenomics/">WLDZ Tokenomics</a><a href="/team-ownership/">Legends</a><a href="/worldz-boost/">Boost</a><a href="/real-value/">Real Value</a></nav><main class="shell"><section class="hero"><p class="eyebrow">#001 WORLDZ • $WLDZ</p><h1>25 • 25 • 25 • <span>25</span></h1><p class="lead">100,000,000 fixed WLDZ. Four equal master quarters: Founder, Liquidity, People + Charity, and Worldz Ecosystem.</p><div class="badges"><span class="badge live">100M FIXED</span><span class="badge">2% DEX FEE</span><span class="badge">NO WALLET-TRANSFER TAX</span><span class="badge">wSOL FEE COLLECTION</span></div></section><section class="section"><h2>Master Pie</h2><div class="grid"><div class="card"><strong>Founder</strong><div class="kpi">25%</div><p>25M. 5M operational; 20M G.R.A.C.E. over 36 months.</p></div><div class="card"><strong>Liquidity</strong><div class="kpi">25%</div><p>1M at launch + 24M reserve released only against real matching quote liquidity over up to five years.</p></div><div class="card"><strong>People + Charity</strong><div class="kpi">25%</div><p>14M Legends • 4M Worldz Boost • 7M Charity Endowment.</p></div><div class="card"><strong>Ecosystem</strong><div class="kpi">25%</div><p>10M infrastructure • 5M advertising • 5M market access • 5M future expansion.</p></div></div></section><section class="section"><h2>The 2% Fee — SOL-side by design</h2><div class="good"><strong>WLDZ itself carries no Token-2022 transfer fee.</strong><br>WorldzPad targets a Meteora DAMM v2 WLDZ/wSOL pool using OnlyB fee collection. Token B is wSOL, so claimable pool trading fees are quote-side instead of forcing AUTO to sell WLDZ. Any external DEX protocol share is displayed separately before AUTO splits the net Worldz-side fee revenue.</div><div class="grid"><div class="card"><strong>Board</strong><div class="kpi">10%</div></div><div class="card"><strong>HODLers</strong><div class="kpi">40%</div></div><div class="card"><strong>LP Growth</strong><div class="kpi">20%</div></div><div class="card"><strong>Buy + Burn</strong><div class="kpi">15%</div></div><div class="card"><strong>Charity</strong><div class="kpi">10%</div></div><div class="card"><strong>Raaiiidd Growth</strong><div class="kpi">5%</div></div></div></section><section class="section"><h2>Fee Simulator</h2><div class="card"><label>Net Worldz-side fee revenue available to AUTO (SOL)</label><input id="sol" type="number" min="0" step="0.001" value="1"><div class="route"><span>Board</span><b id="board"></b></div><div class="route"><span>HODLers</span><b id="hodl"></b></div><div class="route"><span>LP Growth</span><b id="lp"></b></div><div class="route"><span>Buyback + Burn</span><b id="burn"></b></div><div class="route"><span>Charity</span><b id="charity"></b></div><div class="route"><span>Raaiiidd / Growth</span><b id="raid"></b></div></div></section><section class="section"><h2>6-Hour HODL Engine</h2><div class="grid two"><div class="card"><strong>70% Proportional</strong><p>Every eligible holder participates according to unlocked eligible WLDZ balance.</p></div><div class="card"><strong>30% Equalizer</strong><p>Verified Command Centre profiles use square-root weighting. Linked wallets are aggregated first so splitting a balance does not multiply the verified-profile boost.</p></div></div><p>System reserves, locked vesting, LP, charity and treasury balances are excluded from HODL rewards. Each six-hour epoch accrues SOL to a claimable ledger; tiny claims can roll forward instead of wasting SOL on transaction fees.</p></section><section class="section"><h2>Liquidity Growth</h2><div class="good">1M WLDZ launches with the Dev-funded ~A$200-equivalent quote side. The remaining 24M liquidity reserve is not called liquidity until it is actually paired with real wSOL. AUTO's 20% LP route accumulates wSOL, then releases scheduled WLDZ at the pool TWAP ratio and adds balanced real liquidity.</div></section><section class="section"><h2>Charity Engine</h2><div class="good">7M WLDZ Charity Endowment • 12-month initial cliff • dedicated vault • no automatic dumping. Separately, 10% of AUTO fee revenue flows in SOL to the Charity/Impact vault so approved charities can receive useful value without first selling the WLDZ endowment.</div></section></main><footer class="footer">WorldzPad™ • ZED • AUTO • G.R.A.C.E. • Real Value™ • WLDZ</footer><script>const ids={board:.10,hodl:.40,lp:.20,burn:.15,charity:.10,raid:.05};function calc(){const v=Math.max(0,Number(document.getElementById('sol').value)||0);for(const [id,p] of Object.entries(ids))document.getElementById(id).textContent=(v*p).toFixed(6)+' SOL'}document.getElementById('sol').addEventListener('input',calc);calc();</script></body></html>'''
(dir_ / "index.html").write_text(html, encoding="utf-8")

# AUTO architecture page.
auto_dir = PAD / "auto-fee-engine"
auto_dir.mkdir(parents=True, exist_ok=True)
auto_html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AUTO Fee Engine | WorldzPad</title><link rel="stylesheet" href="/worldzpad.css"></head><body><nav class="nav"><a href="/">WorldzPad</a><a href="/wldz-tokenomics/">WLDZ Tokenomics</a><a class="brand" href="/auto-fee-engine/">AUTO Fee Engine</a><a href="https://cryptoworldz.xyz/worldzpad/">ZED Bridge</a></nav><main class="shell"><section class="hero"><p class="eyebrow">Diamond Buy™ / AUTO</p><h1>QUOTE-SIDE <span>FEE ENGINE</span></h1><p class="lead">Collect DEX fee revenue in wSOL, account for the external DEX protocol cut, then route 100% of the net Worldz claimable fee revenue with no forced WLDZ sell pressure.</p></section><section class="section"><div class="grid"><div class="card"><strong>1 • Trade</strong><p>WLDZ/wSOL swaps pay the configured 2% DEX base fee.</p></div><div class="card"><strong>2 • Collect OnlyB</strong><p>Meteora DAMM v2 quote-only mode accumulates claimable fees in Token B = wSOL.</p></div><div class="card"><strong>3 • Reconcile</strong><p>AUTO reads actual on-chain pool config, external protocol fee, position fees and real reserves.</p></div><div class="card"><strong>4 • Route</strong><p>10 Board / 40 HODL / 20 LP / 15 Burn / 10 Charity / 5 Raaiiidd.</p></div><div class="card"><strong>5 • Epoch</strong><p>Every six hours reward accounting settles; undersized claims roll forward.</p></div><div class="card"><strong>6 • Prove</strong><p>ZED publishes fee totals, routing, burns, liquidity additions, charity disbursements and Real Value.</p></div></div></section><section class="section"><div class="warning"><strong>Execution boundary</strong><br>This repository publishes the exact contract and simulator but contains no private signer and not the separate Command Centre runtime. Mainnet fee claiming, swaps, LP additions, burns and payouts require the external runtime adapter, devnet proof, security review and explicit authorised signing.</div></section></main><footer class="footer">AUTO • WLDZ • Quote-side fee routing</footer></body></html>'''
(auto_dir / "index.html").write_text(auto_html, encoding="utf-8")

# Patch stale generated phrases from the earlier all-Dev genesis concept.
for p in [PAD / "launch-console" / "index.html", PAD / "launches" / "index.html", PAD / "index.html"]:
    text = p.read_text(encoding="utf-8")
    text = text.replace("Fixed genesis supply. Dev-owned at creation.", "100M fixed genesis supply allocated 25/25/25/25 into dedicated vaults; Founder allocation is 25%.")
    text = text.replace("Dev-owned genesis", "25% Founder allocation")
    if "WLDZ Total Design" not in text and "</main>" in text:
        panel = '''<section class="section"><h2>WLDZ Total Design</h2><div class="good"><strong>25 / 25 / 25 / 25</strong><br>Founder 25% • Liquidity 25% • People + Charity 25% • Ecosystem 25%. WLDZ uses a 2% DEX trading fee collected quote-side in wSOL; ordinary wallet transfers are not taxed.</div><div class="actions"><a class="btn" href="/wldz-tokenomics/">Open WLDZ Tokenomics</a><a class="btn ghost" href="/auto-fee-engine/">AUTO Fee Engine</a></div></section>'''
        text = text.replace("</main>", panel + "</main>", 1)
    p.write_text(text, encoding="utf-8")

# Add final ZED panel.
zed = CRYPTO / "worldzpad" / "index.html"
zed_text = zed.read_text(encoding="utf-8")
if "WLDZ TOTAL DESIGN V1" not in zed_text:
    panel = '''<section class="section"><h2>WLDZ TOTAL DESIGN V1</h2><div class="grid"><div class="card"><strong>Supply</strong><p>100M fixed • 25% Founder • 25% Liquidity • 25% People + Charity • 25% Ecosystem.</p></div><div class="card role grace"><strong>AUTO 2%</strong><p>Meteora DAMM v2 OnlyB / wSOL fee collection. No Token-2022 wallet transfer fee. No forced WLDZ fee sales.</p></div><div class="card"><strong>6-Hour Rewards</strong><p>40% of net fee revenue to HODLers: 70% proportional + 30% verified-profile Equalizer.</p></div></div><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/wldz-tokenomics/">WLDZ Tokenomics</a><a class="btn ghost" href="https://impactbased.oneworldz.com/auto-fee-engine/">AUTO Engine</a></div></section>'''
    zed_text = zed_text.replace("</main>", panel + "</main>", 1)
    zed.write_text(zed_text, encoding="utf-8")

# Invariants: deployment must stop if the economic contract drifts.
assert sum(MASTER.values()) == TOTAL_SUPPLY
assert all(v == 25_000_000 for v in MASTER.values())
assert sum(PEOPLE.values()) == 25_000_000
assert sum(ECOSYSTEM.values()) == 25_000_000
assert sum(FEE_SPLIT.values()) == 100
assert policy["dexArchitecture"]["userFacingBaseTradingFeeBps"] == 200
assert policy["dexArchitecture"]["collectFeeMode"] == "OnlyB"
assert policy["dexArchitecture"]["quoteMint"] == WSOL_MINT
assert policy["token"]["transferFeeExtensionEnabled"] is False
assert policy["token"]["ordinaryWalletTransfersTaxed"] is False
assert policy["peopleCharityAllocation"]["charityEndowment"]["percent"] == 7
assert policy["liquidityAllocation"]["remainingReserveTokens"] == 24_000_000
assert sum(policy["liquidityAllocation"]["releaseCapacityByYearTokens"].values()) == 25_000_000
assert policy["holderRewards"]["weighting"]["proportionalPoolPercent"] + policy["holderRewards"]["weighting"]["equalizerPoolPercent"] == 100
print("WLDZ_TOTAL_DESIGN=PASS supply=100000000 master=25/25/25/25 legends=14 boost=4 charity=7 dex_fee_bps=200 fee_asset=wSOL wallet_transfer_tax=0 auto_split=10/40/20/15/10/5 hodl_epoch_hours=6")
