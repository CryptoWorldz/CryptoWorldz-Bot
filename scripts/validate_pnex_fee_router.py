#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-fee-router.v1.json").read_text())
e=[]
def r(x,m):
    if not x:e.append(m)
r(c["source"]["grossTraderFeeTargetBps"]==75,"fee bps drift")
r(c["source"]["dynamicFee"] is False,"dynamic fee must be off")
r(c["source"]["doNotAssumeVenueProtocolPercent"] is True,"venue deductions must be measured")
s=c["splitPercentOfWorldzControlledClaimedFee"]
r(sum(s[k] for k in ["creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact"])==100,"split !=100")
r((s["creator"],s["referrer"],s["legacyFlywheel"],s["worldzLaunchPad"],s["oneWorldzImpact"])==(51,17,15,8.5,8.5),"split drift")
w=c["integerWeights"]
keys=[k for k in w if k!="denominator"]
r(sum(w[k] for k in keys)==w["denominator"]==1000,"integer weights drift")
r(c["legacy"]["verifiedVaultCount"]==10 and c["legacy"]["equalPercentPerLegacyVault"]==1.5,"legacy split drift")
r(c["legacy"]["epochHours"]==6,"legacy epoch drift")
r(c["noReferrer"]["automaticRedirect"] is False,"no-referrer share must not silently redirect")
x=c["execution"]
r(x["mainnetExecutionEnabled"] is False and x["autoBroadcast"] is False and x["privateKeyStorage"] is False,"execution safety drift")
r(x["walletOrMultisigSignatureRequired"] is True and x["simulationRequired"] is True,"signature/simulation required")
if e: raise SystemExit("PNEX FEE ROUTER VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX FEE ROUTER VALIDATION — SUCCESS")
print("Basis: actual claimed Worldz-controlled fees after venue deductions")
print("Split: 51 / 17 / 15 / 8.5 / 8.5")
print("Legacy: 10 x 1.5% vault entitlements / 6-hour epochs")
print("No referrer: 17% stays accrued; no silent redirect")
