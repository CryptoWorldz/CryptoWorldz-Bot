const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

test("Command Centre exposes simple onboarding and DIPSHIT guidance", () => {
  const centre = fs.readFileSync(path.join(ROOT, "src/command-centre.js"), "utf8");
  const profile = fs.readFileSync(path.join(ROOT, "src/referrals.js"), "utf8");
  const dip = fs.readFileSync(path.join(ROOT, "public/miniapp/dipshit.js"), "utf8");

  assert.match(centre, /START HERE/);
  assert.match(centre, /howtojoin/);
  assert.match(centre, /ABOUT THE ZED-LED COMMAND CENTRE/);
  assert.match(profile, /ADD WALLET/);
  assert.match(profile, /RAID NOW/);
  assert.match(profile, /Worldz Role/);
  assert.match(dip, /LOST\? START HERE/);
  assert.match(dip, /ASK DIPSHIT/);
});

test("Ronald Raider member UX is one obvious action loop", () => {
  const ronald = fs.readFileSync(path.join(ROOT, "src/ronald-raider.js"), "utf8");
  assert.match(ronald, /RAID IN 3 EASY STEPS/);
  assert.match(ronald, /I RAIDED/);
  assert.match(ronald, /COMMUNITY POST TARGETS — not your personal checklist/);
  assert.match(ronald, /participation_count/);
  assert.match(ronald, /reconcilePendingRaidRewards/);
});

test("Worldz public guide and future domain fronts are prepared without fake LIVE state", () => {
  for (const file of [
    "cryptoworldz.xyz/worldz-guide.js",
    "donateworldz.com/worldz-guide.js",
    "oneworldz.com/worldz-guide.js",
    "launchpad.cryptoworldz.xyz/worldz-guide.js"
  ]) {
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(body, /START HERE/);
    assert.match(body, /DipShitBossBot/);
  }

  const hq = JSON.parse(fs.readFileSync(path.join(ROOT, "worldzhq.com/domain-plan.json"), "utf8"));
  const launch = JSON.parse(fs.readFileSync(path.join(ROOT, "worldzlaunch.com/domain-plan.json"), "utf8"));
  assert.equal(hq.status, "PREPARED_NOT_PROVEN_LIVE");
  assert.equal(launch.status, "PREPARED_NOT_PROVEN_LIVE");
  assert.equal(hq.futurePrimaryHost, "worldzhq.com");
  assert.equal(launch.futurePrimaryHost, "worldzlaunch.com");
});
