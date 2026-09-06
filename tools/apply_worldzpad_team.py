#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAD = ROOT / "impactbased.oneworldz.com"
CRYPTO = ROOT / "cryptoworldz.xyz"
TOTAL_SUPPLY = 100_000_000
ONE_PERCENT_TOKENS = 1_000_000
INITIAL_UNLOCK_PERCENT = 20.0
VESTING_MONTHS = 12

leadership = [
  {"rank": 1, "name": "JayJayTeamDev", "role": "SOLE_DEPLOYER", "legendGrantPercent": 0.0, "multisigSigner": True},
  {"rank": 2, "name": "Remedy", "aliases": ["Remediy"], "role": "MULTISIG_CORE", "legendGrantPercent": 1.0, "multisigSigner": True, "guaranteed": True},
  {"rank": 3, "name": "Stepper", "role": "MULTISIG_CORE", "legendGrantPercent": 1.0, "multisigSigner": True, "guaranteed": True},
  {"rank": 4, "name": "Sxvage", "aliases": ["Savage"], "role": "EXECUTIVE_LEADER", "legendGrantPercent": 1.0, "multisigSigner": False, "guaranteed": True, "importance": "executive_core_cryptoworldz"},
  {"rank": 5, "name": "SolMussic", "aliases": ["Solmusic"], "role": "CORE_LEGEND", "legendGrantPercent": 1.0, "multisigSigner": False, "guaranteed": True},
  {"rank": 6, "name": "Mahammad", "role": "CORE_LEGEND", "legendGrantPercent": 1.0, "multisigSigner": False, "guaranteed": True},
]

active_legend_candidates = [
  {"name": "SolPaul", "allocationPercentIfActive": 1.0},
  {"name": "SolMark", "handles": ["@MARKW30"], "allocationPercentIfActive": 1.0},
  {"name": "Lungu Boy", "handles": ["@KLAUS606"], "allocationPercentIfActive": 1.0},
  {"name": "Loki", "handles": ["@LOKII23456"], "allocationPercentIfActive": 1.0},
  {"name": "SolDanHero", "allocationPercentIfActive": 1.0},
  {"name": "SolPercent", "allocationPercentIfActive": 1.0},
  {"name": "SolChez", "allocationPercentIfActive": 1.0},
  {"name": "SolViv", "allocationPercentIfActive": 1.0},
  {"name": "DTBWEB3SOLCAT", "aliases": ["SolDBTCAT"], "allocationPercentIfActive": 1.0},
]

GUARANTEED_LEGEND_COUNT = sum(1 for x in leadership if x.get("guaranteed"))
GUARANTEED_LEGEND_TOKENS = GUARANTEED_LEGEND_COUNT * ONE_PERCENT_TOKENS
MAX_ACTIVE_LEGEND_TOKENS = len(active_legend_candidates) * ONE_PERCENT_TOKENS
MAX_LEGEND_TOKENS = GUARANTEED_LEGEND_TOKENS + MAX_ACTIVE_LEGEND_TOKENS

