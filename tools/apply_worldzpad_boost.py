#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAD = ROOT / "impactbased.oneworldz.com"
CRYPTO = ROOT / "cryptoworldz.xyz"

TOTAL_SUPPLY = 100_000_000
CORE_TEAM_SEATS = 6
CORE_TEAM_EACH = 1_000_000
CORE_TEAM_PERCENT_EACH = 1.0
CORE_TEAM_TOTAL = CORE_TEAM_SEATS * CORE_TEAM_EACH
BOOST_SEATS = 16
BOOST_EACH = 250_000
BOOST_PERCENT_EACH = 0.25
BOOST_TOTAL = BOOST_SEATS * BOOST_EACH
PEOPLE_TOTAL = CORE_TEAM_TOTAL + BOOST_TOTAL
PEOPLE_PERCENT = PEOPLE_TOTAL / TOTAL_SUPPLY * 100
INITIAL_UNLOCK_PERCENT = 20.0
VESTING_MONTHS = 12

policy = {
  "version": "1.0-wldz-10pct-people",
  "token": {"name": "WORLDZ", "ticker": "WLDZ", "totalSupply": TOTAL_SUPPLY},
  "fixedSupplyRule": {
    "additionalMintingForPeopleAllocation": False,
    "source": "dev_genesis_supply",
    "peopleAllocationTokens": PEOPLE_TOTAL,
    "peopleAllocationPercent": PEOPLE_PERCENT
  },
  "coreTeam": {
    "seats": CORE_TEAM_SEATS,
    "tokensPerSeat": CORE_TEAM_EACH,
    "percentPerSeat": CORE_TEAM_PERCENT_EACH,
    "totalTokens": CORE_TEAM_TOTAL,
    "totalPercent": 6.0,
    "selectionMode": "top_six_verified_active_team_profiles_at_allocation_snapshot",
    "soleDeployerExcluded": True,
    "noDuplicateProfiles": True,
    "historicallyEvidencedPriorityCandidates": ["Stepper", "Remediy", "Solmusic"],
    "remainingSeats": "rank_from_verified_command_centre_activity",
    "selectionMustUseVerifiedActivityData": True
  },
  "worldzBoost": {
    "name": "Worldz Boost",
    "seats": BOOST_SEATS,
    "tokensPerSeat": BOOST_EACH,
    "percentPerSeat": BOOST_PERCENT_EACH,
    "totalTokens": BOOST_TOTAL,
    "totalPercent": 4.0,
    "eligibleLabels": ["SUPPORTER", "SHILLER", "RAAIIIDDER", "INVESTOR", "ADVERTISER"],
    "excludeCoreTeamSix": True,
    "excludeSoleDeployer": True,
    "noDuplicateProfiles": True,
    "oneBoostSeatPerProfile": True,
    "selectionMode": "next_sixteen_highest_verified_worldz_activity_scores_after_core_team",
    "purchaseAmountAloneDoesNotGuaranteeSelection": True
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
    "tieBreakOrder": [
      "verifiedRaaiiiddMissionCompletions_desc",
      "legendPoints_desc",
      "activeDayConsistency_desc",
      "profileId_asc"
    ],
    "manualUnverifiedLikesOrClaimsDoNotCount": True,
    "snapshotRequiredBeforeAllocation": True
  },
  "graceVesting": {
    "appliesTo": ["CORE_TEAM", "WORLDZ_BOOST"],
    "initialUnlockPercent": INITIAL_UNLOCK_PERCENT,
    "remainingPercentLinearVesting": 80.0,
    "vestingMonths": VESTING_MONTHS,
    "lockedTokensReceiveSolHolderRewards": False,
    "vestedUnlockedTokensReceiveSolHolderRewards": True
  },
  "profileDisplay": {
    "enabled": True,
    "roles": ["DEV", "TEAM", "BOOST"],
    "showAllocationTokens": True,
    "showAllocationPercent": True,
    "showLiveOnChainOwnershipPercent": True,
    "showLockedUnlockedRewardEligible": True,
    "showActivityRank": True,
    "showBoostLabels": True
  }
}

for target in [
    PAD / "worldzpad.people-policy.json",
    CRYPTO / "worldzpad" / "worldzpad.people-policy.json",
]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")

# Extend the team profile schema generated immediately before this script.
schema_path = CRYPTO / "worldzpad" / "team-profile.schema.json"
schema = json.loads(schema_path.read_text(encoding="utf-8"))
role_enum = schema["properties"]["role"]["enum"]
if "BOOST" not in role_enum:
    role_enum.append("BOOST")
schema["properties"]["activityRank"] = {"type": ["integer", "null"], "minimum": 1}
schema["properties"]["worldzBoostLabels"] = {
    "type": "array",
    "items": {"enum": ["SUPPORTER", "SHILLER", "RAAIIIDDER", "INVESTOR", "ADVERTISER"]},
    "uniqueItems": True
}
schema_path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")

