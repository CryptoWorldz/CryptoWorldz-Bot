#!/usr/bin/env python3
"""Read-only legacy token creator evidence collector. Run with Python 3 on a networked runner."""
import json, os, pathlib, time, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
rpc_url=os.environ.get("SOLANA_RPC_URL","https://api.mainnet-beta.solana.com")
def rpc(method,params):
    req=urllib.request.Request(rpc_url,json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),{"Content-Type":"application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=35) as r: result=json.load(r)
            if "error" in result: raise RuntimeError(str(result["error"]))
            return result["result"]
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)
registry=json.loads((root/"worldzpad-mainnet/legacy-dev-wallet-candidates.2026-11-09.json").read_text())
legacy=json.loads((root/"worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json").read_text())
wallets={w["address"] for w in registry["wallets"]}
results=[]
for asset in legacy["assets"]:
    row={"symbol":asset["symbol"],"mint":asset.get("mint"),"creatorVerified":False}
    mint=row["mint"]
    if not mint: row["status"]="MINT_MISSING";results.append(row);continue
    try:
        account=rpc("getAccountInfo",[mint,{"encoding":"jsonParsed","commitment":"finalized"}])
        parsed=((account or {}).get("value") or {}).get("data") or {}
        state=parsed.get("parsed",{}).get("info",{}) if isinstance(parsed,dict) else {}
        row["currentMintAuthority"]=state.get("mintAuthority")
        row["currentFreezeAuthority"]=state.get("freezeAuthority")
        before=None; oldest=None; pages=0; exhausted=False
        while pages<150:
            opts={"limit":1000}
            if before: opts["before"]=before
            batch=rpc("getSignaturesForAddress",[mint,opts]);pages+=1
            if not batch: exhausted=True;break
            oldest=batch[-1]
            if len(batch)<1000: exhausted=True;break
            before=oldest["signature"]
        row["historyExhausted"]=exhausted
        row["pagesScanned"]=pages
        if oldest:
            row["earliestSignature"]=oldest["signature"]
            tx=rpc("getTransaction",[oldest["signature"],{"encoding":"jsonParsed","maxSupportedTransactionVersion":0}])
            if tx:
                keys=tx["transaction"]["message"]["accountKeys"]
                row["feePayer"]=keys[0]["pubkey"] if isinstance(keys[0],dict) else keys[0]
                row["signers"]=[k["pubkey"] for k in keys if isinstance(k,dict) and k.get("signer")]
                row["matchedCandidateSigners"]=[w for w in row["signers"] if w in wallets]
                row["matchedCandidateFeePayer"]=row["feePayer"] if row["feePayer"] in wallets else None
                row["status"]="TRANSACTION_RETRIEVED__INSTRUCTION_REVIEW_REQUIRED"
            else:row["status"]="EARLIEST_TX_UNAVAILABLE"
        else:row["status"]="NO_SIGNATURES"
    except Exception as e:row["status"]="RPC_ERROR";row["error"]=str(e)[:300]
    results.append(row)
path=pathlib.Path(os.environ.get("WORLDZ_AUDIT_OUTPUT","legacy-creator-audit.json"))
path.write_text(json.dumps({"network":"solana-mainnet-beta","readOnly":True,"results":results},indent=2)+"\n")
print(f"Saved {len(results)} token audit entries to {path}; no transactions submitted.")
