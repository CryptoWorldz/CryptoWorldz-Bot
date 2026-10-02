const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_TOKENS_PER_CHAIN,
  SUPPORTED_CHAINS,
  VOTING_NAMESPACES,
  assertVotingRules,
  capacitySummary
} = require("../src/fullscope/core");

test("WorldzFullScope supports eight current launchpad chains at twenty token slots each", () => {
  assert.equal(SUPPORTED_CHAINS.length, 8);
  assert.equal(MAX_TOKENS_PER_CHAIN, 20);
  assert.equal(SUPPORTED_CHAINS.length * MAX_TOKENS_PER_CHAIN, 160);
});

test("Worldz Votes Centre keeps token popularity and civic voting separated", () => {
  assert.equal(assertVotingRules(), true);
  assert.equal(VOTING_NAMESPACES.popularity.brand, "Worldz Votes Centre™");
  assert.equal(VOTING_NAMESPACES.popularity.cadence, "one-vote-per-user-per-rolling-hour");
  assert.ok(VOTING_NAMESPACES.popularity.commands.includes("vote"));
  assert.equal(VOTING_NAMESPACES.civic.purpose, "civic-public-consultation");
  assert.equal(VOTING_NAMESPACES.civic.paidPlacementAllowed, false);
  assert.equal(VOTING_NAMESPACES.civic.equalExposure, true);
  assert.equal(VOTING_NAMESPACES.civic.bindingDefault, "non-binding-public-consultation");
  assert.equal("governance" in VOTING_NAMESPACES, false);
});

test("capacity summary enforces twenty slots per chain", () => {
  const sol = capacitySummary({ solana: 7 }).find((row) => row.key === "solana");
  assert.equal(sol.active, 7);
  assert.equal(sol.remaining, 13);
});
