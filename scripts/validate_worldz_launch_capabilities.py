#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
matrix=json.loads((ROOT/"worldzpad-mainnet/worldz-launch-capability-matrix.v1.json").read_text())
platform=json.loads((ROOT/"launchpad.cryptoworldz.xyz/platform-config.json").read_text())
page=(ROOT/"launchpad.cryptoworldz.xyz/capabilities/index.html").read_text()

assert matrix["schema"]=="WORLDZ-LAUNCH-CAPABILITY-MATRIX-V1"
assert len(matrix["chains"])==8
assert {c["key"] for c in matrix["chains"]}=={"solana","xrpl","base","ethereum","bnb","sui","hyperevm","robinhood"}
assert platform["publicMainnetTokenMintingEnabled"] is True
assert platform["publicMainnetCreatorLaunchesEnabled"] is False

for row in matrix["chains"]:
    domain=(ROOT/row["domain"]/ "index.html")
    assert domain.is_file(), row["domain"]
    text=domain.read_text()
    assert "WorldzLaunchPad" in text, row["domain"]
    assert row["tokenCreation"]["path"] in text, f"{row['key']} token-creation route is not linked from its Worldz domain"
    if row["key"]!="solana":
        assert row["tokenCreation"]["mainnet"] is False, row["key"]
        assert row["marketLaunch"]["mainnet"] is False, row["key"]
        assert "Public mainnet creator launch" in text or "public mainnet creator launch" in text, f"{row['key']} missing explicit mainnet status"
        assert ">Off<" in text or "remain locked" in text or "mainnet stays locked" in text.lower(), f"{row['key']} domain may overstate mainnet capability"

sol=next(c for c in matrix["chains"] if c["key"]=="solana")
assert sol["tokenCreation"]["mainnet"] is True
assert sol["marketLaunch"]["mainnet"] is False
solpage=(ROOT/"solworldz.xyz/index.html").read_text()
assert "WorldzMINT™ LIVE" in solpage
assert "Worldz market-launch mainnet" in solpage

for expected in ("Worldz Token Identity Engine™","Worldz Proof Receipt™","WorldzFullScope™","Worldz Votes Centre™","WorldzGovern™","Worldz Omnichain™","WorldDexPush™","BitWorldz OmniBTC™"):
    assert any(m["name"]==expected for m in matrix["platformModules"]), expected

assert "Solana Mainnet token creation is live" in page
assert "MAINNET MARKET LAUNCH: GATED" in page
print("WORLDZ_LAUNCH_CAPABILITY_MATRIX=PASS")
print("chains=8 solana_mainnet_token_mint=LIVE public_mainnet_market_launch=GATED")
