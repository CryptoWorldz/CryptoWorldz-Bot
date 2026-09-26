from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json").read_text())
registry = (ROOT / "src/command-registry.js").read_text()
centre = (ROOT / "src/command-centre.js").read_text()
runtime = (ROOT / "src/full-runtime-entry.js").read_text()
telegram = (ROOT / "src/fullbuild/telegram.js").read_text()
page = (ROOT / "launchpad.cryptoworldz.xyz/fullbuild/index.html").read_text()
linkz = json.loads((ROOT / "cryptoworldz.xyz/worldzlinkz/registry.json").read_text())

assert contract["schema"] == "WORLDZ-FULLBUILD-V1"
assert contract["brand"] == "WorldzFullBuild™"
assert contract["projectContinuity"]["latestOwnerDirective"]["state"] == "INCORPORATED_INTO_WORLDZFULLBUILD_PARENT"
assert contract["projectWideIntegration"]["currentDirectiveState"] == "WHOLE_PROJECT_AND_PROJECT_CHAT_INHERITANCE_ACTIVE"

genesis = [(x["symbol"], x["supply"]) for x in contract["projectContinuity"]["genesisFour"]]
assert genesis == [("WLDZ",100000000),("RVIV",200000000),("PNEX",250000000),("MRCL",348000000)]

scope = contract["architecture"]["fullScope"]
assert scope["required"] is True
assert scope["chainCount"] == 8
assert scope["maxTokensPerChain"] == 20
assert scope["initialTokenEnvironmentCapacity"] == 160

assert contract["votingSeparation"]["popularity"]["governanceAuthority"] is False
assert contract["votingSeparation"]["governance"]["popularityRankingEffect"] is False
assert contract["executionIntegration"]["fullScopeMainnetDefault"] is False
assert contract["executionIntegration"]["externalWalletSignatureRequired"] is True
assert contract["executionIntegration"]["telegramPrivateKeyCustody"] is False

fees = contract["projectWideIntegration"]["feeAndFlywheel"]
assert fees["revivePilotGrossFeeBps"] == 75
assert sum(fees["reviveProposedSplitPercent"].values()) == 100

assert "worldzfullbuild" in registry
assert "worldzlinks" in registry
assert "WORLDZFULLBUILD™ — MASTER BUILD" in centre
assert "registerFullBuildTelegramHandlers" in runtime
assert "WORLDZFULLBUILD™ — MASTER BUILD" in telegram
assert "COMPLETE PROJECT INHERITANCE" in page
assert linkz["brand"] == "WorldzLinkz™"
assert linkz["qrTarget"] == "https://cryptoworldz.xyz/worldzlinkz/"

for required in [
    "WORLDZFULLBUILD.md",
    "docs/WORLDZFULLBUILD-WALLET-RELEASE-STANDARD.md",
    "WORLDZFULLBUILD-MEMORY-STORAGE-STANDARD.md",
    "purplediamondcrew.com/legacy-flywheel.v1.json"
]:
    assert (ROOT / required).exists(), required

print("WORLDZ_FULLBUILD_PROJECT_INHERITANCE=PASS")
print("genesis=4 fullscope=8x20 wallet=FIRST_PARTY votes=SEPARATE worldzlinkz=INHERITED mainnet_default=OFF")
