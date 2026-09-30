const test = require("node:test");
const assert = require("node:assert/strict");
const { MODULES, THEME_PACKS, pricing, slugify } = require("../src/community-suite-core");

test("Community Suite exposes the complete modular product catalogue", () => {
  const keys = new Set(MODULES.map(([key]) => key));
  for (const key of ["rex_secureguard","alice_support","ronald_raider","worldzscan","market_alerts","wallet_watch","calendar","giveaways","analytics","social","inbox","worldping","worldzcast","launchpad","webhooks"]) {
    assert.ok(keys.has(key), key);
  }
});

test("Community Suite ships ten brand theme packs", () => {
  assert.equal(THEME_PACKS.length, 10);
  assert.equal(new Set(THEME_PACKS.map((item) => item.key)).size, 10);
});

test("Community Suite locked default pricing matches commercial blueprint", () => {
  const p = pricing({});
  assert.equal(p.trialSol, 0.05);
  assert.equal(p.trialDays, 7);
  assert.equal(p.rentSol, 0.3);
  assert.equal(p.rentToOwnSol, 0.5);
  assert.equal(p.rentToOwnMonths, 12);
  assert.equal(p.ownSol, 4.5);
});

test("workspace slugs are stable and safe", () => {
  assert.equal(slugify("Purple Diamond Crew!!"), "purple-diamond-crew");
});
