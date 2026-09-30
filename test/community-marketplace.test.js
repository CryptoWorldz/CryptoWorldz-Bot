const test = require("node:test");
const assert = require("node:assert/strict");
const { MARKETPLACE_ADDONS, upgradeQuote } = require("../src/community-suite");

test("Worldz Marketplace exposes a broad add-on catalogue", () => {
  assert.ok(MARKETPLACE_ADDONS.length >= 12);
  const keys = new Set(MARKETPLACE_ADDONS.map(([key]) => key));
  for (const key of ["premium_custom_brand","branded_miniapp","advanced_ai","advanced_analytics","api_webhooks","multi_group","custom_security","launch_support","sponsored_slot"]) {
    assert.ok(keys.has(key), key);
  }
  assert.equal(keys.size, MARKETPLACE_ADDONS.length);
});

test("Marketplace items do not invent fixed prices", () => {
  for (const [, , , pricing] of MARKETPLACE_ADDONS) {
    assert.ok(["quote","included_or_quote"].includes(pricing));
  }
});


test("Starter Trial credit reduces only the first paid upgrade", () => {
  const prices = { trialSol:0.05, rentSol:0.3, rentToOwnSol:0.5, ownSol:4.5 };
  assert.deepEqual(
    upgradeQuote(prices, "rent", { trial_credit_sol:0.05, trial_credit_used_at:null }),
    { base:0.3, credit:0.05, due:0.25 }
  );
  assert.deepEqual(
    upgradeQuote(prices, "rent_to_own", { trial_credit_sol:0.05, trial_credit_used_at:"2026-10-01T00:00:00Z" }),
    { base:0.5, credit:0, due:0.5 }
  );
  assert.deepEqual(
    upgradeQuote(prices, "own", null),
    { base:4.5, credit:0, due:4.5 }
  );
});
