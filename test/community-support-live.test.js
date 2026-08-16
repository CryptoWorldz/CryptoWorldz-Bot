const test = require("node:test");
const assert = require("node:assert/strict");
const {
  safePublicLabel,
  sanitizeProfile,
  registerCommunitySupportLive
} = require("../src/community-support/live-v1");

test("generic database names are never exposed as public display names", () => {
  assert.equal(safePublicLabel({ display_name: "Facebook Support Profile 01" }), "Verified Community Support Link");
  assert.equal(safePublicLabel({ display_name: "Action Spreads Smiles" }), "Action Spreads Smiles");
});

test("profile sanitizer preserves verified Facebook link and display order", () => {
  const row = sanitizeProfile({
    display_order: 7,
    display_name: "Facebook Support Profile 07",
    facebook_url: "https://www.facebook.com/share/example/",
    category: "people_and_children"
  });
  assert.deepEqual(row, {
    display_order: 7,
    display_name: "Verified Community Support Link",
    facebook_url: "https://www.facebook.com/share/example/",
    category: "people_and_children",
    metadata_status: "neutral_verified_link"
  });
});

test("community support module registers protected read-only API routes", () => {
  const registrations = [];
  const app = {
    use(path, handler) { registrations.push(["USE", path, handler]); },
    options(path, handler) { registrations.push(["OPTIONS", path, handler]); },
    get(path, handler) { registrations.push(["GET", path, handler]); }
  };
  registerCommunitySupportLive(app);
  assert.deepEqual(registrations.map(([method, path]) => `${method} ${path}`), [
    "USE /api/oneworldz-community-support",
    "OPTIONS /api/oneworldz-community-support",
    "GET /api/oneworldz-community-support"
  ]);
});
