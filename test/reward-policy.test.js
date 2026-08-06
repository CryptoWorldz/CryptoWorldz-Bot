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

test("launch reward plan explains active pools and protected buffer", () => {
  const text = buildLaunchRewardPlan({
    weekly_budget_cents: 8000,
    effective_weekly_points_cap: 3000,
    total_used: 80,
    mission_cap: 1500,
    mission_used: 80,
    referral_cap: 1000,
    referral_used: 0,
    reserve_cap: 500,
    reserve_used: 0,
    referral_inviter_points: 20,
    referral_newcomer_points: 10,
    referral_retention_days: 7,
    inviter_weekly_qualified_cap: 20
  });

  assert.match(text, /AUD \$80\.00/);
  assert.match(text, /Active weekly pool: 2500 LP/);
  assert.match(text, /Protected buffer: 500 LP/);
  assert.match(text, /Absolute hard ceiling: 3000 LP/);
  assert.match(text, /Every verified Raaiiidd: 20 LP/);
  assert.match(text, /Completed owner-approved request: 50 LP/);
  assert.match(text, /Total per qualified referral: 30 LP/);
});
