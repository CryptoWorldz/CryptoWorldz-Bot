const test = require("node:test");
const assert = require("node:assert/strict");
const { loadContract, validateFullBuildContract, summary, REQUIRED_FULLSCOPE_MODULES } = require("../src/fullbuild/core");

test("canonical WorldzFullBuild contract validates", () => {
  assert.equal(validateFullBuildContract(loadContract()), true);
});

test("WorldzFullScope is mandatory inside WorldzFullBuild", () => {
  const contract = loadContract();
  assert.equal(contract.architecture.fullScope.required, true);
  assert.equal(contract.architecture.fullScope.initialTokenEnvironmentCapacity, 160);
  assert.equal(REQUIRED_FULLSCOPE_MODULES.length, 10);
});

test("WorldzFullBuild keeps popularity and governance separate", () => {
  const contract = loadContract();
  assert.equal(contract.votingSeparation.popularity.brand, "Worldz Votes Centre™");
  assert.equal(contract.votingSeparation.popularity.governanceAuthority, false);
  assert.equal(contract.votingSeparation.governance.brand, "WorldzGovern™");
  assert.equal(contract.votingSeparation.governance.popularityRankingEffect, false);
});

test("FullBuild execution remains release-gated", () => {
  const build = summary();
  assert.equal(build.mainnetDefault, false);
  assert.equal(build.capacity, 160);
});
