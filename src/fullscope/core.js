"use strict";

const MAX_TOKENS_PER_CHAIN = 20;

const SUPPORTED_CHAINS = Object.freeze([
  Object.freeze({ key: "solana", label: "Solana", family: "solana" }),
  Object.freeze({ key: "xrpl", label: "XRP Ledger", family: "xrpl" }),
  Object.freeze({ key: "base", label: "Base", family: "evm" }),
  Object.freeze({ key: "ethereum", label: "Ethereum", family: "evm" }),
  Object.freeze({ key: "bnb", label: "BNB Smart Chain", family: "evm" }),
  Object.freeze({ key: "sui", label: "Sui", family: "sui" }),
  Object.freeze({ key: "hyperevm", label: "HyperEVM", family: "evm" }),
  Object.freeze({ key: "robinhood", label: "Robinhood Chain", family: "evm" })
]);

const FULLSCOPE_MODULES = Object.freeze([
  "watch", "trade", "invest", "liquidity", "lock", "vesting",
  "alerts", "auto", "proof", "votes-centre", "govern"
]);

const VOTING_NAMESPACES = Object.freeze({
  popularity: Object.freeze({
    brand: "Worldz Votes Centre™",
    purpose: "token-popularity",
    commands: Object.freeze(["worldzvotes", "tokenvote", "worldztrending", "worldzrankings"])
  }),
  governance: Object.freeze({
    brand: "WorldzGovern™",
    purpose: "dao-governance",
    commands: Object.freeze(["worldzgovern", "governproposals", "governvote", "governdelegate"])
  })
});

const FINANCIAL_ACTIONS = new Set(["buy", "sell", "invest", "add_liquidity", "remove_liquidity", "lock", "vest", "claim"]);

function normalizeChain(value) {
  const key = String(value || "").trim().toLowerCase();
  return SUPPORTED_CHAINS.find((chain) => chain.key === key) || null;
}

function assertVotingSeparation() {
  const popular = new Set(VOTING_NAMESPACES.popularity.commands);
  const governance = new Set(VOTING_NAMESPACES.governance.commands);
  for (const command of popular) {
    if (governance.has(command)) throw new Error(`Voting namespace collision: /${command}`);
  }
  if (VOTING_NAMESPACES.popularity.purpose === VOTING_NAMESPACES.governance.purpose) {
    throw new Error("Popularity and governance purposes must remain distinct.");
  }
  return true;
}

function validateTokenRegistration(input = {}) {
  const chain = normalizeChain(input.chainKey);
  if (!chain) throw new Error("Unsupported WorldzFullScope chain.");
  const name = String(input.name || "").trim();
  const symbol = String(input.symbol || "").trim().toUpperCase();
  if (!name || !symbol) throw new Error("Token name and symbol are required.");
  if (symbol.length > 24) throw new Error("Token symbol is too long.");
  return {
    chainKey: chain.key,
    family: chain.family,
    name,
    symbol,
    contractAddress: input.contractAddress ? String(input.contractAddress).trim() : null,
    status: String(input.status || "planned").trim().toLowerCase()
  };
}

function buildActionIntent(input = {}) {
  const actionType = String(input.actionType || "").trim().toLowerCase();
  if (!FINANCIAL_ACTIONS.has(actionType)) throw new Error("Unsupported FullScope financial action.");
  const chain = normalizeChain(input.chainKey);
  if (!chain) throw new Error("Unsupported WorldzFullScope chain.");
  if (!input.tokenId) throw new Error("tokenId is required.");
  return Object.freeze({
    actionType,
    chainKey: chain.key,
    tokenId: String(input.tokenId),
    state: "prepared",
    custody: "external-wallet",
    walletEntryPoint: "first-party-worldz-website",
    requiresLiveWalletVerification: true,
    requiresExactTransactionReview: true,
    requiresSimulation: true,
    requiresSignature: true,
    autoBroadcast: false,
    mainnetExecutionEnabled: false
  });
}

function capacitySummary(activeByChain = {}) {
  return SUPPORTED_CHAINS.map((chain) => {
    const active = Math.max(0, Number(activeByChain[chain.key] || 0));
    return {
      ...chain,
      active,
      capacity: MAX_TOKENS_PER_CHAIN,
      remaining: Math.max(0, MAX_TOKENS_PER_CHAIN - active)
    };
  });
}

assertVotingSeparation();

module.exports = {
  MAX_TOKENS_PER_CHAIN,
  SUPPORTED_CHAINS,
  FULLSCOPE_MODULES,
  VOTING_NAMESPACES,
  normalizeChain,
  validateTokenRegistration,
  buildActionIntent,
  capacitySummary,
  assertVotingSeparation
};
