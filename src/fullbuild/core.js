"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FULLBUILD_BRAND = "WorldzFullBuild™";
const FULLBUILD_SCHEMA = "WORLDZ-FULLBUILD-V1";
const CONTRACT_PATH = path.join(__dirname, "../../worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json");

const REQUIRED_FULLSCOPE_MODULES = Object.freeze([
  "WorldzWatch™","WorldzTrade™","WorldzInvest™","WorldzLock™","WorldzVest™",
  "WorldzAlert™","WorldzAuto™","WorldzProof™","Worldz Votes Centre™","WorldzGovern™"
]);

function loadContract() {
  return JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));
}

function validateFullBuildContract(contract = loadContract()) {
  if (contract.schema !== FULLBUILD_SCHEMA || contract.brand !== FULLBUILD_BRAND) {
    throw new Error("Invalid WorldzFullBuild contract.");
  }
  const architecture = contract.architecture || {};
  const required = new Set(architecture.requiredSubsystems || []);
  if (!required.has("WorldzFullScope™")) throw new Error("WorldzFullScope must remain required in FullBuild.");

  const scope = architecture.fullScope || {};
  if (scope.required !== true) throw new Error("WorldzFullScope is not marked required.");
  if (scope.chainCount !== 8 || scope.maxTokensPerChain !== 20 || scope.initialTokenEnvironmentCapacity !== 160) {
    throw new Error("WorldzFullScope capacity contract changed without FullBuild version review.");
  }
  const modules = new Set(scope.requiredModules || []);
  for (const moduleName of REQUIRED_FULLSCOPE_MODULES) {
    if (!modules.has(moduleName)) throw new Error(`Missing required FullScope module: ${moduleName}`);
  }

  const pop = contract.votingSeparation && contract.votingSeparation.popularity;
  const gov = contract.votingSeparation && contract.votingSeparation.governance;
  if (!pop || !gov || pop.brand === gov.brand) throw new Error("Voting systems are not separated.");
  if (pop.governanceAuthority !== false) throw new Error("Popularity votes cannot gain governance authority.");
  if (gov.popularityRankingEffect !== false) throw new Error("Governance votes cannot alter popularity rankings.");

  const execution = contract.executionIntegration || {};
  if (execution.fullScopeMainnetDefault !== false) throw new Error("FullScope mainnet must default OFF.");
  if (execution.externalWalletSignatureRequired !== true) throw new Error("External wallet signature is required.");
  if (execution.telegramPrivateKeyCustody !== false) throw new Error("Telegram private-key custody is prohibited.");
  if (execution.perChainReleaseGate !== true || execution.worldzProofRequired !== true) {
    throw new Error("Per-chain and WorldzProof release gates are required.");
  }
  return true;
}

function summary() {
  const contract = loadContract();
  validateFullBuildContract(contract);
  return Object.freeze({
    brand: contract.brand,
    fullScopeRequired: contract.architecture.fullScope.required,
    chainCount: contract.architecture.fullScope.chainCount,
    tokensPerChain: contract.architecture.fullScope.maxTokensPerChain,
    capacity: contract.architecture.fullScope.initialTokenEnvironmentCapacity,
    mainnetDefault: contract.executionIntegration.fullScopeMainnetDefault
  });
}

module.exports = { FULLBUILD_BRAND, FULLBUILD_SCHEMA, REQUIRED_FULLSCOPE_MODULES, loadContract, validateFullBuildContract, summary };
