#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAD = ROOT / "impactbased.oneworldz.com"
CRYPTO = ROOT / "cryptoworldz.xyz"
TOTAL_SUPPLY = 100_000_000
BOOST_SEATS = 16
BOOST_EACH = 250_000
BOOST_PERCENT_EACH = 0.25
BOOST_TOTAL = BOOST_SEATS * BOOST_EACH
BOOST_PERCENT = BOOST_TOTAL / TOTAL_SUPPLY * 100
GUARANTEED_LEGEND_PERCENT = 5.0
MAX_CURRENT_NAMED_LEGEND_PERCENT = 14.0
MIN_PEOPLE_PERCENT = GUARANTEED_LEGEND_PERCENT + BOOST_PERCENT
MAX_CURRENT_PEOPLE_PERCENT = MAX_CURRENT_NAMED_LEGEND_PERCENT + BOOST_PERCENT
INITIAL_UNLOCK_PERCENT = 20.0
VESTING_MONTHS = 12

one_percent_names = [
  "Remedy", "Stepper", "Sxvage", "SolMussic", "Mahammad",
  "SolPaul", "SolMark", "Lungu Boy", "Loki", "SolDanHero", "SolPercent", "SolChez", "SolViv", "DTBWEB3SOLCAT"
]

policy = {
  "version": "2.0-wldz-legends-plus-boost",
  "token": {"name": "WORLDZ", "ticker": "WLDZ", "totalSupply": TOTAL_SUPPLY},
  "fixedSupplyRule": {"additionalMinting": False, "source": "dev_genesis_supply"},
  "legendPolicy": {
    "percentPerQualifiedLegend": 1.0,
    "tokensPerQualifiedLegend": 1_000_000,
    "guaranteedPercent": GUARANTEED_LEGEND_PERCENT,
    "maximumCurrentNamedPercentIfAllApprovedCandidatesActive": MAX_CURRENT_NAMED_LEGEND_PERCENT,
    "noSixPercentCap": True,
    "knownOnePercentNames": one_percent_names
  },
  "worldzBoost": {
    "name": "Worldz Boost",
    "seats": BOOST_SEATS,
    "tokensPerSeat": BOOST_EACH,
    "percentPerSeat": BOOST_PERCENT_EACH,
    "totalTokens": BOOST_TOTAL,
    "totalPercent": BOOST_PERCENT,
    "eligibleLabels": ["SUPPORTER", "SHILLER", "RAAIIIDDER", "INVESTOR", "ADVERTISER"],
    "excludeEveryOnePercentRecipient": True,
    "excludeSoleDeployer": True,
    "noDuplicateProfiles": True,
    "oneBoostSeatPerProfile": True,
    "selectionMode": "sixteen_highest_verified_activity_profiles_after_excluding_all_one_percent_legends",
    "purchaseAmountAloneDoesNotGuaranteeSelection": True
  },
  "peopleDistributionRange": {
    "minimumWithGuaranteedLegendsAndFullBoostPercent": MIN_PEOPLE_PERCENT,
    "maximumWithAllCurrentNamedActiveLegendsAndFullBoostPercent": MAX_CURRENT_PEOPLE_PERCENT,
    "reasonRangeVaries": "approved_1_percent_legend_candidates_are_activity_conditioned"
  },
  "activityRanking": {
    "sourceOfTruth": "Command Centre verified profile / mission / points / activity records",
    "weightsPercent": {
      "verifiedRaaiiiddMissionCompletions": 35,
      "legendPoints": 25,
      "verifiedPromotionContribution": 20,
      "activeDayConsistency": 10,
      "verifiedSupportInvestorAdvertiserContribution": 10
    },
    "manualUnverifiedLikesOrClaimsDoNotCount": True,
    "snapshotRequiredBeforeAllocation": True
  },
  "graceVesting": {
    "appliesTo": ["ONE_PERCENT_LEGEND", "WORLDZ_BOOST"],
    "initialUnlockPercent": INITIAL_UNLOCK_PERCENT,
    "remainingPercentLinearVesting": 80.0,
    "vestingMonths": VESTING_MONTHS,
    "lockedTokensReceiveSolHolderRewards": False,
    "vestedUnlockedTokensReceiveSolHolderRewards": True
  },
  "profileDisplay": {
    "enabled": True,
    "showAllocationPercent": True,
    "showLiveOnChainOwnershipPercent": True,
    "showLockedUnlockedRewardEligible": True,
    "showActivityRank": True,
    "showBoostLabels": True
  }
}

for target in [PAD / "worldzpad.people-policy.json", CRYPTO / "worldzpad" / "worldzpad.people-policy.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")

schema_path = CRYPTO / "worldzpad" / "team-profile.schema.json"
schema = json.loads(schema_path.read_text(encoding="utf-8"))
schema["properties"]["activityRank"] = {"type": ["integer", "null"], "minimum": 1}
schema["properties"]["worldzBoostLabels"] = {"type": "array", "items": {"enum": ["SUPPORTER", "SHILLER", "RAAIIIDDER", "INVESTOR", "ADVERTISER"]}, "uniqueItems": True}
schema_path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")

