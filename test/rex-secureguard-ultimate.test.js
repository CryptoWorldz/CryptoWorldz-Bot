const test = require("node:test");
const assert = require("node:assert/strict");
const { REX_BRAND, REX_WELCOME_PRESET } = require("../src/rex-secureguard");
const REXSECURE_BRAND_IMAGE = require("../public/miniapp/rexsecure-brand-image");

test("REXSECURE ULTIMATE identity includes community tagline and CAS attribution", () => {
  assert.equal(REX_BRAND.name, "REXSECURE ULTIMATE™");
  assert.equal(REX_BRAND.tagline, "Security for Your Community");
  assert.equal(REX_BRAND.imageName, "rexsecure-ultimate-profile.jpg");
  assert.match(REX_BRAND.casAttribution, /https:\/\/cas\.chat/);
});

test("REXSECURE ULTIMATE ships the latest Worldz persona artwork and welcome preset", () => {
  assert.equal(REXSECURE_BRAND_IMAGE.mimeType, "image/jpeg");
  assert.equal(REXSECURE_BRAND_IMAGE.width, 320);
  assert.equal(REXSECURE_BRAND_IMAGE.height, 400);
  assert.ok(REXSECURE_BRAND_IMAGE.base64.length > 60000);
  assert.match(REX_WELCOME_PRESET.message, /Welcome to the community\./);
  assert.match(REX_WELCOME_PRESET.message, /REXSECURE ULTIMATE™ is now active\./);
  assert.match(REX_WELCOME_PRESET.message, /Security for Your Community\./);
});
