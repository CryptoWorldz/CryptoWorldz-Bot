#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
schema=json.loads((ROOT/"worldzpad-omnichain/schemas/worldz-proof-receipt.v1.json").read_text())
page=(ROOT/"launchpad.cryptoworldz.xyz/proof-receipt/index.html").read_text()
assert schema["title"]=="Worldz Proof Receipt™"
req=set(schema["required"])
for field in ("receiptId","chain","actionType","status","transaction","token","source","recipients","balances","verification","createdAt"):
    assert field in req, field
assert schema["properties"]["verification"]["properties"]["privateKeysStored"]["const"] is False
assert {"CONFIRMED","PASSED","FAILED"}.issubset(set(schema["properties"]["status"]["enum"]))
for action in ("token_create","market_launch","distribution","liquidity","lock","vesting","burn","fee_route","bridge"):
    assert action in schema["properties"]["actionType"]["enum"], action
for phrase in ("WORLDZ PROOF RECEIPT™","before/after balances","private keys"):
    assert phrase.lower() in page.lower(), phrase
print("WORLDZ_PROOF_RECEIPT_VALIDATION=PASS")
print("receipt=tx+identity+source+recipients+balances+readback private_keys=NEVER")
