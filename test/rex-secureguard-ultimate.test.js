const test = require("node:test");
const assert = require("node:assert/strict");
const { REX_BRAND } = require("../src/rex-secureguard");

test("REXSECURE ULTIMATE identity includes community tagline and CAS attribution", () => {
  assert.equal(REX_BRAND.name, "REXSECURE ULTIMATE™");
  assert.equal(REX_BRAND.tagline, "Security for Your Community");
  assert.match(REX_BRAND.casAttribution, /https:\/\/cas\.chat/);
});
