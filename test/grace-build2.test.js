const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TOP_EXECUTIVES,
  parseAutoPostInput,
  parseGraceAdminInput
} = require("../src/grace/build2");

test("Grace Build 2 keeps the four protected Executive IDs", () => {
  assert.deepEqual([...TOP_EXECUTIVES].sort(), [
    "5978625584",
    "7615025841",
    "8029135300",
    "8604306923"
  ]);
});

test("Auto Post accepts one future schedule targeting multiple accounts", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const parsed = parseAutoPostInput(`${future} | 1,3,4 | Morning Post | OneWorldz 🌏 One Vision`);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value.accountIds, [1, 3, 4]);
  assert.equal(parsed.value.title, "Morning Post");
  assert.match(parsed.value.body, /OneWorldz/);
});

test("Auto Post rejects missing targets and past schedules", () => {
  assert.equal(parseAutoPostInput("bad | | Title | Caption").ok, false);
  assert.equal(parseAutoPostInput("2020-01-01T00:00:00Z | 1 | Title | Caption").ok, false);
});

test("delegated Grace Admin controls default new schedulers to account 1", () => {
  const parsed = parseGraceAdminInput("add 6406874841");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.action, "add");
  assert.equal(parsed.value.telegramId, "6406874841");
  assert.deepEqual(parsed.value.accountIds, [1]);
});

test("delegated Grace Admin grant supports multiple approved account IDs", () => {
  const parsed = parseGraceAdminInput("grant 6406874841 1,3,9");
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value.accountIds, [1, 3, 9]);
});
