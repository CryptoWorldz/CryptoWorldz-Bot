const test = require("node:test");
const assert = require("node:assert/strict");
const { loadContract, validateFullBuildContract, summary } = require("../src/fullbuild/core");

test("canonical WorldzFullBuild validates with FullScope required", () => {
  const contract = loadContract();
  assert.equal(validateFullBuildContract(contract), true);
  assert.equal(contract.architecture.fullScope.required, true);
  assert.equal(contract.architecture.fullScope.initialTokenEnvironmentCapacity, 160);
});

test("FullBuild separates popularity from governance", () => {
  const contract = loadContract();
  assert.equal(contract.votingSeparation.popularity.brand, "Worldz Votes Centre™");
  assert.equal(contract.votingSeparation.popularity.governanceAuthority, false);
  assert.equal(contract.votingSeparation.governance.brand, "WorldzGovern™");
  assert.equal(contract.votingSeparation.governance.popularityRankingEffect, false);
});

test("WorldzFullBuild summary exposes 8 x 20 capacity", () => {
  const build = summary();
  assert.equal(build.chains, 8);
  assert.equal(build.tokensPerChain, 20);
  assert.equal(build.capacity, 160);
});
