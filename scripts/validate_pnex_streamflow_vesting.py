#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/"worldzpad-mainnet"/"phenix"/"phenix-streamflow-vesting.v1.json"
c=json.loads(p.read_text())
errors=[]
def req(x,m):
    if not x: errors.append(m)
req(c["provider"]["sdkVersion"]=="13.4.0","Streamflow SDK version drift")
req(c["token"]["fixedSupplyTokens"]==250_000_000,"PNEX supply drift")
req(c["token"]["decimals"]==6,"PNEX decimals drift")
s=c["securityDefaults"]
for k in ["canTopup","cancelableBySender","cancelableByRecipient","transferableBySender","transferableByRecipient","automaticWithdrawal","earlyUnlock","recipientChangeAllowed"]:
    req(s[k] is False,f"{k} must be false")
req(s["walletOrMultisigSignatureRequired"] is True,"signature required")
d=c["schedules"]["developer"]
req(d["totalTokens"]==25_000_000 and d["cliffDays"]==90 and d["releaseCount"]==24,"developer schedule drift")
ch=c["schedules"]["phenixChanceVested"]
req(ch["totalTokens"]==37_500_000 and ch["cliffDays"]==30 and ch["releaseCount"]==12,"Chance schedule drift")
b=c["schedules"]["flyWheelBuilderTeamGrantDefault"]
req(b["cliffDays"]==90 and b["releaseCount"]==24,"builder grant schedule drift")
t=c["transactionBoundary"]
req(t["prepareInstructionsOnly"] is True and t["autoBroadcast"] is False and t["mainnetExecutionEnabled"] is False,"transaction boundary drift")
if errors: raise SystemExit("PNEX STREAMFLOW VESTING VALIDATION FAILED\n- "+"\n- ".join(errors))
print("PNEX STREAMFLOW VESTING VALIDATION — SUCCESS")
print("Developer: 90-day cliff / 24 x 30-day periods / non-cancellable / non-transferable")
print("Chance: first vested release after 30 days / 12 x 30-day periods")
print("FlyWheel builder grants: 90-day cliff / 24 x 30-day periods")
print("Mainnet signing/broadcast: OFF")
