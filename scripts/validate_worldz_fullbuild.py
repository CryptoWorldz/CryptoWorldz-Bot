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
sitemap = (ROOT / "launchpad.cryptoworldz.xyz/sitemap.xml").read_text()\nwebsites = (ROOT / "src/websites-telegram.js").read_text()\nlinkz = json.loads((ROOT / "cryptoworldz.xyz/worldzlinkz/registry.json").read_text())\ncontinuity = (ROOT / "docs/WORLDZFULLBUILD-PROJECT-CONTINUITY-2026-09-27.md").read_text()\nledger = (ROOT / "docs/WORLDZFULLBUILD-PROJECT-SOURCE-OF-TRUTH.md").read_text()\n
assert fullbuild["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullbuild["brand"] == "WorldzFullBuild™"
assert fullbuild["ownerAuthority"]["role"] == "OWNER_AND_FINAL_APPROVER"
assert fullbuild["walletAndApprovalStandard"]["walletEntry"] == "FIRST_PARTY_WORLDZ_WEBSITE"
assert fullbuild["walletAndApprovalStandard"]["manualWalletBrowserRequired"] is False\nassert fullbuild["projectWideIntegration"]["currentDirectiveState"] == "WHOLE_PROJECT_AND_PROJECT_CHAT_INHERITANCE_ACTIVE"\nassert fullbuild["projectWideIntegration"]["latestOwnerDirective"]["state"] == "INCORPORATED"\nassert fullbuild["projectContinuity"]["latestOwnerDirective"]["state"] == "INCORPORATED"\nassert fullbuild["commandPaths"]["worldzLinks"] == "/worldzlinks"\nassert "WORLDZLINKZ_QR_ALL_DOMAIN_DIRECTORY" in fullbuild["projectContinuity"]["carriedForward"]\n
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
assert re.search(r'\["worldzfullbuild",\s*"Open the complete WorldzFullBuild', registry)\nassert '"worldzlinks"' in registry\nassert "worldzlinks" in websites\nassert "WORLDZFULLBUILD™ — MASTER BUILD" in command_centre
assert "/worldzfullbuild" in command_centre\nassert "/worldzlinks" in command_centre\nassert 'id="fullbuild"' in mini_html
assert 'id="fullbuild-home-card"' in mini_html
assert 'id="memory-storage"' in mini_html\nassert "PROJECT-WIDE INHERITANCE ACTIVE" in mini_html\nassert "https://cryptoworldz.xyz/worldzlinkz/" in mini_html\nassert "WorldzFullBuild™" in mini_js
assert 'data-open="fullbuild"' in mini_js
assert "WORLDZFULLBUILD™" in max_page
assert "WORLDZFULLSCOPE™" in max_page
assert "WorldzFullScope™ is part of the master build." in page\nassert "PROJECT-WIDE INHERITANCE ACTIVE" in page\nassert "https://cryptoworldz.xyz/worldzlinkz/" in page\nassert "POPULARITY ONLY" in page
assert "DAO GOVERNANCE ONLY" in page
assert "Part of WorldzFullBuild™" in scope_page
assert "https://launchpad.cryptoworldz.xyz/fullbuild/" in sitemap\nassert linkz["brand"] == "WorldzLinkz™"\nassert linkz["tagline"] == "Every Worldz. One Link."\nassert linkz["qrTarget"] == "https://cryptoworldz.xyz/worldzlinkz/"\nassert "Latest whole-project directive (2026-09-27)" in continuity\nassert "## Latest owner directive — 2026-09-27" in ledger\n
print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("fullscope=REQUIRED chains=8 token_slots=160 voting=SEPARATED project_inheritance=ACTIVE worldzlinkz=INHERITED mainnet_default=OFF")
