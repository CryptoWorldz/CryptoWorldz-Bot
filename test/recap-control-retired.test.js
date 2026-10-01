const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("active Command Centre runtime has no RECAP control surface", () => {
  const activeFiles = [
    "src/command-registry.js",
    "src/full-runtime-entry.js",
    "src/telegram.js",
    "public/miniapp/max.js",
    "cryptoworldz.xyz/command-centre-max/index.html"
  ];

  for (const rel of activeFiles) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(text, /\bRECAP\b|RecapThisBot|recap_manager/i, rel);
  }
});

test("retirement migration removes RECAP admin and partner control roles", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/20261001115500_retire_recap_control.sql"),
    "utf8"
  );

  assert.match(migration, /delete from public\.bot_admin_permissions/i);
  assert.match(migration, /delete from public\.bot_admins/i);
  assert.match(migration, /delete from public\.partner_profiles/i);
  assert.match(migration, /where role = 'recap_manager'/i);
  assert.match(migration, /where partner_role = 'recap_manager'/i);

  const newAdminRoleCheck = migration.match(/add constraint bot_admins_role_check[\s\S]*?validate constraint bot_admins_role_check/i)?.[0] || "";
  const newPartnerRoleCheck = migration.match(/add constraint partner_profiles_partner_role_check[\s\S]*?validate constraint partner_profiles_partner_role_check/i)?.[0] || "";
  assert.doesNotMatch(newAdminRoleCheck, /recap_manager/i);
  assert.doesNotMatch(newPartnerRoleCheck, /recap_manager/i);
});
