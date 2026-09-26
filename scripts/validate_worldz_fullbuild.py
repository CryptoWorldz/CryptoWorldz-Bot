from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

fullbuild = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json").read_text())
fullscope = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json").read_text())
core = (ROOT / "src/fullbuild/core.js").read_text()
telegram = (ROOT / "src/fullbuild/telegram.js").read_text()
runtime = (ROOT / "src/full-runtime-entry.js").read_text()
registry = (ROOT / "src/command-registry.js").read_text()
command_centre = (ROOT / "src/command-centre.js").read_text()
mini_html = (ROOT / "public/miniapp/index.html").read_text()
mini_js = (ROOT / "public/miniapp/app.js").read_text()
page = (ROOT / "launchpad.cryptoworldz.xyz/fullbuild/index.html").read_text()
scope_page = (ROOT / "launchpad.cryptoworldz.xyz/fullscope/index.html").read_text()
sitemap = (ROOT / "launchpad.cryptoworldz.xyz/sitemap.xml").read_text()
doc = (ROOT / "WORLDZFULLBUILD.md").read_text()
wallet_standard = (ROOT / "docs/WORLDZFULLBUILD-WALLET-RELEASE-STANDARD.md").read_text()

assert fullbuild["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullbuild["brand"] == "WorldzFullBuild™"
assert fullbuild["ownerAuthority"]["role"] == "OWNER_AND_FINAL_APPROVER"
assert fullbuild["deliveryTruthStandard"]["allowedStates"] == [
    "CODE_CHANGED","DEPLOYED","LIVE_SOURCE_VERIFIED","END_TO_END_VERIFIED","UNVERIFIED"
]
assert fullbuild["walletAndApprovalStandard"]["walletEntry"] == "FIRST_PARTY_WORLDZ_WEBSITE"
assert fullbuild["walletAndApprovalStandard"]["manualWalletBrowserRequired"] is False
assert fullbuild["walletAndApprovalStandard"]["externalWalletCustody"] is True
assert fullbuild["walletAndApprovalStandard"]["collectSecretPhrase"] is False

architecture = fullbuild["architecture"]
assert architecture["commandLeader"] == "ZED LED Command Centre MAX™"
assert "WorldzFullScope™" in architecture["requiredSubsystems"]
scope = architecture["fullScope"]
assert scope["required"] is True
assert scope["sourceContract"] == "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json"
assert scope["chainCount"] == 8
assert scope["maxTokensPerChain"] == 20
assert scope["initialTokenEnvironmentCapacity"] == 160

required_modules = {
    "WorldzWatch™","WorldzTrade™","WorldzInvest™","WorldzLock™","WorldzVest™",
    "WorldzAlert™","WorldzAuto™","WorldzProof™","Worldz Votes Centre™","WorldzGovern™"
}
assert required_modules.issubset(set(scope["requiredModules"]))
assert "WorldzFullScope™" in fullbuild["inheritance"]["modules"]
assert "Worldz Votes Centre™" in fullbuild["inheritance"]["modules"]
assert "WorldzGovern™" in fullbuild["inheritance"]["modules"]

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
assert execution["explicitOwnerReleaseRequired"] is True

build_link = fullscope["worldzFullBuild"]
assert build_link["requiredParent"] is True
assert build_link["integrationStatus"] == "REQUIRED_SUBSYSTEM"
assert build_link["sourceOfTruth"] == "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json"
assert build_link["capacityContract"]["initialTokenEnvironmentCapacity"] == 160
assert fullscope["maxTokensPerChain"] == 20
assert len(fullscope["chains"]) == 8

assert "validateFullBuildContract" in core
assert "WorldzFullBuild™" in telegram
assert "registerFullBuildTelegramHandlers" in runtime
assert "register_worldz_fullbuild" in runtime
assert re.search(r'\["worldzfullbuild",\s*"Open the complete WorldzFullBuild', registry)
assert 'WORLDZFULLBUILD™ — MASTER BUILD' in command_centre
assert '/worldzfullbuild' in command_centre

assert "WorldzFullBuild™" in mini_html
assert 'id="fullbuild"' in mini_html
assert 'id="fullbuild-home-card"' in mini_html
assert "WorldzFullBuild™" in mini_js
assert 'data-open="fullbuild"' in mini_js

assert "WORLDZFULLBUILD" in page.upper()
assert "WorldzFullScope™ is part of the master build." in page
assert "POPULARITY ONLY" in page
assert "DAO GOVERNANCE ONLY" in page
assert "Part of WorldzFullBuild™" in scope_page
assert "https://launchpad.cryptoworldz.xyz/fullbuild/" in sitemap
assert "canonical machine contract" in doc.lower()
assert "first-party Worldz website" in wallet_standard

print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("canonical=1 fullscope=REQUIRED chains=8 token_slots=160 voting=SEPARATED wallet_browser_required=0 mainnet_default=OFF")
