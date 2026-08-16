import { deploymentTargets19, excludedRootDomains, protectedDestinations } from "./ecosystem-topology.mjs";

const expectedTitles = Object.freeze({
  oneworldz: "OneWorldz | OneWorldz One Vision",
  cryptoworldz: "CryptoWorldz | One World • One Mission",
  solworldz: "SolWorldz | One World • One Mission",
  ethworldz: "EthWorldz | One World • One Mission",
  baseworldz: "BaseWorldz | One World • One Mission",
  bnbworldz: "BNBWorldz | One World • One Mission",
  xrpworldz: "XRPWorldz | One World • One Mission",
  suiworldz: "SuiWorldz | One World • One Mission",
  hyperworldz: "HyperWorldz | One World • One Mission",
  robinworldz: "RobinWorldz | One World • One Mission",
  hodlerworldz: "HodlerWorldz | One World • One Mission",
  purplediamondcrew: "Purple Diamond Crew | On the Ground",
  impactbased: "ImpactBased | Purpose-Driven Launch Board",
  "law-oneworldz": "Law.OneWorldz | People-First Public Ideas",
  "learn-oneworldz": "Learn.OneWorldz | Learn • Share • Do",
  hodlergalaxy: "HodlerGalaxy | Explore the OneWorldz Ecosystem",
  foodworldz: "FoodWorldz | See the Need • Support the Mission",
  donateworldz: "DonateWorldz | Choose a Purpose • Support Clearly"
});

// Hostinger destination evidence was recovered from successful authenticated
// preflight run 31925927520 / job 95113450775. That run proved all 18 exact
// Hostinger roots against topology SHA 5e4bffb4a40a6968d432ca73e619feb15705859c,
// which is still the current topology SHA. OneWorldz was subsequently
// re-confirmed by successful exact-root deployment job 95214059999.
//
// `remoteDir: "/"` is the clean deployment abstraction: the single future rail
// must use a credential scoped/chrooted to the already-proven website root. The
// active contract does not repeat physical public_html paths or probe siblings.
export const productionTargets = Object.freeze(deploymentTargets19.map((target) => {
  const expectedTitle = expectedTitles[target.key];
  if (!expectedTitle) throw new Error(`Missing production title contract for ${target.key}`);
  return Object.freeze({
    ...target,
    remoteDir: "/",
    expectedTitle,
    accountScope: "EXACT_HOSTINGER_WEBSITE_ROOT_PROVEN",
    destinationStatus: "HOSTINGER_DESTINATION_PASS",
    destinationEvidenceRun: 31925927520,
    destinationEvidenceJob: 95113450775,
    productionWriteAllowed: false
  });
}));

export const productionGate = Object.freeze({
  ecosystemDestinations: 19,
  activeOwnedRootDomains: 15,
  staticTargets: productionTargets.length,
  protectedDestinations: protectedDestinations.map(({ domain }) => domain),
  excludedOwnedRootDomains: [...excludedRootDomains],
  deploymentState: "TOTAL_DEPLOYMENT_PLAN_ACTIVE",
  ownerAuthority: "PERFORM_TOTAL_DEPLOYMENT_PLAN",
  repeatedOwnerApprovalRequired: false,
  hostingDestinationState: "PASS_AUTHENTICATED_18_ROOT_PROOF_RECOVERED",
  hostingEvidenceRun: 31925927520,
  hostingEvidenceJob: 95113450775,
  hostingEvidenceTopologySha: "5e4bffb4a40a6968d432ca73e619feb15705859c",
  oneWorldzExactRootReconfirmedRun: 31967183758,
  oneWorldzExactRootReconfirmedJob: 95214059999,
  productionWriteAllowed: false,
  productionWriteBlocker: "CURRENT_BUILD_AND_PREVIEW_VISUAL_PASS_REQUIRED",
  canonicalDeploymentRail: "ONE_AUTHENTICATED_HOSTINGER_STATIC_FLEET_RAIL"
});

if (productionTargets.length !== 18) throw new Error(`Expected 18 production targets, got ${productionTargets.length}`);
