const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRewardPlan,
  isActiveMember,
  isJoinTransition,
  parseReferralRules,
  safeInviteName
} = require("../src/referrals");

test("active Telegram membership detection handles normal and restricted members", () => {
  assert.equal(isActiveMember({ status: "member" }), true);
  assert.equal(isActiveMember({ status: "administrator" }), true);
  assert.equal(isActiveMember({ status: "restricted", is_member: true }), true);
  assert.equal(isActiveMember({ status: "restricted", is_member: false }), false);
  assert.equal(isActiveMember({ status: "left" }), false);
});

test("join transition requires an actual move into active membership", () => {
  assert.equal(
    isJoinTransition({
      old_chat_member: { status: "left" },
      new_chat_member: { status: "member" }
    }),
    true
  );
  assert.equal(
    isJoinTransition({
      old_chat_member: { status: "member" },
      new_chat_member: { status: "administrator" }
    }),
    false
  );
});

test("invite names are safe and remain within Telegram limits", () => {
  const name = safeInviteName("123456789012345678901234");
  assert.match(name, /^CW-\d+$/);
  assert.ok(name.length <= 32);
});

test("referral rules accept only conservative launch ranges", () => {
  assert.deepEqual(parseReferralRules("20 | 5 | 7 | 5"), {
    ok: true,
    inviterPoints: 20,
    newcomerPoints: 5,
    retentionDays: 7,
    weeklyCap: 5
  });
  assert.equal(parseReferralRules("500 | 5 | 7 | 5").ok, false);
  assert.equal(parseReferralRules("20 | 5 | 0 | 5").ok, false);
});

test("reward plan explains caps, fair task values and no automatic kitty payout", () => {
  const text = buildRewardPlan({
    effective_weekly_points_cap: 1000,
    total_used: 80,
    mission_cap: 500,
    mission_used: 80,
    referral_cap: 300,
    referral_used: 0,
    reserve_cap: 200,
    reserve_used: 0,
    referral_inviter_points: 20,
    referral_newcomer_points: 5,
    referral_retention_days: 7,
    inviter_weekly_qualified_cap: 5,
    weekly_budget_cents: 0
  }, { ownerView: true });

  assert.match(text, /1,000 LP pilot cap/);
  assert.match(text, /Standard Raaiiidd — 10 LP/);
  assert.match(text, /never automatic/);
});