# Public 10% people-distribution surface.
boost_dir = PAD / "worldz-boost"
boost_dir.mkdir(parents=True, exist_ok=True)
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WLDZ Worldz Boost | WorldzPad</title><meta name="description" content="WorldzPad WLDZ 10% people distribution: six core team seats plus sixteen activity-ranked Worldz Boost seats."><link rel="stylesheet" href="/worldzpad.css"></head><body data-oneworldz-build="2026-09-07-wldz-10pct-people"><nav class="nav"><a href="/">WorldzPad</a><a href="/team-ownership/">Team Ownership</a><a class="brand" href="/worldz-boost/">Worldz Boost</a><a href="https://cryptoworldz.xyz/worldzpad/">ZED Bridge</a></nav><main class="shell"><section class="hero"><p class="eyebrow">G.R.A.C.E. People Distribution</p><h1>10% <span>TO THE PEOPLE</span></h1><p class="lead">10,000,000 WLDZ from the fixed 100M genesis supply: 6% for six core active team profiles and 4% for sixteen additional active Worldz Supporters, Shillers, Raaiiidders, Investors and Advertisers.</p><div class="badges"><span class="badge live">6 × 1% CORE TEAM</span><span class="badge live">16 × 0.25% WORLDZ BOOST</span><span class="badge">NO EXTRA MINTING</span></div></section><section class="section"><div class="grid two"><div class="card"><strong>Core Team</strong><div class="kpi">6%</div><p>Six seats • 1,000,000 WLDZ each • 1% ownership allocation each.</p><p>Top six verified active team profiles at the allocation snapshot. Sole deployer excluded.</p></div><div class="card"><strong>Worldz Boost</strong><div class="kpi">4%</div><p>Sixteen seats • 250,000 WLDZ each • 0.25% ownership allocation each.</p><p>The core six cannot receive a Boost seat. Selection starts with the next highest verified activity score.</p></div></div></section><section class="section"><h2>Activity Ranking</h2><div class="grid"><div class="card"><strong>35%</strong><p>Verified Raaiiidd mission completions</p></div><div class="card"><strong>25%</strong><p>Legend Points</p></div><div class="card"><strong>20%</strong><p>Verified promotion contribution</p></div><div class="card"><strong>10%</strong><p>Active-day consistency</p></div><div class="card"><strong>10%</strong><p>Verified supporter / investor / advertiser contribution</p></div></div><p class="warning">Buying WLDZ or spending money alone does not guarantee a Boost. The award is activity-ranked and requires a verified Command Centre profile.</p></section><section class="section"><h2>G.R.A.C.E. Protection</h2><div class="good">Allocation is visible on the profile immediately. 20% is initially unlocked; 80% vests linearly across 12 months. Locked allocations do not receive SOL holder rewards until vested and unlocked.</div></section></main><footer class="footer">WorldzPad™ • Worldz Boost • WLDZ</footer></body></html>'''
(boost_dir / "index.html").write_text(html, encoding="utf-8")

# Add summaries to ZED bridge and Launch Console.
for path, marker, panel in [
  (
    CRYPTO / "worldzpad" / "index.html",
    "WLDZ 10% PEOPLE DISTRIBUTION",
    '''<section class="section"><h2>WLDZ 10% PEOPLE DISTRIBUTION</h2><div class="grid"><div class="card"><strong>Core Six</strong><p>6 × 1,000,000 WLDZ = 6%. Ranked from verified active team profiles; sole deployer excluded.</p></div><div class="card role grace"><strong>Worldz Boost</strong><p>16 × 250,000 WLDZ = 4%. Next sixteen verified active profiles after excluding the core six.</p></div><div class="card"><strong>Profiles</strong><p>TEAM/BOOST allocation %, live ownership %, locked/unlocked WLDZ, reward eligibility and activity rank are visible.</p></div></div><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/worldz-boost/">Open Worldz Boost</a></div></section>'''
  ),
  (
    PAD / "launch-console" / "index.html",
    "10% PEOPLE DISTRIBUTION",
    '''<section class="section"><h2>10% PEOPLE DISTRIBUTION</h2><div class="good"><strong>6% CORE + 4% BOOST</strong><br>Six core active team seats receive 1% each. Sixteen additional activity-ranked Worldz profiles receive 0.25% each. No duplicate recipients. All allocations come from the existing 100M genesis supply.</div><div class="actions"><a class="btn" href="/worldz-boost/">Worldz Boost Policy</a></div></section>'''
  )
]:
    text = path.read_text(encoding="utf-8")
    if marker not in text:
        text = text.replace("</main>", panel + "</main>", 1)
        path.write_text(text, encoding="utf-8")

assert CORE_TEAM_SEATS == 6
assert CORE_TEAM_EACH == 1_000_000
assert CORE_TEAM_TOTAL == 6_000_000
assert BOOST_SEATS == 16
assert BOOST_EACH == 250_000
assert BOOST_TOTAL == 4_000_000
assert PEOPLE_TOTAL == 10_000_000
assert PEOPLE_PERCENT == 10.0
assert BOOST_PERCENT_EACH == 0.25
assert sum(policy["activityRanking"]["weightsPercent"].values()) == 100
assert policy["worldzBoost"]["excludeCoreTeamSix"] is True
assert policy["fixedSupplyRule"]["additionalMintingForPeopleAllocation"] is False
print("WORLDZPAD_PEOPLE_DISTRIBUTION=PASS core_seats=6 core_each=1000000 boost_seats=16 boost_each=250000 people_total=10000000 people_percent=10 no_extra_mint=1")
