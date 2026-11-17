"use strict";
/**
 * WORLDZ launch/readiness decision engine.
 * No signing, wallet custody or network calls. A UI mode never grants chain authority.
 */
const fs = require("node:fs");
const path = require("node:path");
const REGISTRY = path.join(__dirname, "..", "worldzpad-omnichain", "chain-registry.v1.json");
const MODE_FIELDS = Object.freeze({
  beginner: Object.freeze(["token_details", "chain_selection", "wallet_connection", "fees_and_risks", "proof_preview"]),
  intermediate: Object.freeze(["token_details", "chain_selection", "wallet_connection", "fees_and_risks", "proof_preview", "supply_distribution", "venue_selection", "liquidity_plan", "vesting"]),
  advanced: Object.freeze(["token_details", "chain_selection", "wallet_connection", "fees_and_risks", "proof_preview", "supply_distribution", "venue_selection", "liquidity_plan", "vesting", "authority_controls", "native_chain_options", "fee_router_receipts", "simulation_logs"])
});
const CHAIN_ORDER = Object.freeze(["solana", "xrpl", "base", "ethereum", "bnb", "sui", "hyperevm", "robinhood"]);
const OWNER_TOKENS = Object.freeze(["WORLDZ", "SPARKY"]);
function loadRegistry() { return JSON.parse(fs.readFileSync(REGISTRY, "utf8")); }
function validateMode(mode) {
  if (!Object.hasOwn(MODE_FIELDS, mode)) throw new Error("Unsupported WORLDZ launch experience mode");
  return MODE_FIELDS[mode];
}
function chainReadiness(chain, mode = "beginner", registry = loadRegistry()) {
  const fields = validateMode(mode);
  const row = registry.chains?.[chain];
  if (!row) throw new Error("Chain is not registered in canonical WORLDZ adapter registry");
  return Object.freeze({
    chain, order: CHAIN_ORDER.indexOf(chain) + 1, mode, fields,
    chainStatus: row.adapterStatus || "UNVERIFIED",
    launchStandard: row.tokenModel,
    canPreview: true,
    // A registry field is necessary but never sufficient for live launch.
    tokenMintableNow: false,
    publicMarketLaunchableNow: false,
    externalAuditRequired: true,
    mainnetExecutionEnabled: false,
    blockers: Object.freeze([
      "verified chain-native token mint/issuer and authority proof",
      "signed wallet approval and transaction simulation",
      "independent chain-specific market/fee/liquidity proof",
      "security and legal/compliance release review",
      "explicit human authorisation of the specific mainnet transaction"
    ])
  });
}
function ownerTokenReadiness(symbol, { canonicalMint = null, allocationApproved = false, signingProof = false, reconciledPolicies = false } = {}) {
  const normalized = String(symbol || "").replace(/^\$/, "").toUpperCase();
  if (!OWNER_TOKENS.includes(normalized)) throw new Error("Only WORLDZ/SPARKY owner-mint plans may use this preparation gate");
  const ready = Boolean(canonicalMint && allocationApproved && signingProof && reconciledPolicies);
  return Object.freeze({
    symbol: normalized, state: ready ? "READY_FOR_INDEPENDENT_ONCHAIN_VERIFICATION" : "PREPARATION_ONLY",
    mintSubmitted: false, tokenCreated: false, signedTransaction: false,
    blockers: ready ? ["explicit owner approval and on-chain verification required"] :
      ["reconcile competing mint/supply/allocation PRs and legacy symbol references", "verify canonical chain and token identity", "verify available signing wallet", "approve supply, destinations and token metadata", "complete testnet and transaction safety proof"]
  });
}
function allChains(mode = "beginner", registry = loadRegistry()) {
  return CHAIN_ORDER.map(chain => chainReadiness(chain, mode, registry));
}
module.exports = { CHAIN_ORDER, MODE_FIELDS, OWNER_TOKENS, chainReadiness, allChains, ownerTokenReadiness };
