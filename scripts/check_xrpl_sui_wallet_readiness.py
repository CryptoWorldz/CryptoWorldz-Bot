#!/usr/bin/env python3
"""Fail-closed XRPL/Sui wallet and token-launch readiness checks. No network or keys."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))
def check(ok, reason):
    if not ok:
        raise SystemExit("FAIL: " + reason)
    print("PASS:", reason)

wallet = read("launchpad.cryptoworldz.xyz/worldz-app/core/wallet-connectors.json")
config = read("launchpad.cryptoworldz.xyz/worldz-app/config.json")
xrpl = read("worldzpad-omnichain/adapters/xrpl/xrpl.v1.json")
sui = read("worldzpad-omnichain/adapters/sui/sui.v1.json")
sui_native = read("worldzpad-sui-testnet/sui-native-adapter.v1.json")
sui_ui = read("launchpad.cryptoworldz.xyz/sui/config.json")
connectors = {entry["id"]: entry for entry in wallet["connectors"]}
check(wallet["mode"] == "EXTERNAL_CUSTODY_CONNECTION_ONLY", "wallet remains external-custody connection-only")
check(wallet["execution"] is False, "wallet execution disabled")
check(all(not config["security"][key] for key in ("mainnetBroadcastEnabled", "automaticBridgeEnabled", "automaticSwapEnabled")), "app mainnet/bridge/swap disabled")
check(config["identityWalletFoundation"]["signing"] is False and config["identityWalletFoundation"]["broadcast"] is False and config["identityWalletFoundation"]["secretCollection"] is False, "no built-in signing, broadcast or secret collection")
for ident in ("xrpl_external", "sui_external"):
    check(ident in connectors and connectors[ident]["execution"] is False, ident + " provider gate present, execution disabled")
check(bool(connectors["xrpl_external"].get("mobileHandoff")) and bool(connectors["sui_external"].get("mobileHandoff")), "XRPL and Sui mobile provider integration remains explicit")
check(xrpl["chainKey"] == "xrpl" and xrpl["mainnetExecutionEnabled"] is False, "XRPL mainnet blocked")
check(xrpl["token"]["currentLaunchStandard"] == "TRUST_LINE_TOKEN", "XRPL native trust-line standard retained")
check("EXPLICIT_MAINNET_RELEASE" in xrpl["releaseGates"] and "TRUST_LINE_TOKEN_TESTNET_PROOF" in xrpl["releaseGates"], "XRPL token proof and human release gates retained")
check(sui["chainKey"] == "sui" and sui["mainnetExecutionEnabled"] is False, "Sui mainnet blocked")
check("MOVE_PACKAGE_TESTS" in sui["releaseGates"] and "TESTNET_PUBLISH_PROOF" in sui["releaseGates"] and "EXPLICIT_MAINNET_RELEASE" in sui["releaseGates"], "Sui Move tests, testnet proof and human release gates retained")
check(sui_native["executionRail"]["mainnet"] == "LOCKED" and "DEVNET" in sui_native["executionRail"]["devnet"], "Sui devnet executable / mainnet locked")
check(sui_ui["mainnetExecution"] is False and sui_ui["marketLaunch"] is False and sui_ui["testnetRelease"] is False, "Sui front-end market and releases disabled")
check(bool(sui_ui.get("provenReference", {}).get("publishDigest")) and bool(sui_ui["provenReference"].get("initializeDigest")), "Sui devnet reference proof identifiers present (not fresh on-chain verification)")
print("XRPL/SUI READINESS GATES PASS: this does NOT certify wallet security, live execution, or mainnet launch.")
