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

// Canonical hosting contract:
// every static destination must be reached through an authenticated,
// destination-scoped Hostinger account whose visible website root is `/`.
// Never guess or prepend `domains/.../public_html` inside the release model.
// If Hostinger does not present `/` as the intended destination root for the
// authenticated account, production deployment must stop until the account
// scope/root is corrected and re-proved.
export const productionTargets = Object.freeze(deploymentTargets19.map((target) => {
  const expectedTitle = expectedTitles[target.key];
  if (!expectedTitle) throw new Error(`Missing production title contract for ${target.key}`);
  return Object.freeze({
    ...target,
    remoteDir: "/",
    expectedTitle,
    accountScope: "DOMAIN_SCOPED_FTP_ROOT_REQUIRED",
    destinationStatus: "UNVERIFIED_UNTIL_AUTHENTICATED"
  });
}));

export const productionGate = Object.freeze({
  ecosystemDestinations: 19,
  activeOwnedRootDomains: 15,
  staticTargets: productionTargets.length,
  protectedDestinations: protectedDestinations.map(({ domain }) => domain),
  excludedOwnedRootDomains: [...excludedRootDomains],
  deploymentState: "CLEANUP_LOCK",
  hostingDestinationState: "UNVERIFIED",
  productionWriteAllowed: false
});

if (productionTargets.length !== 18) throw new Error(`Expected 18 production targets, got ${productionTargets.length}`);
