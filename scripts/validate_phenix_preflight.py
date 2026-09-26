#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "worldzpad-mainnet" / "phenix" / "phenix-launch-preflight.v1.json"

cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

require(cfg["schema"] == "PHENIX-LAUNCH-PREFLIGHT-V1", "wrong schema")
require(cfg["token"]["name"] == "PHENIX", "token name must be PHENIX")
require(cfg["token"]["symbol"] == "PNEX", "ticker must be PNEX")
require(cfg["token"]["supplyTokens"] == 250_000_000, "PNEX supply must be 250,000,000")
require(cfg["execution"]["mainnetExecutionEnabled"] is False, "prep branch must keep mainnet execution disabled")
require(cfg["execution"]["autoBroadcast"] is False, "auto broadcast must remain disabled")
require(cfg["execution"]["walletSignatureRequired"] is True, "wallet signature boundary must remain enabled")

buckets = cfg["allocation"]["buckets"]
require(sum(x["percent"] for x in buckets) == 100, "allocation percentages must total 100")
require(sum(x["tokens"] for x in buckets) == 250_000_000, "allocation tokens must total 250,000,000")

bucket = {x["id"]: x for x in buckets}
require(bucket["phenix_chance_immediate"]["tokens"] == 25_000_000, "Chance immediate must be 25,000,000")
require(bucket["phenix_chance_12_months"]["tokens"] == 37_500_000, "Chance vesting must be 37,500,000")
require(bucket["liquidity_total"]["tokens"] == 112_500_000, "liquidity total must be 112,500,000")
require(bucket["developer_vesting"]["tokens"] == 25_000_000, "developer vesting must be 25,000,000")
require(bucket["purple_diamond_handz"]["tokens"] == 2_500_000, "Purple Diamond Handz must be 2,500,000")
require(bucket["phenix_total_supply_flywheel"]["tokens"] == 47_500_000, "PHENIX Total Supply FlyWheel must be 47,500,000")
require(cfg["allocation"]["unassignedTokens"] == 0, "PNEX must have zero unassigned supply")

flywheel = cfg["totalSupplyFlyWheel"]
require(flywheel["supplyPercent"] == 19, "FlyWheel must be 19%")
require(flywheel["supplyTokens"] == 47_500_000, "FlyWheel token amount mismatch")
require(flywheel["oneMasterReserve"] is True, "FlyWheel must remain one master reserve")
require(flywheel["separateSupplyBuckets"] is False, "FlyWheel must not become separate genesis supply buckets")
require(flywheel["internalLanePercentages"] == "NOT_YET_FIXED", "do not invent internal FlyWheel percentages")
require(flywheel["releasePolicyRequiredBeforeMainnet"] is True, "FlyWheel release policy must gate mainnet")
require(flywheel["mainnetExecutionEnabled"] is False, "FlyWheel mainnet execution must remain off in prep")
required_lanes = {"worldz_infrastructure","oneworldz_impact","treasury_resilience","community_rewards","locked_builder_team","ecosystem_growth","additional_liquidity","permanent_burn"}
require({x["id"] for x in flywheel["supportedLanes"]} == required_lanes, "FlyWheel lane set drift detected")
require(flywheel["miracleRunway"]["enabled"] is True, "MIRACLE infrastructure runway must be recorded")

vesting = cfg["vestingPolicy"]
require(vesting["developer"]["cliffDays"] == 90, "developer cliff must be 90 days")
require(vesting["developer"]["releases"] == 24, "developer vesting must have 24 releases")
require(vesting["developer"]["liquidAtGenesisTokens"] == 0, "developer vesting must have zero genesis liquidity")
require(vesting["developer"]["earlyUnlock"] is False, "developer early unlock must remain false")
require(vesting["flyWheelReserve"]["holdDays"] == 90, "FlyWheel hold must be 90 days")
require(vesting["flyWheelReserve"]["cycleAllowances"] == 48, "FlyWheel must have 48 cycle allowances")
require(vesting["flyWheelReserve"]["cadenceDays"] == 30, "FlyWheel allowance cadence must be 30 days")
require(vesting["flyWheelReserve"]["automaticDistribution"] is False, "FlyWheel allowance must not auto-distribute")
require(vesting["flyWheelBuilderTeamGrantDefault"]["cliffDays"] == 90, "FlyWheel builder cliff must be 90 days")
require(vesting["flyWheelBuilderTeamGrantDefault"]["releases"] == 24, "FlyWheel builder vesting must have 24 releases")

