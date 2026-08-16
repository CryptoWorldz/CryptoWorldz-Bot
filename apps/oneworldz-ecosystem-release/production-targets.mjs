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

// Exact Hostinger transport destinations authenticated by the successful
// read-only 18-root proof (run 31925927520 / job 95113450775). These are
// transport-layer locations for the existing shared Hostinger FTP credential.
// They are NOT public URL roots and they must never be dynamically guessed.
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
  impactbased: "domains/cryptoworldz.xyz/public_html/impactbased",
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
  return Object.freeze({
    ...target,
    remoteDir: "/",
    hostingerTransportDir,
    expectedTitle,
    requiredIdentityText: identityText,
    requiredIdentityImage: identityImage,
    accountScope: "EXISTING_SHARED_HOSTINGER_ACCOUNT_EXACT_VERIFIED_DIR",
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
if (Object.keys(verifiedHostingerTransportDirs).length !== 18) throw new Error("Expected 18 authenticated Hostinger transport directories");
