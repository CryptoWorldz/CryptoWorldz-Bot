const test = require("node:test");
const assert = require("node:assert/strict");
const { REXSECURE_BRAND, REXSECURE_WELCOME_PRESET } = require("../src/rex-secureguard");
const REXSECURE_BRAND_IMAGE = require("../public/miniapp/rexsecure-brand-image");

test("REXSECURE brand and welcome preset stay attached to community setup", () => {
  assert.equal(REXSECURE_BRAND.name, "REXSECURE™");
  assert.equal(REXSECURE_BRAND.tagline, "Security for Your Community");
  assert.equal(REXSECURE_BRAND.imageName, "rexsecure-brand-poster.jpg");
  assert.match(REXSECURE_WELCOME_PRESET.message, /Welcome to the community\./);
  assert.match(REXSECURE_WELCOME_PRESET.message, /REXSECURE™ is now active\./);
  assert.match(REXSECURE_WELCOME_PRESET.message, /Security for Your Community\./);
  assert.equal(REXSECURE_BRAND_IMAGE.mimeType, "image/jpeg");
  assert.ok(REXSECURE_BRAND_IMAGE.base64.length > 10000);
});
