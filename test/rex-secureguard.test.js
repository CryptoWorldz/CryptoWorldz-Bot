const test = require("node:test");
const assert = require("node:assert/strict");
const { challengeOptions, BLOCKED_PERMISSIONS, extractHosts, normalizeDomain, normalizeIdentityLabel } = require("../src/rex-secureguard");

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


test("REX normalizes explicit domain rules safely", () => {
  assert.equal(normalizeDomain("https://WWW.Example.com/path"), "example.com");
  assert.equal(normalizeDomain("not-a-domain"), null);
});

test("REX extracts unique HTTPS/HTTP hosts from member messages", () => {
  assert.deepEqual(
    extractHosts("See https://example.com/a and https://www.example.com/b plus http://other.test/x"),
    ["example.com","other.test"]
  );
});


test("REX normalizes identity labels before comparing display names", () => {
  assert.equal(normalizeIdentityLabel("  @JayJay-TeamDev  "), "jayjay teamdev");
  assert.equal(normalizeIdentityLabel("Professor  Pepe"), "professor pepe");
});