policy = {
  "version": "2.0-wldz-legends",
  "token": {"name": "WORLDZ", "ticker": "WLDZ", "totalSupply": TOTAL_SUPPLY},
  "leadershipOrder": leadership,
  "multisig": {
    "signers": ["JayJayTeamDev", "Remedy", "Stepper"],
    "sxvageIsExecutiveLeaderButNotMultisigSigner": True
  },
  "onePercentLegendAllocation": {
    "tokensPerRecipient": ONE_PERCENT_TOKENS,
    "percentPerRecipient": 1.0,
    "guaranteedRecipients": [x["name"] for x in leadership if x.get("guaranteed")],
    "guaranteedTokens": GUARANTEED_LEGEND_TOKENS,
    "guaranteedPercent": GUARANTEED_LEGEND_TOKENS / TOTAL_SUPPLY * 100,
    "activeCandidates": active_legend_candidates,
    "activityRequiredForCandidates": True,
    "noSixPercentCap": True,
    "maximumCurrentNamedLegendTokensIfAllActive": MAX_LEGEND_TOKENS,
    "maximumCurrentNamedLegendPercentIfAllActive": MAX_LEGEND_TOKENS / TOTAL_SUPPLY * 100,
    "source": "dev_genesis_supply",
    "additionalMinting": False
  },
  "graceVesting": {
    "initialUnlockPercentOfGrant": INITIAL_UNLOCK_PERCENT,
    "remainingPercentLinearVesting": 80.0,
    "vestingMonths": VESTING_MONTHS,
    "lockedTokensReceiveSolHolderRewards": False,
    "vestedUnlockedTokensReceiveSolHolderRewards": True
  },
  "profileOwnership": {
    "enabled": True,
    "sourceOfTruth": "verified_on_chain_wallet_and_grace_allocation_state",
    "liveOwnershipFormula": "currentVerifiedWalletWldz / 100000000 * 100",
    "showLeadershipRank": True,
    "showRole": True,
    "showMultisigStatus": True,
    "showAllocationPercent": True,
    "showCurrentOwnershipPercent": True,
    "showLockedUnlockedRewardEligible": True
  }
}

for target in [PAD / "worldzpad.team-policy.json", CRYPTO / "worldzpad" / "worldzpad.team-policy.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")

profile_schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WorldzPad Command Centre WLDZ Ownership Profile",
  "type": "object",
  "required": ["profileId", "role", "wallet", "wldz"],
  "properties": {
    "profileId": {"type": "string"},
    "role": {"enum": ["DEV", "MULTISIG_CORE", "EXECUTIVE_LEADER", "CORE_LEGEND", "LEGEND", "BOOST"]},
    "leadershipRank": {"type": ["integer", "null"], "minimum": 1},
    "multisigSigner": {"type": "boolean"},
    "wallet": {"type": "string"},
    "wldz": {"type": "object", "required": ["allocatedTokens", "allocationPercent", "currentBalance", "currentOwnershipPercent", "unlockedTokens", "lockedTokens", "rewardEligibleTokens"], "properties": {
      "allocatedTokens": {"type": "number", "minimum": 0},
      "allocationPercent": {"type": "number", "minimum": 0, "maximum": 100},
      "currentBalance": {"type": "number", "minimum": 0},
      "currentOwnershipPercent": {"type": "number", "minimum": 0, "maximum": 100},
      "unlockedTokens": {"type": "number", "minimum": 0},
      "lockedTokens": {"type": "number", "minimum": 0},
      "rewardEligibleTokens": {"type": "number", "minimum": 0}
    }}
  }
}
(CRYPTO / "worldzpad" / "team-profile.schema.json").write_text(json.dumps(profile_schema, indent=2) + "\n", encoding="utf-8")

team_dir = PAD / "team-ownership"
team_dir.mkdir(parents=True, exist_ok=True)
rows = ''.join(f'<div class="route"><span>#{x["rank"]} {x["name"]} — {x["role"].replace("_", " ")}</span><b>{"DEV" if x["rank"] == 1 else "1% • 1,000,000 WLDZ"}</b></div>' for x in leadership)
candidates = ''.join(f'<div class="route"><span>{x["name"]}</span><b>1% IF ACTIVE</b></div>' for x in active_legend_candidates)
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WLDZ Legends | WorldzPad</title><meta name="description" content="WLDZ leadership, Legend allocations and G.R.A.C.E. ownership transparency."><link rel="stylesheet" href="/worldzpad.css"></head><body data-oneworldz-build="2026-09-07-wldz-legends-v2"><nav class="nav"><a href="/">WorldzPad</a><a href="/launch-console/">Launch Console</a><a class="brand" href="/team-ownership/">WLDZ Legends</a><a href="/worldz-boost/">Worldz Boost</a></nav><main class="shell"><section class="hero"><p class="eyebrow">CryptoWorldz Leadership + G.R.A.C.E.</p><h1>WLDZ <span>LEGENDS</span></h1><p class="lead">The six-seat cap is removed. Named core Legends receive 1% each, and the approved Legend candidates receive 1% each when active. JayJayTeamDev remains the sole deployer and is outside the Legend grant pool.</p><div class="badges"><span class="badge live">1% = 1,000,000 WLDZ</span><span class="badge">100M FIXED SUPPLY</span><span class="badge">NO EXTRA MINTING</span></div></section><section class="section"><h2>Leadership Order</h2><div class="card">{rows}</div><p class="good">Multisig remains exactly JayJayTeamDev + Remedy + Stepper. Sxvage/Savage is Executive Leader at #4 and receives 1%, but is not a multisig signer.</p></section><section class="section"><h2>1% If Active — Approved Legends</h2><div class="card">{candidates}</div><p>Activity is verified from Command Centre records before the grant is activated.</p></section><section class="section"><h2>G.R.A.C.E.</h2><div class="good">Each 1% grant = 1,000,000 WLDZ. 20% initially unlocked; 80% linear vesting over 12 months. Locked WLDZ does not receive SOL rewards until vested.</div></section></main><footer class="footer">WorldzPad™ • WLDZ Legends • CryptoWorldz</footer></body></html>'''
(team_dir / "index.html").write_text(html, encoding="utf-8")

