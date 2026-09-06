#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PAD = ROOT / "impactbased.oneworldz.com"
CRYPTO = ROOT / "cryptoworldz.xyz"
TOTAL_SUPPLY = 100_000_000
TEAM_POOL = 6_000_000
TEAM_POOL_PERCENT = 6.0
INITIAL_UNLOCK_PERCENT = 20.0
VESTING_MONTHS = 12

policy = {
  "version": "1.0-wldz-team-ownership",
  "token": {"name": "WORLDZ", "ticker": "WLDZ", "totalSupply": TOTAL_SUPPLY},
  "teamPool": {
    "tokens": TEAM_POOL,
    "percentOfTotalSupply": TEAM_POOL_PERCENT,
    "split": "equal_between_active_team_profiles_excluding_sole_deployer",
    "memberCount": "resolve_at_allocation_time",
    "formula": "teamPoolTokens / activeEligibleTeamMemberCount",
    "remainderPolicy": "retain_rounding_remainder_in_team_pool_vault"
  },
  "graceVesting": {
    "initialUnlockPercentOfMemberGrant": INITIAL_UNLOCK_PERCENT,
    "remainingPercentLinearVesting": 100.0 - INITIAL_UNLOCK_PERCENT,
    "vestingMonths": VESTING_MONTHS,
    "lockedTokensReceiveSolHolderRewards": False,
    "vestedUnlockedTokensReceiveSolHolderRewards": True
  },
  "profileOwnership": {
    "enabled": True,
    "sourceOfTruth": "verified_on_chain_wallet_and_grace_allocation_state",
    "displayFields": [
      "wldzAllocatedTokens",
      "wldzAllocationPercentOfTotalSupply",
      "wldzCurrentWalletBalance",
      "wldzCurrentOwnershipPercentOfTotalSupply",
      "wldzUnlockedTokens",
      "wldzLockedVestingTokens",
      "wldzRewardEligibleTokens"
    ],
    "liveOwnershipFormula": "currentVerifiedWalletWldz / 100000000 * 100",
    "allocationPercentFormula": "memberGrantWldz / 100000000 * 100",
    "showTeamOrDevRole": True,
    "showVestingStatus": True
  },
  "operator": {
    "soleDeployer": "JayJayTeamDev",
    "deployerExcludedFromEqualTeamPool": True,
    "deployerProfileShowsLiveWldzOwnership": True
  },
  "promotion": {
    "communityPromotionEncouraged": True,
    "promotionIsNotGuaranteedCompensationForPricePerformance": True,
    "noGuaranteedReturnsOrPriceClaims": True,
    "teamHoldingAndVestingDisclosureEnabled": True
  }
}

# Publish machine-readable policy to both WorldzPad and the ZED bridge.
for target in [
    PAD / "worldzpad.team-policy.json",
    CRYPTO / "worldzpad" / "worldzpad.team-policy.json",
]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")

profile_schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WorldzPad Command Centre WLDZ Ownership Profile",
  "type": "object",
  "required": ["profileId", "role", "wallet", "wldz"],
  "properties": {
    "profileId": {"type": "string"},
    "role": {"enum": ["DEV", "TEAM"]},
    "wallet": {"type": "string"},
    "wldz": {
      "type": "object",
      "required": ["allocatedTokens", "allocationPercent", "currentBalance", "currentOwnershipPercent", "unlockedTokens", "lockedTokens", "rewardEligibleTokens"],
      "properties": {
        "allocatedTokens": {"type": "number", "minimum": 0},
        "allocationPercent": {"type": "number", "minimum": 0, "maximum": 100},
        "currentBalance": {"type": "number", "minimum": 0},
        "currentOwnershipPercent": {"type": "number", "minimum": 0, "maximum": 100},
        "unlockedTokens": {"type": "number", "minimum": 0},
        "lockedTokens": {"type": "number", "minimum": 0},
        "rewardEligibleTokens": {"type": "number", "minimum": 0}
      }
    }
  }
}
(CRYPTO / "worldzpad" / "team-profile.schema.json").write_text(json.dumps(profile_schema, indent=2) + "\n", encoding="utf-8")

