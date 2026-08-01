const test = require("node:test");
const assert = require("node:assert/strict");
const { safeTokenMatch } = require("../src/http");

test("constant-time token helper accepts only exact values", () => {
  assert.equal(safeTokenMatch("same-token", "same-token"), true);
  assert.equal(safeTokenMatch("wrong-token", "same-token"), false);
  assert.equal(safeTokenMatch("short", "longer-token"), false);
  assert.equal(safeTokenMatch(undefined, "token"), false);
});
