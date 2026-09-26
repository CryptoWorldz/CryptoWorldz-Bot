#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
v=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-genesis-vault-plan.v1.json").read_text())
p=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-worldz-proof-manifest.v1.json").read_text())
errors=[]
def req(ok,msg):
    if not ok: errors.append(msg)
dest=v["destinations"]
req(sum(x["tokens"] for x in dest)==250_000_000,"genesis destinations must equal 250M")
req(sum(x["percent"] for x in dest)==100,"genesis percentages must equal 100")
req(v["reconciliation"]["unassignedTokens"]==0,"unassigned PNEX must be zero")
req(v["reconciliation"]["creatorReceivesFullSupplyFirst"] is False,"creator must not receive full supply first")
req(v["authorityRules"]["mintAuthorityAfterGenesis"] is None,"mint authority target must be revoked")
req(v["authorityRules"]["freezeAuthorityAfterGenesis"] is None,"freeze authority target must be revoked")
req(v["authorityRules"]["privateKeysStoredByWorldz"] is False,"Worldz must not store private keys")
req(v["mainnetExecutionEnabled"] is False,"vault plan mainnet must remain off")
expected={
 "phenix_chance_vault":62_500_000,
 "genesis_liquidity":12_500_000,
 "staged_liquidity_reserve":100_000_000,
 "developer_streamflow_vesting":25_000_000,
 "purple_diamond_handz_claim_vault":2_500_000,
 "phenix_total_supply_flywheel":47_500_000
}
req({x["id"]:x["tokens"] for x in dest}==expected,"genesis destination amounts drift")
req(all(x["address"] is None for x in dest),"prelaunch vault plan must not invent addresses")
req(p["identity"]["mint"] is None,"proof manifest must not invent mint")
req(p["identity"]["imageUri"] is None,"proof manifest must not invent logo URI")
req(p["identity"]["metadataUri"] is None,"proof manifest must not invent metadata URI")
req(p["publicFacts"]["grossTraderFeeTargetBps"]==75,"fee target drift")
req(p["publicFacts"]["dynamicFee"] is False,"dynamic fee must remain off")
req(p["publicFacts"]["ordinaryTransferTaxPercent"]==0,"transfer tax must remain zero")
req(p["publicFacts"]["genesisLiquidityPercent"]==5,"genesis LP drift")
req(p["publicFacts"]["totalLiquidityAllocationPercent"]==45,"total liquidity drift")
req(p["publicFacts"]["developerGenesisLiquidPercent"]==0,"developer genesis liquid must be zero")
req(p["publicFacts"]["creatorControlledLpPermanentLockTargetPercent"]==100,"LP lock target drift")
req(p["mainnetExecutionEnabled"] is False,"proof manifest mainnet must remain off")
if errors:
    raise SystemExit("PNEX FINAL PACKAGE VALIDATION FAILED\n- "+"\n- ".join(errors))
print("PNEX FINAL PACKAGE VALIDATION — SUCCESS")
print("Genesis allocation: 250,000,000 / 100% / zero unassigned")
print("Placeholder addresses: NONE INVENTED")
print("Public proof template: fail-closed")
print("Mainnet execution: OFF")
