"use strict";

const POLICY = require("../../config/worldz-votes/global-public-voice.v1.json");

const GLOBAL_HUMAN_NEEDS = Object.freeze([
  "food-and-hunger",
  "preventable-disease",
  "essential-healthcare-and-medicines",
  "clean-water-and-sanitation",
  "safe-shelter-and-housing",
  "education-and-opportunity",
  "public-money-and-resource-priorities"
]);

function getGlobalPublicVoiceStatus() {
  return Object.freeze({
    version: POLICY.version,
    brand: POLICY.brand,
    scope: POLICY.scope,
    status: POLICY.status,
    worldwide: POLICY.nonBindingPublicVoiceOpenWorldwide === true,
    countryTerritoryAllowlist: POLICY.countryTerritoryAllowlist,
    bindingVotingEnabled: POLICY.bindingVotingEnabled === true,
    generalPublicVoiceAgeInclusive: POLICY.participation.generalPublicVoiceAgeInclusive === true,
    childAndYoungPersonSafeguardsRequired: POLICY.participation.childAndYoungPersonSafeguardsRequired === true,
    geographicExclusionAllowed: POLICY.participation.geographicExclusionAllowed === true,
    demographicVoteWeightingAllowed:
      POLICY.participation.raceOrEthnicityWeightingAllowed === true ||
      POLICY.participation.nationalityWeightingAllowed === true,
    wealthOrTokenWeightingAllowed:
      POLICY.participation.wealthWeightingAllowed === true ||
      POLICY.participation.tokenWeightingAllowed === true,
    publicMoneyVoiceEnabled: POLICY.publicMoneyVoice.enabled === true,
    officialBudgetAuthority: POLICY.publicMoneyVoice.officialBudgetAuthority === true,
    treasuryExecution: POLICY.publicMoneyVoice.treasuryExecution === true,
    humanNeedsMission: POLICY.humanNeedsMission.statement,
    humanNeedsTopics: Object.freeze([...GLOBAL_HUMAN_NEEDS]),
    examplesOfWorldwideReach: Object.freeze([...(POLICY.examplesOfWorldwideReach || [])])
  });
}

module.exports = { POLICY, GLOBAL_HUMAN_NEEDS, getGlobalPublicVoiceStatus };
