const test = require("node:test");
const assert = require("node:assert/strict");
const { AD_PLATFORMS, EXECUTIVE_IDS, parseBudgetInput, parseCampaignInput } = require("../src/grace/build3");

test("Grace Stage 3 keeps the protected Executive IDs", () => {
  assert.deepEqual([...EXECUTIVE_IDS].sort(), ["5978625584", "7615025841", "8029135300", "8604306923"]);
});

test("campaign creation requires a name and objective", () => {
  assert.equal(parseCampaignInput("Launch Week | Coordinate approved launch content").ok, true);
  assert.equal(parseCampaignInput("Launch Week").ok, false);
});

test("ad budget parser accepts explicit provider budget limits", () => {
  const parsed = parseBudgetInput("123e4567-e89b-12d3-a456-426614174000 | facebook | 50 | AUD");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.platform, "facebook");
  assert.equal(parsed.value.amount, 50);
  assert.equal(parsed.value.currency, "AUD");
});

test("ad budget parser rejects unsupported platforms and unsafe amounts", () => {
  assert.equal(AD_PLATFORMS.has("facebook"), true);
  assert.equal(parseBudgetInput("123e4567-e89b-12d3-a456-426614174000 | casino | 50 | USD").ok, false);
  assert.equal(parseBudgetInput("123e4567-e89b-12d3-a456-426614174000 | x | -1 | USD").ok, false);
});
