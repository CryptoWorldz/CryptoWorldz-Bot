#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
required=["WORLDZ-SUPERSTACK-MASTER.md","worldzpad-omnichain/chain-registry.v1.json","worldzpad-omnichain/worldz-omnichain.v1.json","worldzpad-omnichain/fullscope/worldz-fullscope.v1.json","worldzpad-mainnet/flywheel/worldz-universal-flywheel.v1.json","worldzpad-mainnet/flywheel/worldz-omnibuildz.v1.json","worldzpad-mainnet/linked-assets/worldz-linked-asset.v1.json","worldzpad-mainnet/token-identity/worldz-token-registry.v1.json","worldzpad-mainnet/token-identity/worlddex-push.v1.json","worldzpad-mainnet/proof/worldz-proof-receipt.schema.json"]
missing=[p for p in required if not (ROOT/p).is_file()]
if missing: raise SystemExit("WORLDZ_SUPERSTACK_FAIL missing: "+", ".join(missing))
reg=json.loads((ROOT/"worldzpad-mainnet/token-identity/worldz-token-registry.v1.json").read_text())
chains=json.loads((ROOT/"worldzpad-omnichain/chain-registry.v1.json").read_text())
for symbol in ("WLDZ","RVIV"):
 if not any(t.get("symbol")==symbol and t.get("lifecycle")=="LIVE" for t in reg["tokens"]): raise SystemExit("WORLDZ_SUPERSTACK_FAIL "+symbol+" identity not LIVE")
for c in chains["chains"]:
 if c.get("mainnetExecutionEnabled") is not False: raise SystemExit("WORLDZ_SUPERSTACK_FAIL imported omnichain adapter unexpectedly enables mainnet: "+c["id"])
print("WORLDZ_SUPERSTACK_PASS")
