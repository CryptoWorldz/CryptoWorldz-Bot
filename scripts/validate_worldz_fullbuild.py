from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
fullbuild = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json").read_text())
fullscope = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json").read_text())
runtime = (ROOT / "src/full-runtime-entry.js").read_text()
registry = (ROOT / "src/command-registry.js").read_text()
command_centre = (ROOT / "src/command-centre.js").read_text()
page = (ROOT / "launchpad.cryptoworldz.xyz/fullbuild/index.html").read_text()
scope_page = (ROOT / "launchpad.cryptoworldz.xyz/fullscope/index.html").read_text()
sitemap = (ROOT / "launchpad.cryptoworldz.xyz/sitemap.xml").read_text()

assert fullbuild["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullbuild["brand"] == "WorldzFullBuild™"
assert fullbuild["ownerAuthority"]["role"] == "OWNER_AND_FINAL_APPROVER"
assert fullbuild["walletAndApprovalStandard"]["walletEntry"] == "FIRST_PARTY_WORLDZ_WEBSITE"
assert fullbuild["walletAndApprovalStandard"]["manualWalletBrowserRequired"] is False

scope = fullbuild["architecture"]["fullScope"]
assert scope["required"] is True
assert scope["chainCount"] == 8
assert scope["maxTokensPerChain"] == 20
assert scope["initialTokenEnvironmentCapacity"] == 160

required_modules = {
    "WorldzWatch™","WorldzTrade™","WorldzInvest™","WorldzLock™","WorldzVest™",
    "WorldzAlert™","WorldzAuto™","WorldzProof™","Worldz Votes Centre™","WorldzGovern™"
}
assert required_modules.issubset(set(scope["requiredModules"]))

pop = fullbuild["votingSeparation"]["popularity"]
gov = fullbuild["votingSeparation"]["governance"]
assert pop["brand"] == "Worldz Votes Centre™"
assert pop["governanceAuthority"] is False
assert gov["brand"] == "WorldzGovern™"
assert gov["popularityRankingEffect"] is False
assert set(pop["commands"]).isdisjoint(set(gov["commands"]))

execution = fullbuild["executionIntegration"]
assert execution["fullScopeMainnetDefault"] is False
assert execution["externalWalletSignatureRequired"] is True
assert execution["telegramPrivateKeyCustody"] is False
assert execution["autoBroadcastDefault"] is False
assert execution["perChainReleaseGate"] is True
assert execution["worldzProofRequired"] is True

link = fullscope["worldzFullBuild"]
assert link["requiredParent"] is True
assert link["integrationStatus"] == "REQUIRED_SUBSYSTEM"
assert link["sourceOfTruth"] == "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json"
assert link["capacityContract"]["initialTokenEnvironmentCapacity"] == 160

assert "registerFullBuildTelegramHandlers" in runtime
assert "register_worldz_fullbuild" in runtime
assert re.search(r'\["worldzfullbuild",\s*"Open the complete WorldzFullBuild', registry)
assert "WORLDZFULLBUILD™ — MASTER BUILD" in command_centre
assert "/worldzfullbuild" in command_centre
assert "WorldzFullScope™ is part of the master build." in page
assert "POPULARITY ONLY" in page
assert "DAO GOVERNANCE ONLY" in page
assert "Part of WorldzFullBuild™" in scope_page
assert "https://launchpad.cryptoworldz.xyz/fullbuild/" in sitemap

print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("fullscope=REQUIRED chains=8 token_slots=160 voting=SEPARATED mainnet_default=OFF")
