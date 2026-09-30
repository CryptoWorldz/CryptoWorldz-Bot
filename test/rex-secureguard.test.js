const test = require("node:test");
const assert = require("node:assert/strict");
const { challengeOptions, BLOCKED_PERMISSIONS } = require("../src/rex-secureguard");

test("REX number-match options contain one correct two-digit code and four unique options", () => {
  const code = 42;
  const options = challengeOptions(code);
  assert.equal(options.length, 4);
  assert.equal(new Set(options).size, 4);
  assert.ok(options.includes(code));
  for (const value of options) {
    assert.ok(Number.isInteger(value));
    assert.ok(value >= 10 && value <= 99);
  }
});

test("REX blocked permissions prevent normal posting before verification", () => {
  assert.equal(BLOCKED_PERMISSIONS.can_send_messages, false);
  assert.equal(BLOCKED_PERMISSIONS.can_send_photos, false);
  assert.equal(BLOCKED_PERMISSIONS.can_send_videos, false);
  assert.equal(BLOCKED_PERMISSIONS.can_add_web_page_previews, false);
});
