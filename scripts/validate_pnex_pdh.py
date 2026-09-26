#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-purple-diamond-handz.v1.json").read_text())
e=[]
def r(x,m):
    if not x:e.append(m)
r(c["pool"]["tokens"]==2_500_000 and c["pool"]["percentOfSupply"]==1,"PDH pool drift")
r(c["pool"]["raw"]=="2500000000000","raw pool drift")
r(c["pool"]["vaultAddress"] is None,"do not invent claim vault address")
r(c["pool"]["unclaimedTokensRemainLocked"] is True,"unclaimed tokens must stay locked")
r(c["pool"]["automaticForfeiture"] is False,"no automatic forfeiture")
r(c["eligibilitySource"]["verifiedLegacyAssetCount"]==10,"legacy asset count drift")
r(c["eligibilitySource"]["reviveCandidateLedgerIsNotApproval"] is True,"old candidate ledger cannot imply approval")
w=c["weighting"]
r(w["equalPoolPercent"]==50 and w["sqrtHoldingPoolPercent"]==50,"weighting drift")
r(w["linkedWalletsAggregated"] is True,"linked wallets must aggregate")
r(c["claimWindow"]["expiry"] is None,"do not invent expiry")
x=c["execution"]
r(x["mainnetExecutionEnabled"] is False and x["autoTransfer"] is False,"execution must remain gated")
r(x["walletSignatureProofRequired"] is True and x["worldzProofRequired"] is True,"proof gates required")
if e: raise SystemExit("PNEX PURPLE DIAMOND HANDZ VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX PURPLE DIAMOND HANDZ VALIDATION — SUCCESS")
print("Pool: 1% / 2,500,000 PNEX -> dedicated claim vault")
print("Old REVIVE 216-wallet ledger: candidate evidence only, NOT automatic approval")
print("Claims: wallet signature + exclusions + duplicate-linked-wallet aggregation")
