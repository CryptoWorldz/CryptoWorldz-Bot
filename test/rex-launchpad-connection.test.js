const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("WorldzLaunchPad explicitly links REXSECURE ULTIMATE through Command Centre", () => {
  const community = read("launchpad.cryptoworldz.xyz/community/index.html");
  const integrations = read("launchpad.cryptoworldz.xyz/integrations/index.html");
  const readiness = JSON.parse(read("launchpad.cryptoworldz.xyz/.well-known/worldzlaunch-readiness.json"));

  assert.match(community, /REXSECURE ULTIMATE™/);
  assert.match(community, /CAS threat intelligence/);
  assert.doesNotMatch(community, /<\/section>\\n<section/);
  assert.match(integrations, /REXSECURE ULTIMATE™/);
  assert.match(integrations, /Command Centre \+ REX/);
  assert.equal(readiness.community.rexSecureGuard.status, "CONNECTED_COMMAND_CENTRE_SECURITY_MODULE");
  assert.equal(readiness.community.rexSecureGuard.product, "REXSECURE ULTIMATE™");
  assert.equal(readiness.community.rexSecureGuard.persona, "4/5");
  assert.deepEqual(readiness.community.rexSecureGuard.controls, [
    "cas_threat_intelligence",
    "rex_network_shield",
    "number_match",
    "external_bot_guard",
    "identity_guard",
    "pattern_guard",
    "anti_flood",
    "link_guard",
    "under_attack"
  ]);
});

test("production Community Suite proof restores the original REX enabled state", () => {
  const workflow = read(".github/workflows/community-suite-live-proof.yml");
  assert.match(workflow, /original_secureguard_enabled=False/);
  assert.match(workflow, /REX_ORIGINAL_STATE=/);
  assert.match(workflow, /"secureguard_enabled":bool\(original_secureguard_enabled\)/);
  assert.match(workflow, /REX_RESTORED_STATE=/);
  assert.doesNotMatch(workflow, /REX cleanup command failed/);
});


test("Community Suite live proof waits for protected deployment before Telegram proof", () => {
  const workflow = read(".github/workflows/community-suite-live-proof.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /Restore ZED AUTO GRACE Command Centre/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.doesNotMatch(workflow, /\n  push:\n/);
});

test("latest REX Persona 4\/5 artwork is the one shared by MiniApp and Telegram", () => {
  const asset = read("public/miniapp/rexsecure-brand-image.js");
  const index = read("public/miniapp/index.html");
  const rex = read("src/rex-secureguard.js");
  for (let part = 1; part <= 9; part += 1) {
    assert.match(index, new RegExp(`rexsecure-image-part-${part}\\.js`));
    assert.match(asset, new RegExp(`rexsecure-image-part-${part}`));
  }
  assert.match(asset, /rexsecure-ultimate-profile\.jpg/);
  assert.match(asset, /persona 4\/5/i);
  assert.match(rex, /REXSECURE_BRAND_IMAGE/);
  assert.match(rex, /\/rexwelcome/);
});


test("WorldzLaunchPad live proof keeps REX assertions as real Python lines", () => {
  const workflow = read(".github/workflows/deploy-worldzlaunchpad.yml");
  assert.doesNotMatch(workflow, /REXSECURE ULTIMATE™'\\n\s+assert/);
  assert.match(workflow, /rexSecureGuard'\]\['product'\].*REXSECURE ULTIMATE™/);
  assert.match(workflow, /rexSecureGuard'\]\['persona'\].*4\/5/);
});
