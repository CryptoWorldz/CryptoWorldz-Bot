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
magic = load("worldzpad-mainnet/fairfee/worldz-magic-fee.v1.json")
legacy = load("worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json")
launch_schema = load("worldzpad-omnichain/schemas/launch-intent.schema.json")
proof_schema = load("worldzpad-omnichain/schemas/worldz-proof.schema.json")

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

print("WORLDZ_OMNICHAIN_VALIDATION=PASS")
print("chains=8 fee_bps=75 split=51/17/15/8.5/8.5 legacy_vaults=10 epoch_hours=6 mainnet=OFF")
