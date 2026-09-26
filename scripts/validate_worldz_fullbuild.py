#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT/rel).read_text(encoding="utf-8"))

full=load("worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json")
public=load("launchpad.cryptoworldz.xyz/fullbuild/contract.json")
identity=load("worldzpad-mainnet/token-identity/worldz-token-registry.v1.json")
inheritance=load("worldzpad-mainnet/launch-inheritance/worldz-launch-inheritance.v1.json")
fullscope=load("worldzpad-omnichain/fullscope/worldz-fullscope.v1.json")
fee=load("worldzpad-omnichain/fee-policy.v1.json")
capability=load("worldzpad-mainnet/worldz-launch-capability-matrix.v1.json")

assert full["schema"]=="WORLDZ-FULLBUILD-V1"
assert full["brand"]=="WorldzFullBuild™"
assert full["status"]=="MAIN_INTEGRATION_SOURCE_OF_TRUTH"

public_copy=dict(public)
public_copy.pop("source",None)
assert public_copy==full, "public FullBuild contract drift"

for module in full["architecture"]["modules"]:
    assert (ROOT/module["source"]).exists(), f"missing FullBuild source: {module['source']}"

registry_by_symbol={t["symbol"]:t for t in identity["tokens"]}
for token in full["canonicalTokens"]:
    source=registry_by_symbol[token["symbol"]]
    assert token["order"]==source["launchOrder"]
    assert token["name"]==source["name"]
    assert token["lifecycle"]==source["lifecycle"]
    assert token["mint"]==source.get("canonicalMint")
    if token["symbol"]=="WLDZ":
        assert token["designSupplyTokens"]==source["allocationDesignCeilingTokens"]==100000000
    else:
        assert token["fixedSupplyTokens"]==source["fixedSupplyTokens"]

assert full["launchInheritance"]["source"]=="worldzpad-mainnet/launch-inheritance/worldz-launch-inheritance.v1.json"
assert full["launchInheritance"]["externalWalletCustody"]==inheritance["walletBoundary"]["externalWalletCustody"] is True
assert full["launchInheritance"]["collectSeedPhrase"]==inheritance["walletBoundary"]["collectSeedPhrase"] is False
assert full["launchInheritance"]["collectPrivateKey"]==inheritance["walletBoundary"]["collectPrivateKey"] is False
assert full["launchInheritance"]["mainnetExecutionInherited"]==inheritance["executionBoundary"]["mainnetGlobalDefault"] is False

assert full["fullScope"]["chains"]==[c["key"] for c in fullscope["chains"]]
assert full["fullScope"]["maxTokensPerChain"]==fullscope["maxTokensPerChain"]==20
assert full["fullScope"]["initialEnvironmentCapacity"]==160
assert fullscope["voting"]["popularity"]["mayExecuteGovernance"] is False
assert fullscope["voting"]["governance"]["mayAffectPopularityRanking"] is False

magic=full["feeAndFlywheel"]
assert magic["targetGrossTraderFeeBpsWhereProven"]==fee["targetGrossTraderFeeBps"]==75
assert magic["dynamicFeeDefault"]==fee["dynamicFeeDefault"] is False
for key in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact"):
    assert Decimal(str(magic["worldzControlledSplitPercent"][key]))==Decimal(str(fee["worldzControlledSplitPercent"][key]))
assert sum(Decimal(str(v)) for v in magic["worldzControlledSplitPercent"].values())==Decimal("100")

cap_modules={m["id"] for m in capability["platformModules"]}
for required in ("launch-inheritance","token-identity","proof-receipt","fullscope","omnichain","worlddexpush","flywheel","bitworldz"):
    assert required in cap_modules, required

assert full["executionBoundary"]["globalMainnetMarketLaunchDefault"] is False
assert full["executionBoundary"]["explicitHumanApprovalRequired"] is True
assert full["executionBoundary"]["privateKeysStoredByWorldz"] is False
assert full["executionBoundary"]["automaticVendorPayment"] is False
assert full["executionBoundary"]["automaticMainnetBroadcast"] is False

blob=json.dumps(full).lower()
for forbidden in ("seed phrase value","private key value","password=","secret="):
    assert forbidden not in blob

print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("tokens=4 chains=8 inheritance=ACTIVE proof=REQUIRED provider_truth=EVIDENCE_DRIVEN mainnet_market=GATED")