burn = cfg["burnPolicy"]
require(burn["mode"] == "TOKEN_NATIVE_RESERVE_BURN", "PNEX burn mode drift")
require(burn["automatedMarketBuyAndBurn"] is False, "automated market buy-and-burn must stay off")
require(burn["automaticBurn"] is False, "automatic PNEX burn must stay off")
require(burn["perUniversalCycle"]["cadenceDays"] == 30, "burn cycle must be 30 days")
require(burn["perUniversalCycle"]["maximumPercentOfNewFlyWheelCycleAllowance"] == 25, "burn cap drift")
require(burn["perUniversalCycle"]["minimumPercent"] == 0, "burn must be allowed to be zero")
require(burn["irreversible"] is True and burn["reissuanceAllowed"] is False, "burn must be irreversible")
require(burn["autoBroadcast"] is False and burn["mainnetExecutionEnabled"] is False, "burn mainnet/auto broadcast must stay off")

universal = cfg["universalFlyWheel"]
require(universal["universalCycleDays"] == 30, "universal cycle must be 30 days")
require(universal["legacyEpochHours"] == 6, "legacy epoch must remain 6 hours")
require(universal["extraTraderFeeRequired"] is False, "Universal FlyWheel must not add a trader fee")
require(universal["sharedBenefitRequired"] is True, "shared benefit rule missing")

chance = cfg["phenixChance"]
model = chance["perApprovedRecipientAt500SeatModel"]
require(chance["targetMaximumSeats"] == 500, "Chance max seats must be 500")
require(model["immediateTokens"] == 50_000, "Chance immediate per-seat mismatch")
require(model["vestedTokens"] == 75_000, "Chance vested per-seat mismatch")
require(model["monthlyTokens"] == 6_250, "Chance monthly per-seat mismatch")
require(model["months"] == 12, "Chance vesting must be 12 months")
require(model["immediateTokens"] + model["vestedTokens"] == model["totalTokens"], "Chance per-seat total mismatch")
require(model["monthlyTokens"] * model["months"] == model["vestedTokens"], "Chance monthly schedule mismatch")

liq = cfg["liquidity"]
require(liq["genesisTokens"] == 12_500_000, "genesis liquidity must be 12,500,000 PNEX")
require(liq["genesisPercent"] == 5, "genesis liquidity must be 5%")
require(liq["totalAllocationPercent"] == 45, "current liquidity allocation must be 45%")
require(liq["laterCapacityTokens"] == 100_000_000, "later liquidity capacity mismatch")
require(liq["additionalLiquidityRule"]["minimumSolValueToPnexValueRatio"] == 1.05, "additional liquidity ratio must be 1.05")

fees = cfg["feePolicy"]
split = fees["controlledFeeSplitPercent"]
require(fees["ordinaryWalletTransferTaxPercent"] == 0, "ordinary transfers must have 0% transfer tax")
require(fees["magicFeeTargetGrossTraderFeeBps"] == 75, "MagicFeeNumber target must be 75 bps")
require(fees["dynamicFeeEnabled"] is False, "dynamic fee must remain OFF")
require(abs(sum(split[k] for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")) - 100) < 1e-9, "controlled fee split must total 100")
require(split == {"creator":51,"referrer":17,"legacyFlywheel":15,"worldzLaunchPad":8.5,"oneWorldzImpact":8.5,"total":100}, "controlled fee split drift detected")

wallet = cfg["walletConnectivity"]
require(wallet["connectOnWorldzWebsite"] is True, "wallet connection must originate on the Worldz website")
require(wallet["walletBrowserRequired"] is False, "wallet browser must not be required")
require(wallet["privateKeyOrSeedPhraseCollection"] is False, "seed/private-key collection must remain false")

require(cfg["launchReady"] is False, "launchReady must stay false while blockers remain")
require("PHENIX Total Supply FlyWheel 19% / 47,500,000 PNEX policy is finalized with auditable lane controls" in cfg["releaseGates"], "missing FlyWheel release gate")

if errors:
    raise SystemExit("PHENIX PREFLIGHT VALIDATION FAILED\n- " + "\n- ".join(errors))

print("PHENIX PREFLIGHT VALIDATION — SUCCESS")
print("PNEX fixed supply: 250,000,000")
print("PHENIX Chance: 25% total; up to 500 approved recipients")
print("Liquidity: 5% genesis / 45% current total allocation")
print("MagicFeeNumber: 75 bps; dynamic fee OFF; split 51/17/15/8.5/8.5")
print("Wallet connection: Worldz website origin; no wallet browser requirement")
print("Mainnet execution: OFF")
print("PHENIX Total Supply FlyWheel: 19% / 47,500,000 assigned; 90-day hold + 48 cycle allowances")
print("Developer vesting: 90-day cliff + 24 monthly releases")
print("Worldz ProofBurn: wallet/multisig signed; auto-broadcast OFF; cycle cap 25% of new FlyWheel allowance")
print("Worldz Universal Cycle: 30 days; Legacy Flywheel remains 6-hour cadence")
print("Launch readiness: BLOCKED — FlyWheel controls and remaining release gates still unresolved")
