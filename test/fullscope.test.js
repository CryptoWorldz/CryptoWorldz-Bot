const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_TOKENS_PER_CHAIN,
  SUPPORTED_CHAINS,
  VOTING_NAMESPACES,
  assertVotingSeparation,
  buildActionIntent,
  capacitySummary
} = require("../src/fullscope/core");

test("WorldzFullScope supports eight current launchpad chains at twenty token slots each", () => {
  assert.equal(SUPPORTED_CHAINS.length, 8);
  assert.equal(MAX_TOKENS_PER_CHAIN, 20);
  assert.equal(SUPPORTED_CHAINS.length * MAX_TOKENS_PER_CHAIN, 160);
});

test("Worldz Votes Centre and WorldzGovern can never share a command namespace", () => {
  assert.equal(assertVotingSeparation(), true);
  assert.equal(VOTING_NAMESPACES.popularity.brand, "Worldz Votes Centre™");
  assert.equal(VOTING_NAMESPACES.governance.brand, "WorldzGovern™");
});

test("financial intents are preparation-only until an adapter release gate is enabled", () => {
  const intent = buildActionIntent({ actionType: "buy", chainKey: "solana", tokenId: "fixture-token" });
  assert.equal(intent.requiresSignature, true);
  assert.equal(intent.custody, "external-wallet");
  assert.equal(intent.autoBroadcast, false);
  assert.equal(intent.mainnetExecutionEnabled, false);
});

test("capacity summary enforces twenty slots per chain", () => {
  const sol = capacitySummary({ solana: 7 }).find((row) => row.key === "solana");
  assert.equal(sol.active, 7);
  assert.equal(sol.remaining, 13);
});
