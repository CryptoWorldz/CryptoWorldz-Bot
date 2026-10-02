const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/20261002024500_auto_activity_rewards.sql"),
  "utf8"
);

test("activity rewards automate ShillPoints and RaidPoints behind hard caps", () => {
  assert.match(migration, /auto_raid_points boolean not null default true/);
  assert.match(migration, /auto_shill_points boolean not null default true/);
  assert.match(migration, /raid_daily_claim_cap integer not null default 5/);
  assert.match(migration, /shill_daily_claim_cap integer not null default 5/);
  assert.match(migration, /user_daily_points_cap integer not null default 100/);
  assert.match(migration, /user_weekly_points_cap integer not null default 300/);
  assert.match(migration, /weekly_reward_budget_exhausted/);
  assert.match(migration, /reward_category_budget_exhausted/);
});

test("reward allocation is automatic but Treasury is not the member hot wallet", () => {
  assert.match(migration, /funding_source='treasury_to_rewards_wallet'/);
  assert.match(migration, /allocation_mode='automatic_capped'/);
  assert.match(migration, /direct_treasury_payout=false/);
  assert.match(migration, /new\.status:='approved'/);
  assert.match(migration, /Admin review is exception-only/);
});
