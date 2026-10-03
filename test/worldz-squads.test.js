const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { normalizePeriod, slugifySquad, cleanName } = require("../src/worldz-squads");

test("Worldz Squads normalizes competition periods", () => {
  assert.equal(normalizePeriod("1d"), "1D");
  assert.equal(normalizePeriod("1W"), "1W");
  assert.equal(normalizePeriod("garbage"), "1M");
});

test("Worldz Squad slug and name normalization is bounded", () => {
  assert.equal(slugifySquad(" Welcome To THE CHAOS!! "), "welcome-to-the-chaos");
  assert.equal(cleanName("  THE   CHAOS  "), "THE CHAOS");
  assert.ok(slugifySquad("a".repeat(80)).length <= 32);
});

test("Worldz Squads public and Mini App surfaces exist", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "launchpad.cryptoworldz.xyz/squads/index.html"), "utf8");
  const mini = fs.readFileSync(path.join(root, "public/miniapp/worldz-squads.js"), "utf8");
  assert.match(html, /WORLDZ SQUADS/);
  assert.match(html, /THECHAOS ON PUMP\.FUN/);
  assert.match(mini, /Save Squad Card/);
  assert.match(mini, /verified indexing/i);
});