zed = CRYPTO / "worldzpad" / "index.html"
zed_text = zed.read_text(encoding="utf-8")
marker = "WLDZ LEGEND HIERARCHY"
panel = '''<section class="section"><h2>WLDZ LEGEND HIERARCHY</h2><div class="grid"><div class="card"><strong>#1–#4 Leadership</strong><p>#1 JayJayTeamDev • #2 Remedy • #3 Stepper • #4 Sxvage/Savage (Executive Leader). Multisig remains JayJay + Remedy + Stepper only.</p></div><div class="card role grace"><strong>Guaranteed 1%</strong><p>Remedy • Stepper • Sxvage • SolMussic • Mahammad = 1,000,000 WLDZ each.</p></div><div class="card"><strong>Approved 1% If Active</strong><p>SolPaul • SolMark • Lungu Boy • Loki • SolDanHero • SolPercent • SolChez • SolViv • DTBWEB3SOLCAT.</p></div></div><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/team-ownership/">Open WLDZ Legends</a></div></section>'''
if marker not in zed_text:
    zed_text = zed_text.replace("</main>", panel + "</main>", 1)
    zed.write_text(zed_text, encoding="utf-8")

console = PAD / "launch-console" / "index.html"
console_text = console.read_text(encoding="utf-8")
if "LEGEND 1% POLICY" not in console_text:
    panel = '''<section class="section"><h2>LEGEND 1% POLICY</h2><div class="good"><strong>NO 6% CAP</strong><br>Guaranteed: Remedy, Stepper, Sxvage, SolMussic and Mahammad receive 1% each. Approved active Legends can each receive another 1%. All grants come from the fixed 100M genesis supply.</div><div class="actions"><a class="btn" href="/team-ownership/">WLDZ Legends</a></div></section>'''
    console_text = console_text.replace("</main>", panel + "</main>", 1)
    console.write_text(console_text, encoding="utf-8")

assert TOTAL_SUPPLY == 100_000_000
assert GUARANTEED_LEGEND_COUNT == 5
assert GUARANTEED_LEGEND_TOKENS == 5_000_000
assert len(active_legend_candidates) == 9
assert MAX_LEGEND_TOKENS == 14_000_000
assert leadership[3]["name"] == "Sxvage" and leadership[3]["rank"] == 4
assert leadership[3]["role"] == "EXECUTIVE_LEADER" and leadership[3]["multisigSigner"] is False
assert policy["multisig"]["signers"] == ["JayJayTeamDev", "Remedy", "Stepper"]
assert policy["onePercentLegendAllocation"]["noSixPercentCap"] is True
print("WORLDZPAD_LEGENDS=PASS guaranteed=5 guaranteed_pct=5 active_candidates=9 max_legend_pct=14 sxvage_rank=4 sxvage_exec=1 multisig=JayJay+Remedy+Stepper no_6pct_cap=1")
