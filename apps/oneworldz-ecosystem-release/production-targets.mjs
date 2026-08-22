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

const hostingerTransportDirs = Object.freeze({
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
  const hostingerTransportDir = hostingerTransportDirs[target.key];
  if (!expectedTitle) throw new Error(`Missing production title for ${target.key}`);
  if (!identityText) throw new Error(`Missing production identity for ${target.key}`);
  if (identityImage === undefined) throw new Error(`Missing image identity for ${target.key}`);
  if (!hostingerTransportDir) throw new Error(`Missing Hostinger destination for ${target.key}`);
  return Object.freeze({
    ...target,
    remoteDir: "/",
    hostingerTransportDir,
    expectedTitle,
    requiredIdentityText: identityText,
    requiredIdentityImage: identityImage,
    productionWriteAllowed: true
  });
}));

export const productionGate = Object.freeze({
  staticTargets: productionTargets.length,
  protectedDestinations: protectedDestinations.map(({ domain }) => domain),
  excludedOwnedRootDomains: [...excludedRootDomains],
  productionWriteAllowed: true,
  canonicalDeploymentRail: ".github/workflows/website-images-direct.yml"
});
