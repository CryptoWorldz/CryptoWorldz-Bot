#!/usr/bin/env python3
import argparse,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
P=HERE/"pnex-launch-readiness.v1.json"
I=HERE/"pnex-token-identity.v1.json"
R=json.loads(P.read_text()); identity=json.loads(I.read_text())
BLOCK={"BLOCKED","FAIL","PENDING"}
def report():
    gates=R["gates"]
    blocked=[g for g in gates if g["status"] in BLOCK]
    return {
      "token":R["token"],
      "totalGates":len(gates),
      "passedOrBuilt":len(gates)-len(blocked),
      "blocked":len(blocked),
      "blockedIds":[g["id"] for g in blocked],
      "canonicalMint":identity["mint"],
      "mainnetExecutionEnabled":R["mainnetExecutionEnabled"],
      "launchReady":len(blocked)==0 and R["mainnetExecutionEnabled"] is True
    }
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--strict",action="store_true")
    a=p.parse_args()
    x=report()
    print(json.dumps(x,indent=2))
    if a.strict and not x["launchReady"]: raise SystemExit(2)
if __name__=="__main__": main()
