const test = require("node:test");
const assert = require("node:assert/strict");
const { MARKETPLACE_ADDONS } = require("../src/community-suite");

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
