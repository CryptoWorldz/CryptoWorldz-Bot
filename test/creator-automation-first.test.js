const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const ux = fs.readFileSync(path.join(root, "src/user-experience.js"), "utf8");
const mini = fs.readFileSync(path.join(root, "public/miniapp/experience.js"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261004_creator_zero_admin_automation.sql"), "utf8");

test("Raaiiidd Creator uses automation-first lifecycle", () => {
  assert.match(ux, /autoValidateCreatorRequest/);
  assert.match(ux, /worldz_bot_stack_auto_validated/);
  assert.match(ux, /waiting_for_published_https_destination/);
  assert.match(ux, /deferred_auto/);
  assert.match(ux, /No Admin approval queue/);
  assert.doesNotMatch(ux, /\/api\/mini\/admin\/creator\/:id\/approve/);
  assert.doesNotMatch(ux, /\/api\/mini\/admin\/creator\/:id\/reject/);
});

test("Creator UI exposes automatic recheck and creator-owned target completion", () => {
  assert.match(mini, /data-creator-recheck/);
  assert.match(mini, /data-raid-recheck/);
  assert.match(mini, /data-creator-target/);
  assert.match(mini, /Add Link \+ Validate/);
  assert.doesNotMatch(mini, /data-creator-approve/);
  assert.doesNotMatch(mini, /approve-submission/);
  assert.doesNotMatch(mini, /reject-submission/);
});

test("Creator schema supports automatic holds without pending Admin review", () => {
  assert.match(migration, /awaiting_target/);
  assert.match(migration, /deferred_auto/);
  assert.match(migration, /automatic_validation_migration/);
});
