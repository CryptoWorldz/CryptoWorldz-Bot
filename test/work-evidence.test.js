const test = require("node:test");
const assert = require("node:assert/strict");
const { CATEGORIES, formatDuration } = require("../src/work-evidence");

test("formatDuration reports verified minutes clearly", () => {
  assert.equal(formatDuration(0), "0 minutes");
  assert.equal(formatDuration(59), "59 minutes");
  assert.equal(formatDuration(61), "1h 1m");
  assert.equal(formatDuration(185), "3h 5m");
});

test("work evidence categories include deployments and tests", () => {
  assert.equal(CATEGORIES.has("deployment"), true);
  assert.equal(CATEGORIES.has("test"), true);
  assert.equal(CATEGORIES.has("expense"), true);
  assert.equal(CATEGORIES.has("invented_hours"), false);
});
