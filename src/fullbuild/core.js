"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FULLBUILD_BRAND = "WorldzFullBuild™";
const CONTRACT_PATH = path.join(__dirname, "../../worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json");
const REQUIRED_FULLSCOPE_MODULES = Object.freeze([
  "WorldzWatch™","WorldzTrade™","WorldzInvest™","WorldzLock™","WorldzVest™",
  "WorldzAlert™","WorldzAuto™","WorldzProof™","Worldz Votes Centre™","WorldzGovern™"
]);

function loadContract() {
  return JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));
}

function validateFullBuildContract(contract = loadContract()) {
  if (contract.schema !== "WORLDZ-FULLBUILD-V1" || contract.brand !== FULLBUILD_BRAND) throw new Error("Invalid WorldzFullBuild contract.");
  const integration = contract.projectWideIntegration || {};
  if (integration.currentDirectiveState !== "WHOLE_PROJECT_AND_PROJECT_CHAT_INHERITANCE_ACTIVE") throw new Error("Whole-project WorldzFullBuild inheritance is not active.");
  if (integration.latestOwnerDirective?.state !== "INCORPORATED") throw new Error("Latest owner incorporation directive is not locked.");
  if (contract.commandPaths?.worldzLinks !== "/worldzlinks") throw new Error("WorldzLinkz command is not inherited by WorldzFullBuild.");
  const scope = contract.architecture && contract.architecture.fullScope;
  if (!scope || scope.required !== true) throw new Error("WorldzFullScope must remain required.");
  if (scope.chainCount !== 8 || scope.maxTokensPerChain !== 20 || scope.initialTokenEnvironmentCapacity !== 160) throw new Error("WorldzFullScope capacity contract changed.");
  const modules = new Set(scope.requiredModules || []);
  for (const moduleName of REQUIRED_FULLSCOPE_MODULES) if (!modules.has(moduleName)) throw new Error(`Missing FullScope module: ${moduleName}`);
  const pop = contract.votingSeparation && contract.votingSeparation.popularity;
  const gov = contract.votingSeparation && contract.votingSeparation.governance;
  if (!pop || !gov || pop.governanceAuthority !== false || gov.popularityRankingEffect !== false) throw new Error("Voting separation invalid.");
  const execution = contract.executionIntegration || {};
  if (execution.fullScopeMainnetDefault !== false || execution.externalWalletSignatureRequired !== true || execution.telegramPrivateKeyCustody !== false) throw new Error("FullBuild execution boundary invalid.");
  return true;
}

function summary() {
  const contract = loadContract();
  validateFullBuildContract(contract);
  return {
    brand: contract.brand,
    chains: contract.architecture.fullScope.chainCount,
    tokensPerChain: contract.architecture.fullScope.maxTokensPerChain,
    capacity: contract.architecture.fullScope.initialTokenEnvironmentCapacity,
    projectInheritance: contract.projectWideIntegration.currentDirectiveState,
    worldzLinks: contract.commandPaths.worldzLinks
  };
}

module.exports = { FULLBUILD_BRAND, REQUIRED_FULLSCOPE_MODULES, loadContract, validateFullBuildContract, summary };
