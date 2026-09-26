"use strict";

const CONTRACT = require("../../worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json");

const GENESIS_FOUR = Object.freeze([
  Object.freeze({ order: 1, name: "WORLDZ", symbol: "WLDZ", supply: 100000000 }),
  Object.freeze({ order: 2, name: "REVIVE", symbol: "RVIV", supply: 200000000 }),
  Object.freeze({ order: 3, name: "PHENIX", symbol: "PNEX", supply: 250000000 }),
  Object.freeze({ order: 4, name: "MIRACLE", symbol: "MRCL", supply: 348000000 })
]);

function validateFullBuildContract(contract = CONTRACT) {
  if (!contract || contract.schema !== "WORLDZ-FULLBUILD-V1") throw new Error("Invalid WorldzFullBuild schema.");
  if (contract.brand !== "WorldzFullBuild™") throw new Error("Invalid WorldzFullBuild brand.");

  const continuity = contract.projectContinuity || {};
  if (continuity.scope !== "PROJECT_RELEVANT_DECISIONS_AND_LESSONS_ACROSS_WORLDZ_PROJECT_CHATS") {
    throw new Error("Project-chat inheritance is not active.");
  }
  if (continuity.latestOwnerDirective?.state !== "INCORPORATED_INTO_WORLDZFULLBUILD_PARENT") {
    throw new Error("Latest whole-project directive is not incorporated.");
  }

  const genesis = continuity.genesisFour || [];
  for (const expected of GENESIS_FOUR) {
    const actual = genesis.find((row) => row.order === expected.order);
    if (!actual || actual.token !== expected.name || actual.symbol !== expected.symbol || Number(actual.supply) !== expected.supply) {
      throw new Error(`Genesis Four mismatch at #${expected.order}.`);
    }
  }

  const scope = contract.architecture?.fullScope;
  if (!scope?.required || scope.chainCount !== 8 || scope.maxTokensPerChain !== 20 || scope.initialTokenEnvironmentCapacity !== 160) {
    throw new Error("WorldzFullScope capacity contract changed.");
  }

  const pop = contract.votingSeparation?.popularity;
  const gov = contract.votingSeparation?.governance;
  if (!pop || !gov || pop.brand === gov.brand || pop.governanceAuthority !== false || gov.popularityRankingEffect !== false) {
    throw new Error("Popularity/governance separation is invalid.");
  }

  const execution = contract.executionIntegration || {};
  if (execution.fullScopeMainnetDefault !== false || execution.externalWalletSignatureRequired !== true || execution.telegramPrivateKeyCustody !== false) {
    throw new Error("WorldzFullBuild execution boundary changed.");
  }

  const split = contract.projectWideIntegration?.feeAndFlywheel?.reviveProposedSplitPercent || {};
  const total = Number(split.creator||0)+Number(split.referrer||0)+Number(split.legacyFlywheel||0)+Number(split.worldzLaunchPad||0)+Number(split.oneWorldzImpact||0);
  if (contract.projectWideIntegration?.feeAndFlywheel?.revivePilotGrossFeeBps !== 75 || total !== 100) {
    throw new Error("REVIVE pilot fee contract changed.");
  }

  return true;
}

function summary(contract = CONTRACT) {
  validateFullBuildContract(contract);
  return Object.freeze({
    brand: contract.brand,
    status: contract.projectWideIntegration?.currentDirectiveState || "PROJECT_INHERITANCE_ACTIVE",
    chains: contract.architecture.fullScope.chainCount,
    tokenSlotsPerChain: contract.architecture.fullScope.maxTokensPerChain,
    environments: contract.architecture.fullScope.initialTokenEnvironmentCapacity,
    genesisFour: GENESIS_FOUR,
    mainnetDefault: contract.executionIntegration.fullScopeMainnetDefault,
    worldzLinksCommand: contract.commandPaths.worldzLinks
  });
}

module.exports = { CONTRACT, GENESIS_FOUR, validateFullBuildContract, summary };
