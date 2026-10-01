const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("WorldzLaunchPad explicitly links REX SecureGuard through Command Centre", () => {
  const community = read("launchpad.cryptoworldz.xyz/community/index.html");
  const integrations = read("launchpad.cryptoworldz.xyz/integrations/index.html");
  const readiness = JSON.parse(read("launchpad.cryptoworldz.xyz/.well-known/worldzlaunch-readiness.json"));

  assert.match(community, /REX SecureGuard™/);
  assert.match(community, /Number-match verification/);
  assert.doesNotMatch(community, /<\/section>\\n<section/);
  assert.match(integrations, /REX SecureGuard™/);
  assert.match(integrations, /Command Centre \+ REX/);
  assert.equal(readiness.community.rexSecureGuard.status, "CONNECTED_COMMAND_CENTRE_SECURITY_MODULE");
  assert.deepEqual(readiness.community.rexSecureGuard.controls, [
    "number_match","anti_flood","link_blocklist","impersonation_warning"
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
