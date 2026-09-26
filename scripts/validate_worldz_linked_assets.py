#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
linked = json.loads((ROOT/"worldzpad-mainnet/linked-assets/worldz-linked-asset.v1.json").read_text())
omni = json.loads((ROOT/"worldzpad-mainnet/flywheel/worldz-omnibuildz.v1.json").read_text())
errors=[]

def req(ok,msg):
    if not ok: errors.append(msg)

req(linked["availability"]=="ALL_WORLDZLAUNCHPAD_DEVELOPERS","LinkedAsset must be available to all developers")
p=linked["principles"]
req(p["activationRequiresProjectOptIn"] is True,"project opt-in required")
req(p["externalAssetIdentityMustBeVerified"] is True,"asset identity verification required")
req(p["noAffiliationClaimWithoutEvidence"] is True,"affiliation claims require evidence")
req(p["noAutomaticMarketBuy"] is True,"automatic market buys must remain off")
req(p["noForcedSwap"] is True,"forced swaps prohibited")
req(p["noHiddenFee"] is True,"hidden fee prohibited")
req(p["userWalletSignatureRequired"] is True,"wallet signature required")
req(linked["ansemExample"]["asset"]["mint"]=="9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump","ANSEM mint drift")
req(linked["ansemExample"]["status"]=="PUBLIC_ASSET_PRESET__NO_PARTNERSHIP_CLAIM","ANSEM preset must not claim partnership")
req(linked["blackBullExample"]["status"]=="NO_SEPARATE_TOKEN_IDENTITY_VERIFIED","do not invent BlackBull token")
req(linked["execution"]["mainnetExecutionEnabled"] is False,"LinkedAsset mainnet must stay off")
req(linked["execution"]["autoMarketBuy"] is False,"LinkedAsset auto market buy must stay off")

req(omni["source"]["maximumMasterReserveTokens"]==47_500_000,"OmniBuildz must stay inside FlyWheel")
req(omni["source"]["newSupplyCreated"] is False,"OmniBuildz cannot create new PNEX")
req(omni["source"]["fixedLanePercent"] is None,"do not invent a fixed OmniBuildz percentage")
lr=omni["liquidityRules"]
req(lr["noUnsupportedBridge"] is True,"unsupported bridges prohibited")
req(lr["noFakeWrappedAsset"] is True,"fake wrapped assets prohibited")
req(lr["chainNativeExecutionRequired"] is True,"chain-native execution required")
req(lr["pairAssetsMustBeVerified"] is True,"pair asset verification required")
req(omni["execution"]["mainnetExecutionEnabled"] is False,"OmniBuildz mainnet stays off")

if errors:
    raise SystemExit("WORLDZ LINKEDASSET / OMNIBUILDZ VALIDATION FAILED\n- "+"\n- ".join(errors))
print("WORLDZ LINKEDASSET / OMNIBUILDZ VALIDATION — SUCCESS")
print("LinkedAsset: available to every WorldzLaunchPad developer")
print("ANSEM preset: verified public asset identity; NO partnership claim")
print("BlackBull: no invented token identity")
print("OmniBuildz: inside existing 19% PNEX FlyWheel; no new supply")
print("Automatic market buys: OFF")
print("Mainnet execution: OFF")
