#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT/rel).read_text(encoding="utf-8"))

inheritance=load("worldzpad-mainnet/launch-inheritance/worldz-launch-inheritance.v1.json")
public_contract=load("launchpad.cryptoworldz.xyz/inheritance/contract.json")
chain_registry=load("worldzpad-omnichain/chain-registry.v1.json")
capability=load("worldzpad-mainnet/worldz-launch-capability-matrix.v1.json")
fee=load("worldzpad-omnichain/fee-policy.v1.json")
platform=load("launchpad.cryptoworldz.xyz/platform-config.json")
fullscope=load("worldzpad-omnichain/fullscope/worldz-fullscope.v1.json")
identity=load("worldzpad-mainnet/token-identity/worldz-token-registry.v1.json")
jupiter=load("worldzpad-mainnet/worlddexpush/jupiter-vrfd-worldz.v1.json")
proof=load("worldzpad-omnichain/schemas/worldz-proof-receipt.v1.json")
intent=load("worldzpad-omnichain/schemas/launch-intent.schema.json")
product=load("worldzpad-omnichain/product-standard.v1.json")

assert inheritance["schema"]=="WORLDZ-LAUNCH-INHERITANCE-V1"
assert inheritance["executionBoundary"]["mainnetGlobalDefault"] is False
assert inheritance["walletBoundary"]["externalWalletCustody"] is True
assert inheritance["walletBoundary"]["collectSeedPhrase"] is False
assert inheritance["walletBoundary"]["collectPrivateKey"] is False
assert inheritance["walletBoundary"]["simulateBeforeSignature"] is True
assert inheritance["walletBoundary"]["humanWalletSignatureRequired"] is True

public_copy=dict(public_contract)
public_copy.pop("source",None)
assert public_copy==inheritance, "public inheritance contract drift"

chains=set(inheritance["scope"]["supportedChains"])
assert chains==set(chain_registry["chains"])
assert chains=={c["key"] for c in capability["chains"]}
assert chains=={c["key"] for c in fullscope["chains"]}
assert len(chains)==8
assert chain_registry["mainnetExecutionEnabled"] is False
assert all(c["mainnetExecutionEnabled"] is False for c in chain_registry["chains"].values())

magic=inheritance["economicsProfiles"]["worldzMagic75"]
assert magic["targetGrossTraderFeeBps"]==fee["targetGrossTraderFeeBps"]==75
assert magic["dynamicFeeDefault"]==fee["dynamicFeeDefault"] is False
for key in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact"):
    assert Decimal(str(magic["splitPercent"][key]))==Decimal(str(fee["worldzControlledSplitPercent"][key]))
assert sum(Decimal(str(v)) for v in magic["splitPercent"].values())==Decimal("100")

public=inheritance["economicsProfiles"]["publicCreatorConfigurable"]
policy=platform["feePolicy"]
assert Decimal(str(public["projectTradingFeeMinPercent"]))==Decimal(str(policy["projectTradingFeeMinPercent"]))
assert Decimal(str(public["projectTradingFeeMaxPercent"]))==Decimal(str(policy["projectTradingFeeMaxPercent"]))
assert Decimal(str(public["worldzLaunchPadShareOfCollectedProjectFeePercent"]))==Decimal(str(policy["worldzLaunchPadShareOfCollectedProjectFeePercent"]))
assert public["walletTransferTaxPercent"]==policy["walletTransferTaxPercent"]==0
assert inheritance["tokenAllocationBoundary"]["publicCreatorRoute"]["implicitWorldzTokenSupplySharePercent"]==policy["worldzLaunchPadShareOfTokenSupplyPercent"]==0

assert product["creatorEconomics"]["defaultWorldzControlledSharePercent"]==51
assert product["referralEconomics"]["defaultWorldzControlledSharePercent"]==17
assert product["inheritance"]["enabled"] is True
assert product["inheritance"]["contract"]=="worldzpad-mainnet/launch-inheritance/worldz-launch-inheritance.v1.json"
assert product["inheritance"]["everyLaunchGetsIdentity"] is True
assert product["inheritance"]["everyLaunchGetsFullScope"] is True
assert product["inheritance"]["everyConfirmedActionGetsProof"] is True
assert product["inheritance"]["mainnetReleaseIsPerChainAndPerVenue"] is True

required_modules={m["id"] for m in inheritance["requiredModules"] if m["required"]}
for module in {"token-identity","chain-capability","fee-disclosure","fullscope","proof-receipt","worlddexpush","locks","vesting","universal-flywheel","votes","govern"}:
    assert module in required_modules, module

assert fullscope["financialSafety"]["walletSignatureRequired"] is True
assert fullscope["financialSafety"]["autoBroadcast"] is False
assert fullscope["financialSafety"]["mainnetExecutionEnabled"] is False
assert fullscope["voting"]["popularity"]["mayExecuteGovernance"] is False
assert fullscope["voting"]["governance"]["mayAffectPopularityRanking"] is False

proof_required=set(proof["required"])
assert {"receiptId","registryTokenId","chain","actionType","status","transaction","token","balances","verification"}.issubset(proof_required)
assert proof["properties"]["balances"]["minItems"]==1
bp=proof["properties"]["balances"]["items"]["properties"]
assert bp["address"]["minLength"]==1 and bp["assetId"]["minLength"]==1
assert bp["beforeRaw"]["pattern"]=="^[0-9]+$"
assert bp["afterRaw"]["pattern"]=="^[0-9]+$"
assert bp["deltaRaw"]["pattern"]=="^-?[0-9]+$"

live_solana={t["canonicalMint"] for t in identity["tokens"] if t.get("lifecycle")=="LIVE" and t.get("chain")=="Solana"}
jupiter_mints={t["mint"] for t in jupiter["tokens"]}
assert live_solana==jupiter_mints, "every LIVE Solana Worldz token must inherit Jupiter handoff"

intent_envs=set(intent["properties"]["environment"]["enum"])
all_test_envs={v for values in inheritance["launchIntent"]["supportedTestEnvironments"].values() for v in values}
all_mainnet_envs=set(inheritance["launchIntent"]["supportedMainnetEnvironment"].values())
assert all_test_envs.issubset(intent_envs)
assert all_mainnet_envs.issubset(intent_envs)
assert "mainnet" in intent_envs

schema_pairs={}
for rule in intent["allOf"]:
    chain=rule["if"]["properties"]["chain"]["const"]
    schema_pairs[chain]=set(rule["then"]["properties"]["environment"]["enum"])
for chain,tests in inheritance["launchIntent"]["supportedTestEnvironments"].items():
    expected=set(tests)|{inheritance["launchIntent"]["supportedMainnetEnvironment"][chain]}
    if inheritance["launchIntent"]["genericMainnetAliasAccepted"]:
        expected.add("mainnet")
    assert schema_pairs[chain]==expected, f"{chain}: chain/environment schema drift"

assert intent["properties"]["economics"]["properties"]["targetGrossTraderFeeBps"]["const"]==75
assert intent["properties"]["execution"]["properties"]["simulateFirst"]["const"] is True

assert inheritance["identityInheritance"]["mintPrefixNeverUsedAsName"] is True
assert inheritance["identityInheritance"]["unknownValuesRemainPending"] is True
assert inheritance["postLaunchInheritance"]["indexerStateNeverFaked"] is True
assert inheritance["postLaunchInheritance"]["vendorPaymentAutomatic"] is False

print("WORLDZ_LAUNCH_INHERITANCE=PASS")
print("chains=8 identity=LOCKED proof=REQUIRED fullscope=REQUIRED jupiter_live_solana=COVERED mainnet=PER_CHAIN_GATED")
