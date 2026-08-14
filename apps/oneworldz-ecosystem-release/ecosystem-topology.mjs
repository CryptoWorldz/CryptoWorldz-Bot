import { deploymentTargets as existingTargets, worldz } from "./site-data.mjs";

export const ownedRootDomains = Object.freeze([
  "oneworldz.com",
  "cryptoworldz.xyz",
  "solworldz.xyz",
  "ethworldz.xyz",
  "baseworldz.xyz",
  "bnbworldz.xyz",
  "xrpworldz.xyz",
  "suiworldz.xyz",
  "hyperworldz.xyz",
  "robinworldz.xyz",
  "hodlerworldz.xyz",
  "hodlergalaxy.xyz",
  "purplediamondcrew.com",
  "foodworldz.com",
  "donateworldz.com"
]);

export const excludedRootDomains = Object.freeze([
  "solworld.fun"
]);

export const protectedDestinations = Object.freeze([
  {
    key: "oneworldz",
    domain: "oneworldz.com",
    role: "Global gateway, mission, people, impact and ecosystem directory",
    protected: true
  },
  {
    key: "cryptobotz",
    domain: "cryptobotz.cryptoworldz.xyz",
    role: "ZED / CryptoBotz Command Centre Node application and Mini App",
    protected: true
  }
]);

export const expansionTargets = Object.freeze([
  {
    key: "hodlergalaxy",
    domain: "hodlergalaxy.xyz",
    environment: "hodlergalaxy-production",
    guard: "HODLERGALAXY.XYZ",
    root: "/"
  },
  {
    key: "foodworldz",
    domain: "foodworldz.com",
    environment: "foodworldz-production",
    guard: "FOODWORLDZ.COM",
    root: "/"
  },
  {
    key: "donateworldz",
    domain: "donateworldz.com",
    environment: "donateworldz-production",
    guard: "DONATEWORLDZ.COM",
    root: "/"
  }
]);

export const deploymentTargets19 = Object.freeze([
  ...existingTargets,
  ...expansionTargets
]);

export const ecosystemDestinations = Object.freeze([
  { key: "oneworldz", name: "OneWorldz", domain: "oneworldz.com", type: "root", role: "Global gateway" },
  { key: "cryptoworldz", name: "CryptoWorldz", domain: "cryptoworldz.xyz", type: "root", role: "Crypto headquarters" },
  ...worldz.map((world) => ({ key: world.key, name: world.name, domain: world.domain, type: "root", role: world.purpose })),
  { key: "hodlergalaxy", name: "HodlerGalaxy", domain: "hodlergalaxy.xyz", type: "root", role: "Visual discovery layer across Worldz, projects and communities" },
  { key: "purplediamondcrew", name: "Purple Diamond Crew", domain: "purplediamondcrew.com", type: "root", role: "Legacy and impact history" },
  { key: "foodworldz", name: "FoodWorldz", domain: "foodworldz.com", type: "root", role: "Food support, needs, projects and impact" },
  { key: "donateworldz", name: "DonateWorldz", domain: "donateworldz.com", type: "root", role: "Central donation and support action hub" },
  { key: "impactbased", name: "ImpactBased", domain: "impactbased.oneworldz.com", type: "subdomain", role: "Purpose-driven project and Based.bid pathway" },
  { key: "law-oneworldz", name: "Law.OneWorldz", domain: "law.oneworldz.com", type: "subdomain", role: "Public legal-information pathway" },
  { key: "learn-oneworldz", name: "Learn.OneWorldz", domain: "learn.oneworldz.com", type: "subdomain", role: "Ecosystem learning centre" },
  { key: "cryptobotz", name: "CryptoBotz Command Centre", domain: "cryptobotz.cryptoworldz.xyz", type: "subdomain", role: "Protected ZED / Command Centre application" }
]);

if (ownedRootDomains.length !== 15) throw new Error(`Expected 15 active owned root domains, got ${ownedRootDomains.length}`);
if (ecosystemDestinations.length !== 19) throw new Error(`Expected 19 ecosystem destinations, got ${ecosystemDestinations.length}`);
if (deploymentTargets19.length !== 17) throw new Error(`Expected 17 static build targets, got ${deploymentTargets19.length}`);
