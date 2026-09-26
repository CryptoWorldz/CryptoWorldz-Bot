from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
fullbuild = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json").read_text())
fullscope = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json").read_text())
runtime = (ROOT / "src/full-runtime-entry.js").read_text()
registry = (ROOT / "src/command-registry.js").read_text()
command_centre = (ROOT / "src/command-centre.js").read_text()
mini_html = (ROOT / "public/miniapp/index.html").read_text()
mini_js = (ROOT / "public/miniapp/app.js").read_text()
max_page = (ROOT / "cryptoworldz.xyz/command-centre-max/index.html").read_text()
page = (ROOT / "launchpad.cryptoworldz.xyz/fullbuild/index.html").read_text()
scope_page = (ROOT / "launchpad.cryptoworldz.xyz/fullscope/index.html").read_text()
sitemap = (ROOT / "launchpad.cryptoworldz.xyz/sitemap.xml").read_text()
websites = (ROOT / "src/websites-telegram.js").read_text()
linkz = json.loads((ROOT / "cryptoworldz.xyz/worldzlinkz/registry.json").read_text())
continuity = (ROOT / "docs/WORLDZFULLBUILD-PROJECT-CONTINUITY-2026-09-27.md").read_text()
ledger = (ROOT / "docs/WORLDZFULLBUILD-PROJECT-SOURCE-OF-TRUTH.md").read_text()

assert fullbuild["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullbuild["brand"] == "WorldzFullBuild™"
assert fullbuild["ownerAuthority"]["role"] == "OWNER_AND_FINAL_APPROVER"
assert fullbuild["walletAndApprovalStandard"]["walletEntry"] == "FIRST_PARTY_WORLDZ_WEBSITE"
assert fullbuild["walletAndApprovalStandard"]["manualWalletBrowserRequired"] is False
assert fullbuild["projectWideIntegration"]["currentDirectiveState"] == "WHOLE_PROJECT_AND_PROJECT_CHAT_INHERITANCE_ACTIVE"
assert fullbuild["projectWideIntegration"]["latestOwnerDirective"]["state"] == "INCORPORATED"
assert fullbuild["projectContinuity"]["latestOwnerDirective"]["state"] == "INCORPORATED"
assert fullbuild["commandPaths"]["worldzLinks"] == "/worldzlinks"
assert "WORLDZLINKZ_QR_ALL_DOMAIN_DIRECTORY" in fullbuild["projectContinuity"]["carriedForward"]

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
assert '"worldzlinks"' in registry
assert "worldzlinks" in websites
assert "WORLDZFULLBUILD™ — MASTER BUILD" in command_centre
assert "/worldzfullbuild" in command_centre
assert "/worldzlinks" in command_centre
assert 'id="fullbuild"' in mini_html
assert 'id="fullbuild-home-card"' in mini_html
assert 'id="memory-storage"' in mini_html
assert "PROJECT-WIDE INHERITANCE ACTIVE" in mini_html
assert "https://cryptoworldz.xyz/worldzlinkz/" in mini_html
assert "WorldzFullBuild™" in mini_js
assert 'data-open="fullbuild"' in mini_js
assert "WORLDZFULLBUILD™" in max_page
assert "WORLDZFULLSCOPE™" in max_page
assert "WorldzFullScope™ is part of the master build." in page
assert "PROJECT-WIDE INHERITANCE ACTIVE" in page
assert "https://cryptoworldz.xyz/worldzlinkz/" in page
assert "POPULARITY ONLY" in page
assert "DAO GOVERNANCE ONLY" in page
assert "Part of WorldzFullBuild™" in scope_page
assert "https://launchpad.cryptoworldz.xyz/fullbuild/" in sitemap
assert linkz["brand"] == "WorldzLinkz™"
assert linkz["tagline"] == "Every Worldz. One Link."
assert linkz["qrTarget"] == "https://cryptoworldz.xyz/worldzlinkz/"
assert "Latest whole-project directive (2026-09-27)" in continuity
assert "## Latest owner directive — 2026-09-27" in ledger

print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("fullscope=REQUIRED chains=8 token_slots=160 voting=SEPARATED project_inheritance=ACTIVE worldzlinkz=INHERITED mainnet_default=OFF")
