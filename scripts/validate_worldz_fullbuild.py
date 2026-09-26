from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

fullbuild = json.loads((ROOT / "worldzpad-omnichain/fullbuild/worldz-fullbuild.v1.json").read_text())
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

assert fullbuild["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullbuild["brand"] == "WorldzFullBuild™"
assert fullbuild["leader"] == "ZED LED Command Centre MAX™"
assert fullbuild["status"] == "INTEGRATED_FOUNDATION"

required = {
    "command-centre","launchpad","omnichain","fullscope","proof",
    "auto","grace","recap","legacy-flywheel","treasury"
}
subsystems = {item["key"]: item for item in fullbuild["requiredSubsystems"]}
assert required.issubset(subsystems)
assert subsystems["fullscope"]["required"] is True

scope = fullbuild["fullScope"]
assert scope["required"] is True
assert scope["chainCount"] == 8
assert scope["maxTokensPerChain"] == 20
assert scope["initialTokenEnvironmentCapacity"] == 160
assert scope["sourceContract"] == "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json"

required_modules = {
    "WorldzWatch™","WorldzTrade™","WorldzInvest™","WorldzLock™","WorldzVest™",
    "WorldzAlert™","WorldzAuto™","WorldzProof™","Worldz Votes Centre™","WorldzGovern™"
}
assert required_modules.issubset(set(scope["requiredModules"]))

assert fullscope["parentBuild"]["brand"] == "WorldzFullBuild™"
assert fullscope["parentBuild"]["schema"] == "WORLDZ-FULLBUILD-V1"
assert fullscope["parentBuild"]["required"] is True
assert fullscope["maxTokensPerChain"] == 20
assert len(fullscope["chains"]) == 8

pop = fullbuild["votingSeparation"]["popularity"]
gov = fullbuild["votingSeparation"]["governance"]
assert pop["brand"] == "Worldz Votes Centre™"
assert pop["governanceAuthority"] is False
assert gov["brand"] == "WorldzGovern™"
assert gov["popularityRankingEffect"] is False

execution = fullbuild["executionPolicy"]
assert execution["defaultMainnetExecution"] is False
assert execution["externalWalletSignatureRequired"] is True
assert execution["privateKeysInTelegramDatabase"] is False
assert execution["autoBroadcastByDefault"] is False
assert execution["perChainReleaseGate"] is True
assert execution["worldzProofRequired"] is True
assert execution["explicitOwnerReleaseRequired"] is True

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

assert "WORLDZFULLBUILD™" in page.upper()
assert "WorldzFullScope™ is now part of the master build." in page
assert "POPULARITY ONLY" in page
assert "DAO GOVERNANCE ONLY" in page
assert "Part of WorldzFullBuild™" in scope_page
assert "https://launchpad.cryptoworldz.xyz/fullbuild/" in sitemap
assert "WorldzFullScope™ is now a **mandatory FullBuild subsystem**." in doc

print("WORLDZ_FULLBUILD_VALIDATION=PASS")
print("master=WorldzFullBuild fullscope=REQUIRED chains=8 token_slots=160 voting=SEPARATED mainnet_default=OFF")
