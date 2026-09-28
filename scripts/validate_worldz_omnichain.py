#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT / rel).read_text())

omni = load("worldzpad-omnichain/worldz-omnichain.v1.json")
registry = load("worldzpad-omnichain/chain-registry.v1.json")
fee = load("worldzpad-omnichain/fee-policy.v1.json")
product = load("worldzpad-omnichain/product-standard.v1.json")
analytics = load("worldzpad-omnichain/analytics/events.v1.json")
api = load("worldzpad-omnichain/api/openapi.v1.json")
magic = load("worldzpad-mainnet/fairfee/worldz-magic-fee.v1.json")
legacy = load("worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json")
launch_schema = load("worldzpad-omnichain/schemas/launch-intent.schema.json")
proof_schema = load("worldzpad-omnichain/schemas/worldz-proof.schema.json")
solana_adapter = load("worldzpad-omnichain/adapters/solana/solana.v1.json")
evm_adapter = load("worldzpad-omnichain/adapters/evm/shared-evm.v1.json")
xrpl_adapter = load("worldzpad-omnichain/adapters/xrpl/xrpl.v1.json")
sui_adapter = load("worldzpad-omnichain/adapters/sui/sui.v1.json")
bitworldz = load("worldzpad-omnichain/bitworldz/bitworldz.v1.json")
bitworldz_matrix = load("worldzpad-omnichain/bitworldz/chain-matrix.v1.json")

expected_chains = {
    "solana", "xrpl", "base", "ethereum", "bnb", "sui", "hyperevm", "robinhood"
}
if set(omni["supportedChainKeys"]) != expected_chains:
    raise SystemExit("Omnichain supportedChainKeys drifted")
if set(registry["chains"]) != expected_chains:
    raise SystemExit("chain registry must contain exactly eight supported chains")

if omni["mainnetExecutionEnabled"] is not False or registry["mainnetExecutionEnabled"] is not False:
    raise SystemExit("omnichain mainnet must remain disabled")
for key, chain in registry["chains"].items():
    if chain["mainnetExecutionEnabled"] is not False:
        raise SystemExit(f"{key}: mainnet execution unexpectedly enabled")

if fee["targetGrossTraderFeeBps"] != 75 or Decimal(str(fee["targetGrossTraderFeePercent"])) != Decimal("0.75"):
    raise SystemExit("MagicFeeNumber must remain 75 bps / 0.75%")
if magic["target"]["grossTraderFeeBps"] != 75:
    raise SystemExit("omnichain policy disagrees with canonical MagicFee policy")

