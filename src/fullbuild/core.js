"use strict";

const FULLBUILD_BRAND = "WorldzFullBuild™";
const FULLBUILD_SCHEMA = "WORLDZ-FULLBUILD-V1";

const REQUIRED_SUBSYSTEMS = Object.freeze([
  "command-centre",
  "launchpad",
  "omnichain",
  "fullscope",
  "proof",
  "auto",
  "grace",
  "recap",
  "legacy-flywheel",
  "treasury"
]);

const REQUIRED_FULLSCOPE_MODULES = Object.freeze([
  "WorldzWatch™",
  "WorldzTrade™",
  "WorldzInvest™",
  "WorldzLock™",
  "WorldzVest™",
  "WorldzAlert™",
  "WorldzAuto™",
  "WorldzProof™",
  "Worldz Votes Centre™",
  "WorldzGovern™"
]);

const VOTING_BOUNDARIES = Object.freeze({
  popularity: Object.freeze({
    brand: "Worldz Votes Centre™",
    command: "/worldzvotes",
    mayExecuteGovernance: false
  }),
  governance: Object.freeze({
    brand: "WorldzGovern™",
    command: "/worldzgovern",
    mayAffectPopularityRanking: false
  })
});

function validateFullBuildContract(contract) {
  if (!contract || contract.schema !== FULLBUILD_SCHEMA) throw new Error("Invalid WorldzFullBuild schema.");
  if (contract.brand !== FULLBUILD_BRAND) throw new Error("Invalid WorldzFullBuild brand.");

  const subsystemKeys = new Set((contract.requiredSubsystems || []).map((item) => item.key));
  for (const key of REQUIRED_SUBSYSTEMS) {
    if (!subsystemKeys.has(key)) throw new Error(`WorldzFullBuild missing required subsystem: ${key}`);
  }

  const modules = new Set(contract.fullScope && contract.fullScope.requiredModules || []);
  for (const moduleName of REQUIRED_FULLSCOPE_MODULES) {
    if (!modules.has(moduleName)) throw new Error(`WorldzFullBuild missing FullScope module: ${moduleName}`);
  }

  if (contract.fullScope.required !== true) throw new Error("WorldzFullScope must remain mandatory.");
  if (contract.fullScope.chainCount !== 8 || contract.fullScope.maxTokensPerChain !== 20) {
    throw new Error("WorldzFullScope capacity contract changed without an explicit FullBuild version change.");
  }
  if (contract.fullScope.initialTokenEnvironmentCapacity !== 160) throw new Error("WorldzFullScope capacity must equal 160.");

  const popularity = contract.votingSeparation && contract.votingSeparation.popularity;
  const governance = contract.votingSeparation && contract.votingSeparation.governance;
  if (!popularity || !governance || popularity.brand === governance.brand) throw new Error("Voting systems are not separated.");
  if (popularity.governanceAuthority !== false) throw new Error("Popularity votes cannot gain governance authority.");
  if (governance.popularityRankingEffect !== false) throw new Error("Governance votes cannot alter popularity rankings.");

  const execution = contract.executionPolicy || {};
  if (execution.defaultMainnetExecution !== false) throw new Error("FullBuild mainnet must default OFF.");
  if (execution.externalWalletSignatureRequired !== true) throw new Error("External wallet signature boundary is required.");
  if (execution.privateKeysInTelegramDatabase !== false) throw new Error("Telegram private-key custody is prohibited.");
  if (execution.perChainReleaseGate !== true || execution.worldzProofRequired !== true) {
    throw new Error("Per-chain release and WorldzProof gates are required.");
  }
  return true;
}

function summary() {
  return Object.freeze({
    brand: FULLBUILD_BRAND,
    subsystemCount: REQUIRED_SUBSYSTEMS.length,
    fullScopeModules: REQUIRED_FULLSCOPE_MODULES.length,
    chainCount: 8,
    tokenSlotsPerChain: 20,
    initialTokenEnvironmentCapacity: 160,
    mainnetDefault: false
  });
}

module.exports = {
  FULLBUILD_BRAND,
  FULLBUILD_SCHEMA,
  REQUIRED_SUBSYSTEMS,
  REQUIRED_FULLSCOPE_MODULES,
  VOTING_BOUNDARIES,
  validateFullBuildContract,
  summary
};
