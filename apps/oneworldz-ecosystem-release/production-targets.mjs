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

// Physical Hostinger transport destinations. All unchanged targets retain the
// recovered authenticated evidence from run 31925927520 / job 95113450775.
// ImpactBased is intentionally different: JayJayTeamDev created the canonical
// impactbased.oneworldz.com subdomain under OneWorldz using Hostinger's default
// subdomain directory. Hostinger's documented default is a folder named after
// the subdomain inside the parent domain public_html, so the only allowed
// candidate transport root is domains/oneworldz.com/public_html/impactbased.
// It remains WRITE-BLOCKED until the canonical rail re-authenticates that exact
// directory and proves the public hostname maps to it. No fallback path exists.
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
  const publicDomainStatus = isImpactBased
    ? "TLS_CONFIRMED_BY_OWNER_ROOT_REAUTHENTICATION_REQUIRED"
    : "UNCHANGED_FROM_HISTORICAL_TRANSPORT_PROOF";
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
    publicDomainStatus,
    destinationStatus: isImpactBased
      ? "EXACT_NEW_ROOT_REAUTHENTICATION_REQUIRED"
      : "HOSTINGER_DESTINATION_PASS",
    destinationEvidenceRun: isImpactBased ? null : 31925927520,
    destinationEvidenceJob: isImpactBased ? null : 95113450775,
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
  currentDestinationState: "IMPACTBASED_NEW_ONEWORLDZ_SUBDOMAIN_ROOT_REAUTHENTICATION_REQUIRED",
  hostingEvidenceRun: 31925927520,
  hostingEvidenceJob: 95113450775,
  hostingEvidenceTopologySha: "5e4bffb4a40a6968d432ca73e619feb15705859c",
  oneWorldzExactRootReconfirmedRun: 31967183758,
  oneWorldzExactRootReconfirmedJob: 95214059999,
  productionWriteAllowed: false,
  productionWriteBlocker: "IMPACTBASED_EXACT_NEW_HOSTINGER_ROOT_MUST_PASS_CANONICAL_READ_ONLY_PREFLIGHT",
  canonicalDeploymentRail: "ONE_AUTHENTICATED_HOSTINGER_STATIC_FLEET_RAIL"
});

if (productionTargets.length !== 18) throw new Error(`Expected 18 production targets, got ${productionTargets.length}`);
if (Object.keys(verifiedHostingerTransportDirs).length !== 18) throw new Error("Expected 18 recorded Hostinger transport directories");
