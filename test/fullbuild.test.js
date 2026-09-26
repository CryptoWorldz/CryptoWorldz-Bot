const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  validateFullBuildContract,
  summary,
  REQUIRED_FULLSCOPE_MODULES,
  VOTING_BOUNDARIES
} = require("../src/fullbuild/core");

const contract = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../worldzpad-omnichain/fullbuild/worldz-fullbuild.v1.json"),
  "utf8"
));

test("WorldzFullBuild master contract validates", () => {
  assert.equal(validateFullBuildContract(contract), true);
});

test("WorldzFullScope is mandatory inside WorldzFullBuild", () => {
  assert.equal(contract.fullScope.required, true);
  assert.equal(contract.fullScope.initialTokenEnvironmentCapacity, 160);
  assert.equal(REQUIRED_FULLSCOPE_MODULES.length, 10);
});

test("popularity and governance remain hard-separated at FullBuild level", () => {
  assert.equal(VOTING_BOUNDARIES.popularity.brand, "Worldz Votes Centre™");
  assert.equal(VOTING_BOUNDARIES.governance.brand, "WorldzGovern™");
  assert.equal(VOTING_BOUNDARIES.popularity.mayExecuteGovernance, false);
  assert.equal(VOTING_BOUNDARIES.governance.mayAffectPopularityRanking, false);
});

test("WorldzFullBuild release defaults stay safe", () => {
  const data = summary();
  assert.equal(data.mainnetDefault, false);
  assert.equal(data.initialTokenEnvironmentCapacity, 160);
});
