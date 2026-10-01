const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBallotDefinition,
  countApproval,
  countSingleChoice,
  countRankedChoiceIRV,
  createAuditReceipt
} = require("../src/votes-centre/civic");

const base = {
  id: "public-priority-001",
  title: "Public Priority",
  summary: "A neutral public consultation ballot.",
  jurisdiction: "AU-FED",
  method: "ranked-choice-irv",
  opensAt: "2026-10-10T00:00:00Z",
  closesAt: "2026-10-12T00:00:00Z",
  options: [
    { id: "a", label: "Option A", description: "First option." },
    { id: "b", label: "Option B", description: "Second option." },
    { id: "c", label: "Option C", description: "Third option." }
  ]
};

test("civic ballot defaults to non-binding and forbids paid placement", () => {
  const ballot = buildBallotDefinition(base);
  assert.equal(ballot.bindingStatus, "non-binding-public-consultation");
  assert.equal(ballot.equalExposure, true);
  assert.equal(ballot.paidPlacementAllowed, false);
  assert.throws(() => buildBallotDefinition({ ...base, paidPlacementAllowed: true }), /Paid ballot placement is prohibited/);
});

test("binding ballot requires legal approval and official authority", () => {
  assert.throws(() => buildBallotDefinition({ ...base, binding: true }), /official-authority/);
  const ballot = buildBallotDefinition({
    ...base,
    binding: true,
    legalReviewState: "approved",
    officialAuthorityRef: "example-authority-reference"
  });
  assert.equal(ballot.bindingStatus, "binding-authority-integrated");
});

test("approval count gives each ballot equal weight", () => {
  const result = countApproval([["a","b"],["b"],["c"]], ["a","b","c"]);
  assert.deepEqual(result.totals, { a: 1, b: 2, c: 1 });
  assert.equal(result.totalBallots, 3);
});

test("single choice rejects multi-selection as invalid rather than extra weight", () => {
  const result = countSingleChoice([["a"],["b"],["a","b"]], ["a","b"]);
  assert.deepEqual(result.totals, { a: 1, b: 1 });
  assert.equal(result.invalid, 1);
});

test("ranked-choice IRV counts preferences and does not invent a hidden tie-break", () => {
  const result = countRankedChoiceIRV([
    ["a","b","c"],
    ["a","b","c"],
    ["b","a","c"],
    ["b","a","c"],
    ["c","a","b"]
  ], ["a","b","c"]);
  assert.equal(result.status, "complete");
  assert.equal(result.winner, "a");

  const tie = countRankedChoiceIRV([["a"],["b"]], ["a","b"]);
  assert.equal(tie.status, "tie-requires-published-resolution");
  assert.deepEqual(tie.tiedLowest, ["a","b"]);
});

test("audit receipt is deterministic without exposing selections in the receipt itself", () => {
  const args = {
    ballotId: "public-priority-001",
    selections: ["b","a","c"],
    nonce: "12345678901234567890123456789012",
    castAt: "2026-10-10T01:00:00Z"
  };
  const a = createAuditReceipt(args);
  const b = createAuditReceipt(args);
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.doesNotMatch(a, /public-priority|b,a,c/);
});
