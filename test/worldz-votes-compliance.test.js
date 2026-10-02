const test = require("node:test");
const assert = require("node:assert/strict");
const profile = require("../config/worldz-votes/australia-federal-2026.json");
const { evaluatePublicationGate } = require("../src/votes-centre/compliance");

test("2026 AU profile permits neutral non-binding publication when required authorisation is present", () => {
  const result = evaluatePublicationGate(profile, {
    now: "2026-10-02T00:00:00Z",
    requiresAuthorisation: true,
    authorisationText: "Authorised by Example Responsible Person",
    sourceBundleCount: 2
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.blockers, []);
});

test("publication gate blocks required authorisation when missing", () => {
  const result = evaluatePublicationGate(profile, {
    now: "2026-10-02T00:00:00Z",
    requiresAuthorisation: true,
    sourceBundleCount: 1
  });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.includes("required-authorisation-missing"));
});

test("binding request needs official authority, legal review, privacy review and independent audit", () => {
  const result = evaluatePublicationGate(profile, {
    now: "2026-10-02T00:00:00Z",
    bindingRequested: true,
    sourceBundleCount: 1
  });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.includes("official-authority-reference-required"));
  assert.ok(result.blockers.includes("approved-legal-review-required"));
  assert.ok(result.blockers.includes("independent-audit-required"));
  assert.ok(result.blockers.includes("privacy-eligibility-review-required"));
});

test("expired jurisdiction profile fails closed", () => {
  const result = evaluatePublicationGate(profile, {
    now: "2027-01-01T00:00:00Z",
    sourceBundleCount: 1
  });
  assert.equal(result.allowed, false);
  assert.ok(result.blockers.includes("compliance-profile-expired"));
});
