#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
canonical=ROOT/"worldzpad-omnichain/schemas/worldz-proof-receipt.v1.json"
aliases=[
    ROOT/"worldzpad-mainnet/proof/worldz-proof-receipt.schema.json",
    ROOT/"launchpad.cryptoworldz.xyz/.well-known/worldz-proof-receipt.schema.json",
    ROOT/"launchpad.cryptoworldz.xyz/schemas/worldz-proof-receipt.v1.json",
]
schema=json.loads(canonical.read_text())
for path in aliases:
    assert path.is_file(), path
    assert json.loads(path.read_text())==schema, f"schema drift: {path}"

page=(ROOT/"launchpad.cryptoworldz.xyz/proof-receipt/index.html").read_text()
assert schema["title"]=="Worldz Proof Receipt™"
assert schema["$id"]=="https://launchpad.cryptoworldz.xyz/.well-known/worldz-proof-receipt.schema.json"
req=set(schema["required"])
for field in ("receiptId","registryTokenId","chain","actionType","status","transaction","token","source","recipients","balances","verification","createdAt"):
    assert field in req, field
assert schema["properties"]["balances"]["minItems"]==1
balance_props=schema["properties"]["balances"]["items"]["properties"]
assert balance_props["address"]["minLength"]==1
assert balance_props["assetId"]["minLength"]==1
assert balance_props["beforeRaw"]["pattern"]=="^[0-9]+$"
assert balance_props["afterRaw"]["pattern"]=="^[0-9]+$"
assert balance_props["deltaRaw"]["pattern"]=="^-?[0-9]+$"
assert "confirmation" in schema["properties"]["transaction"]["required"]
assert schema["properties"]["verification"]["properties"]["privateKeysStored"]["const"] is False
assert {"CONFIRMED","PASSED","FAILED"}.issubset(set(schema["properties"]["status"]["enum"]))
for action in ("token_create","market_launch","distribution","liquidity","lock","vesting","burn","fee_route","bridge"):
    assert action in schema["properties"]["actionType"]["enum"], action

passed=next(x for x in schema["allOf"] if x.get("if",{}).get("properties",{}).get("status",{}).get("const")=="PASSED")
v=passed["then"]["properties"]["verification"]["properties"]
assert v["onChainReadBack"]["const"] is True
assert v["amountsReconciled"]["const"] is True
assert v["balanceChangesReconciled"]["const"] is True
assert set(passed["then"]["properties"]["transaction"]["properties"]["confirmation"]["enum"])=={"finalized","validated"}
assert passed["then"]["properties"]["balances"]["minItems"]==1

for phrase in ("WORLDZ PROOF RECEIPT™","before/after balances","private keys"):
    assert phrase.lower() in page.lower(), phrase
print("WORLDZ_PROOF_RECEIPT_VALIDATION=PASS")
print("PASSED requires finalized/validated chain proof + reconciled amounts + non-empty balance evidence")
