"use strict";

const crypto = require("node:crypto");
const POLICY = require("../worldzpad-mainnet/payments/worldzpay-treasury.v1.json");
const TREASURY_PROFILES = require("../launchpad.cryptoworldz.xyz/worldz-app/core/treasury-profiles.json");
const {
  eligibleSource,
  buildLegacyCoreAllocation
} = require("./worldz-core-legacy-revenue");
const { assessProviderReadiness } = require("./worldzpay-providers");

function requiredText(value, label, max = 180) {
  const out = String(value || "").trim();
  if (!out) throw new Error(`${label} is required.`);
  if (out.length > max) throw new Error(`${label} is too long.`);
  return out;
}

function nonNegativeRaw(value, label = "Amount") {
  const out = typeof value === "bigint" ? value : BigInt(value);
  if (out < 0n) throw new Error(`${label} cannot be negative.`);
  return out;
}

function treasuryProfile(profileId) {
  const id = requiredText(profileId, "Treasury profile", 80);
  const profile = (TREASURY_PROFILES.profiles || []).find((item) => item.id === id);
  if (!profile) throw new Error(`Unknown treasury profile: ${id}`);
  return profile;
}

function assertTargetTreasuryPolicy() {
  const operations = treasuryProfile(POLICY.profiles.operations.profileId);
  const reserve = treasuryProfile(POLICY.profiles.reserve.profileId);

  if (operations.governance.threshold !== 3 || operations.governance.signers !== 5 || operations.governance.display !== "3-of-5") {
    throw new Error("Worldz Operations Treasury must remain permanent 3-of-5.");
  }
  if (
    reserve.governance.threshold !== 0 ||
    reserve.governance.signers !== 0 ||
    reserve.enabled !== false ||
    reserve.state !== "DISABLED_NOT_DEPLOYED"
  ) {
    throw new Error("Worldz Reserve Treasury must remain disabled/not deployed.");
  }
  return true;
}

function buildTreasurySettlementProposal({
  checkout,
  providerId,
  providerEvidence = {},
  netWorldzControlledRaw,
  providerSettlementReference = null
} = {}) {
  if (!checkout || checkout.schema !== "WORLDZPAY-CHECKOUT-V1") {
    throw new Error("Valid WorldzPay checkout session required.");
  }

  assertTargetTreasuryPolicy();

  const intent = checkout.paymentIntent;
  if (!intent || intent.schema !== "WORLDZPAY-INTENT-V1") {
    throw new Error("Checkout payment intent is missing or invalid.");
  }

  const provider = assessProviderReadiness(providerId, providerEvidence);
  const net = nonNegativeRaw(netWorldzControlledRaw, "Net Worldz-controlled revenue");
  const asset = requiredText(intent.settlementAsset, "Settlement asset", 16).toUpperCase();
  const sourceId = requiredText(intent.sourceId, "Revenue source", 80);

  let routingState = "hold_pending_asset_specific_policy";
  let operationsTreasuryRaw = null;
  let legacyCore = null;

  if (asset === "SOL" && eligibleSource(sourceId)) {
    legacyCore = buildLegacyCoreAllocation({
      sourceId,
      netRevenueLamports: net
    });
    operationsTreasuryRaw = legacyCore.worldzRetainedAfterLegacyCoreLamports;
    routingState = "sol_legacy_core_then_operations_preview";
  } else if (asset === "SOL") {
    operationsTreasuryRaw = net;
    routingState = "sol_operations_preview";
  }

  const operations = treasuryProfile(POLICY.profiles.operations.profileId);
  const reserve = treasuryProfile(POLICY.profiles.reserve.profileId);
  const settlementRef = providerSettlementReference
    ? requiredText(providerSettlementReference, "Provider settlement reference", 180)
    : null;

  const proposalFingerprint = [
    POLICY.version,
    checkout.checkoutId,
    intent.intentId,
    provider.providerId,
    asset,
    net.toString(),
    routingState,
    operations.id,
    reserve.id,
    settlementRef || "NO_PROVIDER_SETTLEMENT_REFERENCE"
  ].join("|");

  const proposalId = `wzt_${crypto.createHash("sha256")
    .update(proposalFingerprint)
    .digest("hex")
    .slice(0, 28)}`;

  const unsignedPayloadHash = crypto.createHash("sha256")
    .update(`WORLDZPAY_UNSIGNED_TREASURY_ENVELOPE|${proposalFingerprint}`)
    .digest("hex");

  return Object.freeze({
    schema: "WORLDZPAY-TREASURY-PROPOSAL-V1",
    version: POLICY.version,
    proposalId,
    checkoutId: checkout.checkoutId,
    paymentIntentId: intent.intentId,
    sourceId,
    settlementAsset: asset,
    netWorldzControlledRaw: net,
    routingState,
    legacyCore,
    operationsTreasuryRaw,
    provider: Object.freeze({
      providerId: provider.providerId,
      accessState: provider.accessState,
      readinessPassed: provider.readinessPassed,
      productionEligible: provider.productionEligible,
      providerSettlementReference: settlementRef
    }),
    operationsApproval: Object.freeze({
      profileId: operations.id,
      targetThreshold: operations.governance.threshold,
      targetSigners: operations.governance.signers,
      targetDisplay: operations.governance.display,
      registryState: operations.state,
      currentGovernanceVerified: false,
      destinationVerified: false
    }),
    reserveSweep: Object.freeze({
      included: false,
      enabled: false,
      requiresSeparateApproval: false,
      profileId: reserve.id,
      targetThreshold: reserve.governance.threshold,
      targetSigners: reserve.governance.signers,
      targetDisplay: reserve.governance.display,
      registryState: reserve.state
    }),
    unsignedPayloadHash,
    executionState: "prepared_only",
    canSign: false,
    canBroadcast: false,
    liveExecutionEnabled: false,
    publicWorldzProofRequiredAfterSettlement:
      POLICY.approvalControls.publicWorldzProofRequiredAfterSettlement === true,
    historicalDistributionWalletFundingForbidden:
      POLICY.routing.historicalDistributionWalletFundingForbidden === true
  });
}

function getTreasuryPaymentStatus() {
  assertTargetTreasuryPolicy();
  const operations = treasuryProfile(POLICY.profiles.operations.profileId);
  const reserve = treasuryProfile(POLICY.profiles.reserve.profileId);

  return Object.freeze({
    version: POLICY.version,
    state: POLICY.state,
    liveExecutionEnabled: POLICY.liveExecutionEnabled === true,
    signingEnabled: POLICY.signingEnabled === true,
    broadcastEnabled: POLICY.broadcastEnabled === true,
    operations: Object.freeze({
      profileId: operations.id,
      target: operations.governance.display,
      registryState: operations.state
    }),
    reserve: Object.freeze({
      profileId: reserve.id,
      enabled: reserve.enabled === true,
      target: reserve.governance.display,
      registryState: reserve.state
    })
  });
}

assertTargetTreasuryPolicy();

module.exports = {
  POLICY,
  assertTargetTreasuryPolicy,
  buildTreasurySettlementProposal,
  getTreasuryPaymentStatus,
  treasuryProfile
};
