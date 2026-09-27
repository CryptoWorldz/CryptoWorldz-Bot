#!/usr/bin/env python3
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
GATE=json.loads((ROOT/"worldzpad-omnichain/fullscope/worldz-launch-quality-gate.v1.json").read_text())
MRCL=json.loads((ROOT/"worldzpad-omnichain/fullscope/worldz-miracle-token.v1.json").read_text())
FULL=json.loads((ROOT/"worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json").read_text())

def fail(msg):
    raise SystemExit("WORLDZ LAUNCH QUALITY FAIL: "+msg)

if GATE.get("schema")!="WORLDZ-LAUNCH-QUALITY-GATE-V1":
    fail("wrong gate schema")
if GATE.get("tokenProfile",{}).get("symbol")!="MRCL":
    fail("gate target is not MRCL")
if GATE.get("tokenProfile",{}).get("supply")!=348000000:
    fail("MRCL supply drift")
if GATE.get("officialLaunchAllowed") is not False:
    fail("pre-launch quality gate must keep official launch disabled")

token=MRCL.get("token",{})
if token.get("name")!="MIRACLE" or token.get("symbol")!="MRCL":
    fail("MRCL canonical name/symbol drift")
if token.get("fixedSupplyTokens")!=348000000:
    fail("MRCL fixed supply drift")
if token.get("canonicalMint") is not None:
    fail("pre-launch MRCL canonical mint must remain null until real mint confirmation")
if token.get("lifecycle")!="PRE_LAUNCH":
    fail("MRCL must remain PRE_LAUNCH")

alloc=MRCL.get("allocations",{})
expected={
    "miracleTeam":(20,69600000),
    "miracleMagicSupply":(20,69600000),
    "genesisLiquidity":(5,17400000),
    "purpleDiamondHandz":(1,3480000),
    "unallocated":(54,187920000),
}
total_pct=0
total_tokens=0
for key,(pct,tokens) in expected.items():
    item=alloc.get(key,{})
    got_pct=item.get("percentOfSupply")
    got_tokens=item.get("tokens")
    if got_pct!=pct or got_tokens!=tokens:
        fail(f"{key} allocation drift: {got_pct}%/{got_tokens}")
    total_pct+=got_pct
    total_tokens+=got_tokens
if total_pct!=100 or total_tokens!=348000000:
    fail(f"allocation total mismatch: {total_pct}%/{total_tokens}")

quality=MRCL.get("launchQualityGate",{})
if quality.get("required") is not True or quality.get("officialLaunchBlockedUntilPass") is not True:
    fail("MRCL must require and block on launch quality gate")
if quality.get("metadata",{}).get("name")!="MIRACLE" or quality.get("metadata",{}).get("symbol")!="MRCL":
    fail("MRCL metadata identity drift")
if quality.get("jupiter",{}).get("organicScore")!="OBSERVE_POST_LAUNCH__CANNOT_PRE_GUARANTEE":
    fail("Organic Score must remain observed, not guaranteed")

stages={x.get("id"):x for x in GATE.get("launchStages",[])}
for required in ["IDENTITY_LOCK","JUPITER_SHIELD_READINESS","JUPITER_VRFD","METEORA_DBC","DEXSCREENER","PUBLIC_RELEASE"]:
    if required not in stages or stages[required].get("required") is not True:
        fail(f"missing required stage {required}")

shield=stages["JUPITER_SHIELD_READINESS"]
if "DO_NOT_SPLIT_WALLETS_WASH_TRADE_OR_MANUFACTURE_ACTIVITY_TO_GAME_JUPITER_ORGANIC_SCORE_OR_HOLDER_METRICS" not in shield.get("antiGaming",""):
    fail("Jupiter anti-gaming rule missing")

dbc=stages["METEORA_DBC"]
checks=set(dbc.get("checks",[]))
if "5_PERCENT_BASE_ALLOCATION_RECONCILED_TO_17400000_MRCL" not in checks:
    fail("DBC 5% MRCL reconciliation missing")
if "AUD_200_FIRST_BUY_TARGET_BOUND_TO_LIVE_SOL_AT_REVIEW" not in checks:
    fail("AUD 200 first-buy live conversion rule missing")
if "NO_PARALLEL_COMPETING_GENESIS_AMM" not in checks:
    fail("parallel genesis AMM prohibition missing")

market=GATE.get("marketReadiness",{})
tiers={x.get("tier"):x for x in market.get("tiers",[])}
for required in ["INDEXABLE","TRADER_READY","SCALE_READY","WHALE_READY"]:
    if required not in tiers:
        fail(f"missing market-readiness tier {required}")
if "NEVER_LABEL_WHALE_READY_FROM_TOKEN_PERCENTAGE_OR_VIRTUAL_LIQUIDITY_ALONE" not in tiers["WHALE_READY"].get("rule",""):
    fail("Whale Ready truth rule missing")
if "5_PERCENT_TOKEN_ALLOCATION_AND_VIRTUAL_RESERVES_DO_NOT_EQUAL_DEEP_REAL_LIQUIDITY" not in market.get("truthRule",""):
    fail("real-liquidity truth rule missing")

fb=FULL.get("launchQualityGate",{})
if fb.get("contract")!="worldzpad-omnichain/fullscope/worldz-launch-quality-gate.v1.json":
    fail("WorldzFullBuild does not point to launch quality contract")
mods=set(FULL.get("inheritance",{}).get("modules",[]))
for mod in ["WorldzLaunch Quality Gate™","Worldz Token Identity Engine™","WorldDexPush™"]:
    if mod not in mods:
        fail(f"FullBuild inheritance missing {mod}")

print("WORLDZ_LAUNCH_QUALITY=PASS")
print("MRCL=PRE_LAUNCH supply=348000000 allocations=100% official_launch=BLOCKED")
print("Jupiter=VRFD+Shield+OrganicScore-observed DEXScreener=provider-observed Meteora=DBC")
print("market_readiness=INDEXABLE->TRADER_READY->SCALE_READY->WHALE_READY real_liquidity_only")
print("anti_gaming=ENFORCED mainnet=OFF")
