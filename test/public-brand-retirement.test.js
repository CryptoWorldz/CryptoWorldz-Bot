const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("public brand retirement script is wired as a fail-closed production gate", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github/workflows/deploy.yml"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "tools/retire_public_brand.py"), "utf8");
  assert.match(workflow, /Retire historical public branding before audit/);
  assert.match(workflow, /retire_public_brand\.py --apply/);
  assert.match(workflow, /retire_public_brand\.py --check/);
  assert.match(script, /WorldzEcosystem/);
  assert.match(script, /launchpad\.cryptoworldz\.xyz/);
  assert.match(script, /donateworldz\.com/);
});

test("brand scrub preserves lowercase internal data markers while removing public literals", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "tools/retire_public_brand.py"), "utf8");
  const match = source.match(/REPLACEMENTS = \[(.*?)\]\nFORBIDDEN_PUBLIC_LITERALS/s);
  assert.ok(match);
  assert.doesNotMatch(match[1], /data-oneworldz/);
});
