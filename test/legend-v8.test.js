const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSpecialTierText, tierCap } = require("../src/legend-v8");
const { buildLaunchRewardPlan } = require("../src/reward-policy");

test("tierCap reads protected per-user weekly limits", () => {
  const status = {
    special_tier_20_weekly_user_cap: 15,
    special_tier_50_weekly_user_cap: 10,
    special_tier_100_weekly_user_cap: 5
  };
  assert.equal(tierCap(status, 20), 15);
  assert.equal(tierCap(status, 50), 10);
  assert.equal(tierCap(status, 100), 5);
});

test("special tier text excludes purchase-based points", () => {
  const text = buildSpecialTierText({
    special_used: 80,
    special_cap: 1000,
    shill_boost_points: 20,
    shill_boost_weekly_inviter_cap: 15,
    special_tier_20_weekly_user_cap: 15,
    special_tier_50_weekly_user_cap: 10,
    special_tier_100_weekly_user_cap: 5
  });
  assert.match(text, /20 LP/);
  assert.match(text, /50 LP/);
  assert.match(text, /100 LP/);
  assert.match(text, /does not purchase Legend Points/);
});

test("launch plan shows 3500 active and 5000 hard ceiling", () => {
  const text = buildLaunchRewardPlan({
    weekly_budget_cents: 10000,
    effective_weekly_points_cap: 5000,
    active_weekly_points_cap: 3500,
    active_used: 80,
    total_used: 80,
    mission_cap: 1500,
    mission_used: 80,
    referral_cap: 1000,
    referral_used: 0,
    special_cap: 1000,
    special_used: 0,
    reserve_cap: 1500,
    reserve_used: 0,
    reserve_enabled: false,
    referral_inviter_points: 20,
    referral_newcomer_points: 10,
    referral_retention_days: 7,
    inviter_weekly_qualified_cap: 20,
    shill_boost_points: 20,
    special_tier_20_weekly_user_cap: 15,
    special_tier_50_weekly_user_cap: 10,
    special_tier_100_weekly_user_cap: 5,
    unique_legend_points: 250,
    unique_legend_cooldown_days: 90
  });
  assert.match(text, /First-week active pool: 3500 LP/);
  assert.match(text, /Absolute hard ceiling: 5000 LP/);
  assert.match(text, /LOCKED/);
});
