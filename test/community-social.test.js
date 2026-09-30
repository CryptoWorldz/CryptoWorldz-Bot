const test = require("node:test");
const assert = require("node:assert/strict");
const { SOCIAL_PLATFORMS, graceCapability, safeProfileUrl } = require("../src/community-social");

test("social catalogue includes requested community platforms", () => {
  for (const key of ["x","facebook","instagram","youtube","tiktok","telegram"]) {
    assert.ok(SOCIAL_PLATFORMS[key], key);
  }
});

test("social capability reporting only marks configured publishing adapters active", () => {
  const empty = graceCapability({});
  assert.equal(empty.x, false);
  assert.equal(empty.facebook, false);
  assert.equal(empty.telegram, true);
  assert.equal(empty.youtube, false);
  assert.equal(empty.tiktok, false);

  const configured = graceCapability({
    GRACE_X_CLIENT_ID:"id",
    GRACE_X_CLIENT_SECRET:"secret",
    GRACE_X_REDIRECT_URI:"https://example.com/x",
    GRACE_META_APP_ID:"meta",
    GRACE_META_APP_SECRET:"meta-secret",
    GRACE_META_REDIRECT_URI:"https://example.com/meta",
    GRACE_TOKEN_ENCRYPTION_KEY:"x".repeat(32)
  });
  assert.equal(configured.x, true);
  assert.equal(configured.facebook, true);
});

test("social profile URLs reject non-http schemes", () => {
  assert.match(safeProfileUrl("https://youtube.com/@worldz"), /^https:/);
  assert.equal(safeProfileUrl("javascript:alert(1)"), null);
});
