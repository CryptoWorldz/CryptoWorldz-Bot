const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261002011805_worldz_civic_public_voice_foundation.sql"),
  "utf8"
);

test("Worldz civic schema is a real Supabase migration, not documentation-only", () => {
  for (const table of [
    "worldz_civic_ballots",
    "worldz_civic_options",
    "worldz_civic_votes",
    "worldz_civic_concerns",
    "worldz_civic_audit_events"
  ]) assert.match(migration, new RegExp(`create table if not exists public[.]${table}`));
});

test("Worldz civic migration keeps binding votes, paid placement and direct authenticated access locked", () => {
  assert.match(migration, /check \(binding_state = 'non-binding-public-consultation'\)/);
  assert.match(migration, /paid_placement boolean not null default false check \(paid_placement = false\)/);
  assert.match(migration, /revoke all on[\s\S]*from authenticated;/);
  assert.match(migration, /public[.]zed_runtime_authorized\(\)/);
});

test("Worldz civic migration enables RLS on every civic table", () => {
  for (const table of [
    "worldz_civic_ballots",
    "worldz_civic_options",
    "worldz_civic_votes",
    "worldz_civic_concerns",
    "worldz_civic_audit_events"
  ]) assert.match(migration, new RegExp(`alter table public[.]${table} enable row level security;`));
});
