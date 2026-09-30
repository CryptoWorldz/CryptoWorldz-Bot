const test = require("node:test");
const assert = require("node:assert/strict");
const { formatCountdown, parseIsoWithOffset, pickWinners } = require("../src/community-ops");

test("calendar parser requires an explicit timezone", () => {
  assert.equal(parseIsoWithOffset("2026-10-08T19:00"), null);
  assert.ok(parseIsoWithOffset("2026-10-08T19:00+11:00") instanceof Date);
  assert.ok(parseIsoWithOffset("2026-10-08T08:00Z") instanceof Date);
});

test("giveaway draw returns unique winners from recorded entries", () => {
  const winners = pickWinners([1,2,2,3,4], 3);
  assert.equal(winners.length, 3);
  assert.equal(new Set(winners).size, 3);
  for (const id of winners) assert.ok([1,2,3,4].includes(id));
});


test("launch countdown formats future time without going negative", () => {
  const now = Date.parse("2026-10-01T00:00:00Z");
  const target = Date.parse("2026-10-03T03:45:00Z");
  assert.equal(formatCountdown(target, now), "2d 3h 45m");
  assert.equal(formatCountdown(now - 1, now), "0d 0h 0m");
});