boost_dir = PAD / "worldz-boost"
boost_dir.mkdir(parents=True, exist_ok=True)
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WLDZ Worldz Boost | WorldzPad</title><meta name="description" content="Worldz Boost: sixteen 0.25% activity-ranked WLDZ incentives, separate from every 1% Legend allocation."><link rel="stylesheet" href="/worldzpad.css"></head><body data-oneworldz-build="2026-09-07-wldz-legends-boost-v2"><nav class="nav"><a href="/">WorldzPad</a><a href="/team-ownership/">WLDZ Legends</a><a class="brand" href="/worldz-boost/">Worldz Boost</a><a href="https://cryptoworldz.xyz/worldzpad/">ZED Bridge</a></nav><main class="shell"><section class="hero"><p class="eyebrow">Worldz Supporter Incentive</p><h1>4% <span>WORLDZ BOOST</span></h1><p class="lead">4,000,000 WLDZ reserved for sixteen additional active supporters. Each Boost = 250,000 WLDZ / 0.25%. Anyone receiving a 1% Legend allocation is excluded from this 4% pool.</p><div class="badges"><span class="badge live">16 × 0.25%</span><span class="badge">250,000 WLDZ EACH</span><span class="badge">1% LEGENDS EXCLUDED</span></div></section><section class="section"><div class="grid"><div class="card"><strong>Supporters</strong><p>Verified community support and consistency.</p></div><div class="card"><strong>Shillers / Raaiiidders</strong><p>Verified promotion and Raaiiidd missions.</p></div><div class="card"><strong>Investors / Advertisers</strong><p>Verified contribution can count, but spending alone never guarantees a Boost.</p></div></div></section><section class="section"><h2>Activity Ranking</h2><div class="good">35% Raaiiidd missions • 25% Legend Points • 20% verified promotion • 10% consistency • 10% verified supporter/investor/advertiser contribution.</div></section><section class="section"><h2>G.R.A.C.E.</h2><div class="good">Each Boost = 250,000 WLDZ. 20% initially unlocked; 80% vests over 12 months. Locked WLDZ does not receive SOL holder rewards until vested.</div></section></main><footer class="footer">WorldzPad™ • Worldz Boost • WLDZ</footer></body></html>'''
(boost_dir / "index.html").write_text(html, encoding="utf-8")

zed = CRYPTO / "worldzpad" / "index.html"
zed_text = zed.read_text(encoding="utf-8")
if "WORLDZ BOOST — 4%" not in zed_text:
    panel = '''<section class="section"><h2>WORLDZ BOOST — 4%</h2><div class="grid"><div class="card role grace"><strong>16 Boost Seats</strong><p>250,000 WLDZ / 0.25% each = exactly 4% total.</p></div><div class="card"><strong>No Double Allocation</strong><p>Every recipient of a 1% Legend grant is excluded from the Boost pool.</p></div><div class="card"><strong>Activity Ranked</strong><p>Supporter • Shiller • Raaiiidder • Investor • Advertiser contributions are scored through verified Command Centre activity.</p></div></div><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/worldz-boost/">Open Worldz Boost</a></div></section>'''
    zed_text = zed_text.replace("</main>", panel + "</main>", 1)
    zed.write_text(zed_text, encoding="utf-8")

console = PAD / "launch-console" / "index.html"
console_text = console.read_text(encoding="utf-8")
if "4% WORLDZ BOOST" not in console_text:
    panel = '''<section class="section"><h2>4% WORLDZ BOOST</h2><div class="good"><strong>16 × 0.25%</strong><br>4,000,000 WLDZ for sixteen additional activity-ranked supporters. All 1% Legend recipients are excluded. This remains separate from the expanding Legend pool.</div><div class="actions"><a class="btn" href="/worldz-boost/">Worldz Boost</a></div></section>'''
    console_text = console_text.replace("</main>", panel + "</main>", 1)
    console.write_text(console_text, encoding="utf-8")

assert BOOST_SEATS == 16
assert BOOST_EACH == 250_000
assert BOOST_TOTAL == 4_000_000
assert BOOST_PERCENT == 4.0
assert GUARANTEED_LEGEND_PERCENT == 5.0
assert MAX_CURRENT_NAMED_LEGEND_PERCENT == 14.0
assert MIN_PEOPLE_PERCENT == 9.0
assert MAX_CURRENT_PEOPLE_PERCENT == 18.0
assert policy["worldzBoost"]["excludeEveryOnePercentRecipient"] is True
assert policy["fixedSupplyRule"]["additionalMinting"] is False
print("WORLDZPAD_PEOPLE_DISTRIBUTION=PASS legend_guaranteed_pct=5 legend_max_named_pct=14 boost_pct=4 boost_seats=16 boost_each=250000 people_min_pct=9 people_max_current_pct=18 no_extra_mint=1")