# Public team allocation calculator / transparency surface.
team_dir = PAD / "team-ownership"
team_dir.mkdir(parents=True, exist_ok=True)
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WLDZ Team Ownership | WorldzPad</title><meta name="description" content="WorldzPad WLDZ team ownership, equal-split and G.R.A.C.E. vesting policy."><link rel="stylesheet" href="/worldzpad.css"></head><body data-oneworldz-build="2026-09-07-wldz-team-v1"><nav class="nav"><a href="/">WorldzPad</a><a href="/launch-console/">Launch Console</a><a class="brand" href="/team-ownership/">Team Ownership</a><a href="https://cryptoworldz.xyz/worldzpad/">ZED Bridge</a></nav><main class="shell"><section class="hero"><p class="eyebrow">G.R.A.C.E. Team System</p><h1>WLDZ <span>OWNERSHIP</span></h1><p class="lead">6,000,000 WLDZ (6% of total supply) reserved for the active WorldzPad team, split equally between eligible team profiles. The sole deployer is excluded from this equal team pool.</p><div class="badges"><span class="badge live">● 6% TEAM POOL</span><span class="badge">100M TOTAL SUPPLY</span><span class="badge">ON-CHAIN PROFILE %</span></div></section><section class="section"><div class="grid two"><div class="card"><strong>Equal Split Calculator</strong><label for="members">Eligible team members</label><input id="members" type="number" min="1" max="50" step="1" value="3"><div class="route"><span>Each member receives</span><b id="tokens">2,000,000 WLDZ</b></div><div class="route"><span>Each allocation</span><b id="percent">2.0000%</b></div><div class="route"><span>Initial unlocked (20%)</span><b id="unlocked">400,000 WLDZ</b></div><div class="route"><span>G.R.A.C.E. vested (80%)</span><b id="locked">1,600,000 WLDZ</b></div></div><div class="card"><strong>Profile Ownership</strong><p>Every DEV/TEAM profile can show allocated WLDZ, allocation %, current verified wallet balance, current ownership %, unlocked balance, locked/vesting balance and reward-eligible balance.</p><p class="good">If a team member sells or transfers WLDZ, their live ownership percentage changes from the verified on-chain balance. It is not a manually typed badge.</p><p>Locked team tokens do not receive SOL holder rewards. As tokens vest and unlock, they become reward eligible like other eligible WLDZ holdings.</p></div></div></section><section class="section"><h2>Why 6%?</h2><div class="grid"><div class="card"><strong>Meaningful</strong><p>A real ownership stake for contributors without handing over a huge insider allocation.</p></div><div class="card"><strong>Equal</strong><p>No favourites: the pool is divided by the number of eligible active team profiles at allocation time.</p></div><div class="card"><strong>Transparent</strong><p>Team role, allocation and vesting are visible so promotion cannot hide insider ownership.</p></div></div></section></main><footer class="footer">WorldzPad™ • G.R.A.C.E. Team Ownership • WLDZ</footer><script>const total=100000000,pool=6000000;const m=document.getElementById('members');function f(n){return new Intl.NumberFormat('en-AU',{maximumFractionDigits:9}).format(n)}function calc(){const c=Math.max(1,Number(m.value)||1),each=pool/c,pct=each/total*100;document.getElementById('tokens').textContent=f(each)+' WLDZ';document.getElementById('percent').textContent=pct.toFixed(4)+'%';document.getElementById('unlocked').textContent=f(each*.2)+' WLDZ';document.getElementById('locked').textContent=f(each*.8)+' WLDZ'}m.addEventListener('input',calc);calc();</script></body></html>'''
(team_dir / "index.html").write_text(html, encoding="utf-8")

# Add team ownership to the ZED public bridge after the Flash Direct generator has run.
zed = CRYPTO / "worldzpad" / "index.html"
zed_text = zed.read_text(encoding="utf-8")
if "WLDZ TEAM OWNERSHIP" not in zed_text:
    panel = '''<section class="section"><h2>WLDZ TEAM OWNERSHIP</h2><div class="grid"><div class="card role grace"><strong>G.R.A.C.E. Team Pool</strong><p>6,000,000 WLDZ • 6% total supply • equal split across eligible active team profiles excluding the sole deployer.</p></div><div class="card"><strong>Profile %</strong><p>DEV and TEAM profiles show verified WLDZ allocation %, live wallet ownership %, locked/unlocked balances and reward-eligible WLDZ.</p></div><div class="card"><strong>Vesting</strong><p>20% initial unlock • remaining 80% linear over 12 months • locked tokens excluded from SOL holder rewards until vested.</p></div></div><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/team-ownership/">Open Team Ownership</a></div></section>'''
    zed_text = zed_text.replace("</main>", panel + "</main>", 1)
    zed.write_text(zed_text, encoding="utf-8")

# Add the same operating summary to the launch console.
console = PAD / "launch-console" / "index.html"
console_text = console.read_text(encoding="utf-8")
if "6% TEAM POOL" not in console_text:
    panel = '''<section class="section"><h2>G.R.A.C.E. Team Ownership</h2><div class="good"><strong>6% TEAM POOL</strong><br>6,000,000 WLDZ split equally across eligible active team profiles (sole deployer excluded). Profiles display live WLDZ ownership percentage from verified on-chain balances. 20% initial unlock; 80% vests over 12 months; locked WLDZ is not SOL-reward eligible until vested.</div><div class="actions"><a class="btn" href="/team-ownership/">Team Ownership Calculator</a></div></section>'''
    console_text = console_text.replace("</main>", panel + "</main>", 1)
    console.write_text(console_text, encoding="utf-8")

# Build-time invariants: fail loudly if tokenomics drift.
assert TOTAL_SUPPLY == 100_000_000
assert TEAM_POOL == 6_000_000
assert TEAM_POOL_PERCENT == 6.0
assert TEAM_POOL / TOTAL_SUPPLY * 100 == TEAM_POOL_PERCENT
assert INITIAL_UNLOCK_PERCENT == 20.0
assert VESTING_MONTHS == 12
assert policy["graceVesting"]["lockedTokensReceiveSolHolderRewards"] is False
assert policy["profileOwnership"]["enabled"] is True
print("WORLDZPAD_TEAM_OWNERSHIP=PASS pool=6000000 percent=6 equal_split=1 initial_unlock=20 vesting_months=12 locked_rewards=0 profile_percent=onchain")
