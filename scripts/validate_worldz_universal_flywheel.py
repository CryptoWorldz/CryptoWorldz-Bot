#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "worldzpad-mainnet" / "flywheel" / "worldz-universal-flywheel.v1.json"
cfg = json.loads(P.read_text(encoding="utf-8"))
errors = []

def req(ok, msg):
    if not ok: errors.append(msg)

req(cfg["schema"] == "WORLDZ-UNIVERSAL-FLYWHEEL-V1", "wrong schema")
req(cfg["cycle"]["days"] == 30 and cfg["cycle"]["seconds"] == 2592000, "universal cycle must be 30 days")
req(cfg["cycle"]["legacyEpochsRemainIndependent"] is True, "legacy 6-hour epochs must remain independent")
req(cfg["funding"]["extraTraderFeeRequired"] is False, "universal cycle must not add hidden trader fee")
req(cfg["funding"]["legacyFlywheel"]["percentOfWorldzControlledFee"] == 15, "legacy flywheel share drift")
req(cfg["funding"]["legacyFlywheel"]["cadenceHours"] == 6, "legacy cadence drift")
req(cfg["funding"]["worldzLaunchPadShare"]["percentOfWorldzControlledFee"] == 8.5, "Worldz share drift")
req(cfg["funding"]["oneWorldzImpactShare"]["percentOfWorldzControlledFee"] == 8.5, "Impact share drift")
req(cfg["burnStandard"]["marketBuyAndBurnAutomated"] is False, "automated market buy/burn must remain disabled")
req(cfg["burnStandard"]["burnCannotBeReissued"] is True, "burn must be irreversible")
req(cfg["vestingStandard"]["worldzDefaultBuilderCliffDays"] >= 90, "builder cliff below policy")
req(cfg["vestingStandard"]["worldzDefaultBuilderVestingMonths"] >= 18, "builder vesting below policy")
req(cfg["execution"]["autoBroadcast"] is False, "auto broadcast must remain off")
req(cfg["execution"]["privateKeysStored"] is False, "private keys must never be stored")
req(cfg["execution"]["walletOrMultisigSignatureRequired"] is True, "signature boundary required")
req(cfg["execution"]["simulationRequired"] is True, "simulation required")
req(cfg["execution"]["mainnetExecutionEnabled"] is False, "mainnet execution must remain disabled")
coverage = cfg["coverage"]
req("WLDZ" in coverage["previousOfficialWorldzTokens"] and "RVIV" in coverage["previousOfficialWorldzTokens"], "previous Worldz coverage missing")
req("PNEX" in coverage["currentAndFutureOfficialWorldzTokens"] and "MRCL" in coverage["currentAndFutureOfficialWorldzTokens"], "future Worldz coverage missing")
req(coverage["externalWorldzLaunchPadTokens"].startswith("ALL_VERIFIED"), "external launch coverage missing")

if errors:
    raise SystemExit("WORLDZ UNIVERSAL FLYWHEEL VALIDATION FAILED\n- " + "\n- ".join(errors))
print("WORLDZ UNIVERSAL FLYWHEEL VALIDATION — SUCCESS")
print("Coverage: legacy + WLDZ/RVIV + PNEX/MRCL/future + every verified WorldzLaunchPad project")
print("Legacy cadence: 6 hours")
print("Universal cycle: 30 days")
print("Hidden fee increase: NO")
print("Token-specific burn: manifest/authority required; auto buy-and-burn OFF")
print("Mainnet execution: OFF")
