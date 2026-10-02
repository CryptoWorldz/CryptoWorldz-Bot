const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../config/worldz-votes/global-public-voice.v1.json");
const { GLOBAL_HUMAN_NEEDS, getGlobalPublicVoiceStatus } = require("../src/votes-centre/global");

test("Global Public Voice has no country or territory allowlist", () => {
  const status = getGlobalPublicVoiceStatus();
  assert.equal(status.scope, "worldwide");
  assert.equal(status.worldwide, true);
  assert.equal(status.countryTerritoryAllowlist, null);
  assert.equal(status.geographicExclusionAllowed, false);
  assert.equal(status.bindingVotingEnabled, false);
});

test("Global Public Voice does not weight demographics, wealth or tokens", () => {
  const status = getGlobalPublicVoiceStatus();
  assert.equal(status.demographicVoteWeightingAllowed, false);
  assert.equal(status.wealthOrTokenWeightingAllowed, false);
  assert.equal(policy.participation.raceOrEthnicityCollectionRequired, false);
  assert.equal(policy.participation.exactHomeAddressRequired, false);
});

test("General Public Voice is age-inclusive but binding eligibility remains jurisdiction gated", () => {
  const status = getGlobalPublicVoiceStatus();
  assert.equal(status.generalPublicVoiceAgeInclusive, true);
  assert.equal(status.childAndYoungPersonSafeguardsRequired, true);
  assert.equal(policy.participation.bindingEligibility, "jurisdiction-specific-law-and-authority");
});

test("Human-needs mission covers core Worldz priorities without treasury authority", () => {
  const status = getGlobalPublicVoiceStatus();
  for (const topic of [
    "food-and-hunger",
    "preventable-disease",
    "essential-healthcare-and-medicines",
    "clean-water-and-sanitation",
    "public-money-and-resource-priorities"
  ]) assert.ok(GLOBAL_HUMAN_NEEDS.includes(topic), topic);
  assert.equal(status.publicMoneyVoiceEnabled, true);
  assert.equal(status.officialBudgetAuthority, false);
  assert.equal(status.treasuryExecution, false);
});

test("Public Voice concern intake is moderated and never auto-published", () => {
  const status = getGlobalPublicVoiceStatus();
  assert.equal(status.concernPublicReadEnabled, true);
  assert.equal(status.moderatedConcernSubmissionEnabled, true);
  assert.equal(status.concernAutoPublicationEnabled, false);
  assert.equal(status.concernHumanReviewRequired, true);
  assert.equal(status.concernSubmissionRateLimitPerIp10m, 3);
  assert.equal(status.structuredPrivateIdentityFieldsAccepted, false);
});
