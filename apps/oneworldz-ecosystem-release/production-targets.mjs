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

const requiredIdentityText = Object.freeze({
  oneworldz: "OneWorldz",
  cryptoworldz: "CryptoWorldz",
  solworldz: "SolWorldz",
  ethworldz: "EthWorldz",
  baseworldz: "BaseWorldz",
  bnbworldz: "BNBWorldz",
  xrpworldz: "XRPWorldz",
  suiworldz: "SuiWorldz",
  hyperworldz: "HyperWorldz",
  robinworldz: "RobinWorldz",
  hodlerworldz: "HodlerWorldz",
  purplediamondcrew: "Purple Diamond Crew",
  impactbased: "ImpactBased",
  "law-oneworldz": "Law.OneWorldz",
  "learn-oneworldz": "Learn.OneWorldz",
  hodlergalaxy: "HodlerGalaxy",
  foodworldz: "FoodWorldz",
  donateworldz: "DonateWorldz"
});

// Pipe-separated alternatives are intentional responsive identities: at least
// one approved token must be present in the actual image selected by each
// desktop/mobile viewport. Empty means the page uses a deliberate CSS identity
// rather than an image asset.
const requiredIdentityImage = Object.freeze({
  oneworldz: "oneworldz-master|little-legend",
  cryptoworldz: "zed-command-centre|blockchain-portal",
  solworldz: "solworldz",
  ethworldz: "ethworldz",
  baseworldz: "baseworldz",
  bnbworldz: "bnbworldz",
  xrpworldz: "xrpworldz",
  suiworldz: "suiworldz",
  hyperworldz: "hyperworldz",
  robinworldz: "robinworldz",
  hodlerworldz: "",
  purplediamondcrew: "banner.png|hope-chest|action-team",
  impactbased: "impactbased",
  "law-oneworldz": "robin-hood-law",
  "learn-oneworldz": "oneworldz-gpt|little-legend",
  hodlergalaxy: "hodlergalaxy-hero",
  foodworldz: "foodworldz-hero",
  donateworldz: "donateworldz-hero"
});

// Physical Hostinger transport destinations. Step 4 freshly re-authenticated
// all 18 exact folders read-only in run 31987973244 / job 95266212497.
// Seventeen public hosts byte-matched robots.txt to the authenticated folder.
// ImpactBased used the newly created Hostinger default subdomain root and passed
// authenticated FTPS cd/list/get plus public HTTPS 200 composite proof.
// No fallback path exists and the old CryptoWorldz ImpactBased folder remains
// superseded.
const verifiedHostingerTransportDirs = Object.freeze({
  oneworldz: "domains/oneworldz.com/public_html",
  cryptoworldz: "domains/cryptoworldz.xyz/public_html",
  solworldz: "domains/solworldz.xyz/public_html",
  ethworldz: "domains/ethworldz.xyz/public_html",
  baseworldz: "domains/baseworldz.xyz/public_html",
  bnbworldz: "domains/bnbworldz.xyz/public_html",
  xrpworldz: "domains/xrpworldz.xyz/public_html",
  suiworldz: "domains/suiworldz.xyz/public_html",
  hyperworldz: "domains/hyperworldz.xyz/public_html",
  robinworldz: "domains/robinworldz.xyz/public_html",
  hodlerworldz: "domains/hodlerworldz.xyz/public_html",
  purplediamondcrew: "domains/purplediamondcrew.com/public_html",
  impactbased: "domains/oneworldz.com/public_html/impactbased",
  "law-oneworldz": "domains/oneworldz.com/public_html/law",
  "learn-oneworldz": "domains/oneworldz.com/public_html/learn",
  hodlergalaxy: "domains/hodlergalaxy.xyz/public_html",
  foodworldz: "domains/foodworldz.com/public_html",
  donateworldz: "domains/donateworldz.com/public_html"
});

export const productionTargets = Object.freeze(deploymentTargets19.map((target) => {
  const expectedTitle = expectedTitles[target.key];
  const identityText = requiredIdentityText[target.key];
  const identityImage = requiredIdentityImage[target.key];
  const hostingerTransportDir = verifiedHostingerTransportDirs[target.key];
  if (!expectedTitle) throw new Error(`Missing production title contract for ${target.key}`);
  if (!identityText) throw new Error(`Missing required identity text for ${target.key}`);
  if (identityImage === undefined) throw new Error(`Missing required identity-image contract for ${target.key}`);
  if (!hostingerTransportDir) throw new Error(`Missing authenticated Hostinger transport directory for ${target.key}`);
  const isImpactBased = target.key === "impactbased";
  return Object.freeze({
    ...target,
    remoteDir: "/",
    hostingerTransportDir,
    expectedTitle,
    requiredIdentityText: identityText,
    requiredIdentityImage: identityImage,
    accountScope: "EXISTING_SHARED_HOSTINGER_ACCOUNT_EXACT_RECORDED_DIR",
    historicalTransportStatus: isImpactBased
      ? "SUPERSEDED_BY_CANONICAL_ONEWORLDZ_SUBDOMAIN"
      : "PASS_AUTHENTICATED_18_ROOT_PROOF_RECOVERED",
    publicDomainStatus: isImpactBased
      ? "PASS_HTTP_200_COMPOSITE_NEW_DEFAULT_SUBDOMAIN_ROOT_PROOF"
      : "PASS_ROBOTS_BYTE_MATCH_FRESH_STEP_4",
    destinationStatus: isImpactBased
      ? "HOSTINGER_DESTINATION_PASS_COMPOSITE_NEW_ROOT_PROOF"
      : "HOSTINGER_DESTINATION_PASS",
    destinationEvidenceRun: 31987973244,
    destinationEvidenceJob: 95266212497,
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
  historicalTransportEvidenceState: "PASS_AUTHENTICATED_17_UNCHANGED_ROOTS_PLUS_ONE_SUPERSEDED_IMPACTBASED_ROOT",
  currentDestinationState: "PASS_AUTHENTICATED_READ_ONLY_18_TARGET_REVALIDATION",
  hostingEvidenceRun: 31987973244,
  hostingEvidenceJob: 95266212497,
  hostingEvidenceArtifact: 9274418556,
  hostingEvidenceArtifactDigest: "sha256:d4eaa90ebe29e33bcdf8c156e7c82c96c91995fdb9e8d0af916f9eaa0b076792",
  historicalHostingEvidenceRun: 31925927520,
  historicalHostingEvidenceJob: 95113450775,
  hostingEvidenceTopologySha: "5e4bffb4a40a6968d432ca73e619feb15705859c",
  oneWorldzExactRootReconfirmedRun: 31967183758,
  oneWorldzExactRootReconfirmedJob: 95214059999,
  productionWriteAllowed: false,
  productionWriteBlocker: "REQUIRES_EXACT_APPROVED_STATIC_TREE_AND_EXECUTION_PHASE_DEPLOY",
  canonicalDeploymentRail: "ONE_AUTHENTICATED_HOSTINGER_STATIC_FLEET_RAIL"
});

if (productionTargets.length !== 18) throw new Error(`Expected 18 production targets, got ${productionTargets.length}`);
if (Object.keys(verifiedHostingerTransportDirs).length !== 18) throw new Error("Expected 18 recorded Hostinger transport directories");
