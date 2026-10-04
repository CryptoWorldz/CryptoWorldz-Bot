const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase/migrations/20261004_worldz_votes_shill_performance_security.sql"),
  "utf8"
);

test("Worldz Votes leaderboard uses invoker security", () => {
  assert.match(migration, /worldz_popularity_leaderboard/);
  assert.match(migration, /security_invoker\s*=\s*true/);
});

test("active Votes and ShillPoints foreign-key paths are indexed", () => {
  assert.match(migration, /worldz_popularity_votes\(token_id, created_at desc\)/);
  assert.match(migration, /social_shill_submissions\(token_symbol\)/);
});
