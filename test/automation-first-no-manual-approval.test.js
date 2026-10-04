const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const telegram = fs.readFileSync(path.join(root, "src/telegram.js"), "utf8");
const http = fs.readFileSync(path.join(root, "src/http.js"), "utf8");
const mini = fs.readFileSync(path.join(root, "public/miniapp/app.js"), "utf8");
const hardening = fs.readFileSync(path.join(root, "supabase/migrations/20261004_automation_security_hardening.sql"), "utf8");

test("routine Raid flow exposes automatic recheck instead of manual approval commands", () => {
  assert.doesNotMatch(telegram, /onText\(\/\^\\\/approve/);
  assert.doesNotMatch(telegram, /onText\(\/\^\\\/reject/);
  assert.match(telegram, /\/recheck submission_id/);
  assert.match(telegram, /autoAwardRaidSubmission/);
});

test("Mini App API has no direct Raid approve or reject route", () => {
  assert.doesNotMatch(http, /submissions\/:id\/approve/);
  assert.doesNotMatch(http, /submissions\/:id\/reject/);
  assert.match(http, /submissions\/:id\/recheck/);
  assert.doesNotMatch(mini, /approve-submission|reject-submission/);
  assert.match(mini, /recheck-submission/);
});

test("retired manual reward RPCs are service-role only", () => {
  assert.match(hardening, /revoke all on function public\.approve_social_shill_submission/);
  assert.match(hardening, /revoke all on function public\.approve_mission_completion/);
  assert.match(hardening, /to service_role/);
});
