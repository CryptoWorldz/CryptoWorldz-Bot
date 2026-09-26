const test = require("node:test");
const assert = require("node:assert/strict");
const { CONTRACT, GENESIS_FOUR, validateFullBuildContract, summary } = require("../src/fullbuild/core");

test("WorldzFullBuild canonical contract validates", () => {
  assert.equal(validateFullBuildContract(CONTRACT), true);
});

test("whole-project inheritance is active", () => {
  assert.equal(CONTRACT.projectContinuity.latestOwnerDirective.state, "INCORPORATED_INTO_WORLDZFULLBUILD_PARENT");
  assert.equal(CONTRACT.projectWideIntegration.currentDirectiveState, "WHOLE_PROJECT_AND_PROJECT_CHAT_INHERITANCE_ACTIVE");
});

test("Genesis Four remain exact", () => {
  assert.deepEqual(GENESIS_FOUR.map(x => [x.symbol, x.supply]), [
    ["WLDZ", 100000000],
    ["RVIV", 200000000],
    ["PNEX", 250000000],
    ["MRCL", 348000000]
  ]);
});

test("FullScope stays 8 x 20 and mainnet defaults off", () => {
  const data = summary();
  assert.equal(data.chains, 8);
  assert.equal(data.tokenSlotsPerChain, 20);
  assert.equal(data.environments, 160);
  assert.equal(data.mainnetDefault, false);
});

test("popularity and governance remain separate", () => {
  assert.equal(CONTRACT.votingSeparation.popularity.governanceAuthority, false);
  assert.equal(CONTRACT.votingSeparation.governance.popularityRankingEffect, false);
  assert.notEqual(CONTRACT.votingSeparation.popularity.brand, CONTRACT.votingSeparation.governance.brand);
});
