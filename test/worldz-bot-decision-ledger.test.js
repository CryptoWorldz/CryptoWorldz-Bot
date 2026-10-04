const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const repository = fs.readFileSync(path.join(root, "src/repository.js"), "utf8");
const creator = fs.readFileSync(path.join(root, "src/user-experience.js"), "utf8");
const shill = fs.readFileSync(path.join(root, "src/shill-rewards.js"), "utf8");
const spotlight = fs.readFileSync(path.join(root, "src/launchpad-ads.js"), "utf8");

test("repository exports the shared Worldz bot decision ledger writer", () => {
  assert.match(repository, /async function recordBotDecision/);
  assert.match(repository, /rpc\("record_worldz_bot_decision"/);
  assert.match(repository, /recordHistory,\s*recordBotDecision,\s*recordVerifiedContribution/);
});

test("automation modules route decisions into the shared ledger", () => {
  assert.match(creator, /recordCreatorDecision/);
  assert.match(creator, /repository\.recordBotDecision/);
  assert.match(shill, /repository\.recordBotDecision/);
  assert.match(spotlight, /repository\?\.recordBotDecision/);
});