split = fee["worldzControlledSplitPercent"]
if sum(Decimal(str(split[k])) for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")) != Decimal("100"):
    raise SystemExit("Worldz-controlled percentage split != 100")
split_bps = fee["worldzControlledSplitBps"]
if sum(split_bps[k] for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")) != 10000:
    raise SystemExit("Worldz-controlled basis-point split != 10000")
if [split_bps[k] for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")] != [5100,1700,1500,850,850]:
    raise SystemExit("locked 51/17/15/8.5/8.5 split drifted")

if legacy["sourceFeeRule"]["legacyFlywheelPercent"] != 15:
    raise SystemExit("Legacy Flywheel must receive 15% of Worldz-controlled revenue")
if legacy["legacyVaultFunding"]["vaultCount"] != 10:
    raise SystemExit("Legacy Flywheel must retain ten legacy vaults")
if legacy["epoch"]["hours"] != 6:
    raise SystemExit("Legacy Flywheel epoch must remain six hours")
if "No unsupported auto-bridge" not in legacy["legacyVaultFunding"]["nonSolanaSource"]:
    raise SystemExit("Legacy Flywheel cross-chain safety rule missing")

expected_evm_ids = {
    "ethereum": (1, 11155111),
    "base": (8453, 84532),
    "bnb": (56, 97),
    "hyperevm": (999, 998),
    "robinhood": (4663, 46630),
}
for key, (mainnet_id, testnet_id) in expected_evm_ids.items():
    chain = registry["chains"][key]
    if chain["family"] != "EVM":
        raise SystemExit(f"{key}: expected EVM family")
    if chain["mainnet"]["chainId"] != mainnet_id or chain["testnet"]["chainId"] != testnet_id:
        raise SystemExit(f"{key}: chain ID mismatch")

expected_domains = {
    "solana": "solworldz.xyz",
    "xrpl": "xrpworldz.xyz",
    "base": "baseworldz.xyz",
    "ethereum": "ethworldz.xyz",
    "bnb": "bnbworldz.xyz",
    "sui": "suiworldz.xyz",
    "hyperevm": "hyperworldz.xyz",
    "robinhood": "robinworldz.xyz",
}
for key, domain in expected_domains.items():
    if registry["chains"][key]["domain"] != domain:
        raise SystemExit(f"{key}: domain mismatch")

if launch_schema["properties"]["economics"]["properties"]["targetGrossTraderFeeBps"].get("const") != 75:
    raise SystemExit("launch intent schema must lock the v1 target to 75 bps")
if launch_schema["properties"]["economics"]["properties"]["dynamicFeeRequested"].get("const") is not False:
    raise SystemExit("launch intent v1 must keep dynamic fee requested OFF")
if proof_schema["properties"]["chain"]["enum"] != launch_schema["properties"]["chain"]["enum"]:
    raise SystemExit("Worldz Proof and Launch Intent chain sets differ")

required_disclosure = set(omni["requiredPreSignatureDisclosure"])
for item in (
    "gross_trader_fee",
    "network_gas_estimate",
    "external_protocol_or_dex_deduction",
    "creator_receipt",
    "referrer_receipt",
    "legacy_flywheel_receipt",
    "worldz_launchpad_receipt",
    "oneworldz_impact_receipt",
):
    if item not in required_disclosure:
        raise SystemExit(f"missing disclosure: {item}")

if "hidden_fee" not in fee["prohibited"]:
    raise SystemExit("hidden fees must remain explicitly prohibited")
if registry["chains"]["xrpl"]["feeCapability"] != "CHAIN_NATIVE_MARKET_RULES__NO_HIDDEN_TRANSFER_TAX":
    raise SystemExit("XRPL must not emulate MagicFee with a hidden transfer tax")

# Bitcoin-facing OmniBTC rail is a first-class Worldz Omnichain product.
if omni["products"].get("bitWorldzOmniBtc") is not True:
    raise SystemExit("BitWorldz OmniBTC product registration missing")
if omni["policyPaths"].get("bitWorldz") != "worldzpad-omnichain/bitworldz/bitworldz.v1.json":
    raise SystemExit("BitWorldz policy path drifted")
if bitworldz["mainnetExecutionEnabled"] is not False or bitworldz_matrix["mainnetExecutionEnabled"] is not False:
    raise SystemExit("BitWorldz mainnet must remain disabled")
if set(bitworldz["supportedWorldzChainTargets"]) != expected_chains:
    raise SystemExit("BitWorldz must target the eight Worldz chains")
if set(bitworldz_matrix["chains"]) != expected_chains:
    raise SystemExit("BitWorldz chain matrix must cover the eight Worldz chains")

# Best-of-best product features must not silently disappear.
if product["creatorEconomics"]["defaultWorldzControlledSharePercent"] != 51:
    raise SystemExit("creator product share drifted")
if product["referralEconomics"]["defaultWorldzControlledSharePercent"] != 17:
    raise SystemExit("referrer product share drifted")
for flag_path, value in (
    ("launchpad-to-launchpad", product["referralEconomics"]["launchpadToLaunchpad"]),
    ("white-label", product["builderPlatform"]["whiteLabel"]),
    ("public API", product["builderPlatform"]["publicApi"]),
    ("SDK", product["builderPlatform"]["sdk"]),
    ("Worldz Terminal", product["discovery"]["worldzTerminal"]),
    ("plain-English errors", product["experience"]["plainEnglishErrors"]),
    ("fee disclosure", product["trust"]["preSignatureFeeDisclosure"]),
    ("no hidden fees", product["trust"]["noHiddenFees"]),
):
    if value is not True:
        raise SystemExit(f"required product feature disabled: {flag_path}")

# Analytics contract must cover the core creator/referral/proof funnel and never capture secrets.
analytics_names = {e["name"] for e in analytics["events"]}
for name in (
    "worldz_launch_started",
    "worldz_fee_preview_seen",
    "worldz_launch_simulated",
    "worldz_token_created",
    "worldz_first_trade",
    "worldz_referral_attributed",
    "worldz_creator_fee_accrued",
    "worldz_referrer_fee_accrued",
    "worldz_legacy_fee_accrued",
    "worldz_proof_created",
):
    if name not in analytics_names:
        raise SystemExit(f"analytics event missing: {name}")
if analytics["identityRules"]["neverSendPrivateKeysOrSeedPhrases"] is not True:
    raise SystemExit("analytics secret-safety rule missing")

# API contract must expose the non-custodial build flow and keep mainnet disabled.
required_paths = {
    "/v1/chains",
    "/v1/launch/quote",
    "/v1/launch/simulate",
    "/v1/launch/prepare",
    "/v1/launch/execute",
    "/v1/referrals/resolve",
    "/v1/proofs/{proofId}",
    "/v1/white-label/operators/{operatorId}",
}
if not required_paths.issubset(set(api["paths"])):
    raise SystemExit("Omnichain API contract missing required route(s)")
if api["x-worldz-safety"]["mainnetExecutionEnabled"] is not False:
    raise SystemExit("API mainnet execution must remain disabled")
if api["x-worldz-safety"]["noPrivateKeysAccepted"] is not True:
    raise SystemExit("API must never accept private keys")
if api["x-worldz-safety"]["noHiddenFees"] is not True:
    raise SystemExit("API hidden-fee protection missing")


# Chain-native adapter contracts are mandatory and independently mainnet-gated.
for name, adapter in (
    ("solana", solana_adapter),
    ("evm", evm_adapter),
    ("xrpl", xrpl_adapter),
    ("sui", sui_adapter),
):
    if adapter["mainnetExecutionEnabled"] is not False:
        raise SystemExit(f"{name}: adapter mainnet unexpectedly enabled")

if solana_adapter["fee"]["targetGrossTraderFeeBps"] != 75:
    raise SystemExit("Solana adapter MagicFee target drifted")
if solana_adapter["legacyFlywheel"]["vaultCount"] != 10 or solana_adapter["legacyFlywheel"]["epochHours"] != 6:
    raise SystemExit("Solana Legacy Flywheel adapter drifted")
if set(evm_adapter["chainKeys"]) != {"ethereum","base","bnb","hyperevm","robinhood"}:
    raise SystemExit("shared EVM adapter must cover exactly five EVM chains")
for key, (mainnet_id, testnet_id) in expected_evm_ids.items():
    n = evm_adapter["networks"][key]
    if n["mainnetChainId"] != mainnet_id or n["testnetChainId"] != testnet_id:
        raise SystemExit(f"EVM adapter network mismatch: {key}")
if evm_adapter["token"]["transferTaxDefault"] is not False:
    raise SystemExit("EVM adapter may not default to a transfer tax")
if evm_adapter["legacyFlywheel"]["automaticBridgeEnabled"] is not False:
    raise SystemExit("EVM Legacy Flywheel auto-bridge must remain disabled")
if xrpl_adapter["token"]["hiddenTransferTax"] is not False:
    raise SystemExit("XRPL adapter may not hide a transfer tax")
if xrpl_adapter["legacyFlywheel"]["automaticBridgeEnabled"] is not False:
    raise SystemExit("XRPL Legacy Flywheel auto-bridge must remain disabled")
if sui_adapter["transactionModel"]["programmableTransactionBlocks"] is not True:
    raise SystemExit("Sui adapter must retain PTB support")
if sui_adapter["legacyFlywheel"]["automaticBridgeEnabled"] is not False:
    raise SystemExit("Sui Legacy Flywheel auto-bridge must remain disabled")

print("WORLDZ_OMNICHAIN_VALIDATION=PASS")
print("chains=8 adapters=4/native+sharedEVM bitworldz=LOCKED fee_bps=75 split=51/17/15/8.5/8.5 legacy_vaults=10 epoch_hours=6 api=LOCKED product=LOCKED analytics=LOCKED mainnet=OFF")
