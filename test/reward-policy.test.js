const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLaunchRewardPlan,
  parseStandardRaid
} = require("../src/reward-policy");

test("standard Raaiiidd rewards are always fixed at 20 LP", () => {
  const normal = parseStandardRaid("https://x.com/example/status/1");
  assert.equal(normal.ok, true);
  assert.equal(normal.mission.reward_points, 20);

  const legacy = parseStandardRaid("https://x.com/example/status/2 | 10 | 24h");
  assert.equal(legacy.ok, true);
  assert.equal(legacy.mission.reward_points, 20);
  assert.ok(legacy.mission.expires_at);
});

test("V8 launch reward plan explains active pools and locked reserve", () => {
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

  assert.match(text, /AUD \$100\.00/);
  assert.match(text, /First-week active pool: 3500 LP/);
  assert.match(text, /Protected owner reserve: 1500 LP — LOCKED/);
  assert.match(text, /Absolute hard ceiling: 5000 LP/);
  assert.match(text, /Every verified Raaiiidd: 20 LP/);
  assert.match(text, /20 LP tier/);
  assert.match(text, /50 LP tier/);
  assert.match(text, /100 LP tier/);
  assert.match(text, /Total per qualified referral: 30 LP/);
  assert.match(text, /Token purchases, holdings and donation amounts do not buy Legend Points/);
});
