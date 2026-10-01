"use strict";

const crypto = require("node:crypto");
const CONFIG = require("../worldzpad-mainnet/payments/worldzpay.v1.json");
const {
  POLICY: LEGACY_REVENUE_POLICY,
  eligibleSource,
  buildLegacyCoreAllocation
} = require("./worldz-core-legacy-revenue");

const SOURCE_SET = new Set(LEGACY_REVENUE_POLICY.eligibleSources);
const ASSET_SET = new Set(CONFIG.settlementAssets);
const METHOD_SET = new Set(Object.keys(CONFIG.methods));

function requiredText(value, label, max = 180) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > max) throw new Error(`${label} is too long.`);
  return text;
}

function positiveMinorUnits(value) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  if (amount <= 0n) throw new Error("Payment amount must be greater than zero.");
  return amount;
}

function paymentMethod(method) {
  const id = requiredText(method, "Payment method", 40).toLowerCase();
  if (!METHOD_SET.has(id)) throw new Error(`Unsupported payment method: ${id}`);
  return Object.freeze({ id, ...CONFIG.methods[id] });
}

function createPaymentIntent({
  sourceId,
  method,
  fiatCurrency = "AUD",
  fiatAmountMinor,
  settlementAsset = "SOL",
  customerRef,
  idempotencyKey
} = {}) {
  const source = requiredText(sourceId, "Revenue source", 80);
  if (!SOURCE_SET.has(source)) {
    throw new Error("Revenue source is not a supported WorldzPay product source.");
  }

  const selectedMethod = paymentMethod(method);
  const currency = requiredText(fiatCurrency, "Fiat currency", 8).toUpperCase();
  const amountMinor = positiveMinorUnits(fiatAmountMinor);
  const asset = requiredText(settlementAsset, "Settlement asset", 12).toUpperCase();
  if (!ASSET_SET.has(asset)) throw new Error(`Unsupported settlement asset: ${asset}`);

  const customer = requiredText(customerRef, "Customer reference", 160);
  const idempotency = requiredText(idempotencyKey, "Idempotency key", 160);
  const intentId = `wzp_${crypto.createHash("sha256")
    .update([
      CONFIG.version,
      source,
      selectedMethod.id,
      currency,
      amountMinor.toString(),
      asset,
      customer,
      idempotency
    ].join("|"))
    .digest("hex")
    .slice(0, 28)}`;

  return Object.freeze({
    schema: "WORLDZPAY-INTENT-V1",
    version: CONFIG.version,
    intentId,
    sourceId: source,
    customerRef: customer,
    requestedMethod: selectedMethod.id,
    methodStatus: selectedMethod.status,
    fiatCurrency: currency,
    fiatAmountMinor: amountMinor,
    settlementAsset: asset,
    executionMode: "simulation_only",
    liveFundsEnabled: CONFIG.liveFundsEnabled === true && selectedMethod.liveEnabled === true,
    custodyEnabled: CONFIG.custodyEnabled === true,
    requiresOfficialProviderAccess: selectedMethod.officialAccessRequired === true,
    noImpliedXAffiliation: CONFIG.controls.noImpliedXAffiliation === true
  });
}

function buildSettlementPreview({
  sourceId,
  settlementAsset = "SOL",
  netRevenueRaw
} = {}) {
  const source = requiredText(sourceId, "Revenue source", 80);
  const asset = requiredText(settlementAsset, "Settlement asset", 12).toUpperCase();
  if (!ASSET_SET.has(asset)) throw new Error(`Unsupported settlement asset: ${asset}`);

  const net = typeof netRevenueRaw === "bigint" ? netRevenueRaw : BigInt(netRevenueRaw);
  if (net < 0n) throw new Error("Net revenue cannot be negative.");

  if (asset !== "SOL") {
    return Object.freeze({
      sourceId: source,
      settlementAsset: asset,
      netRevenueRaw: net,
      legacyCoreRouting: "requires_asset_specific_policy",
      liveTransfersEnabled: false
    });
  }

  if (!eligibleSource(source)) {
    return Object.freeze({
      sourceId: source,
      settlementAsset: asset,
      netRevenueRaw: net,
      legacyCoreRouting: "not_eligible",
      liveTransfersEnabled: false
    });
  }

  const legacyCore = buildLegacyCoreAllocation({
    sourceId: source,
    netRevenueLamports: net
  });

  return Object.freeze({
    sourceId: source,
    settlementAsset: asset,
    netRevenueRaw: net,
    legacyCoreRouting: "accrue_only",
    legacyCore,
    liveTransfersEnabled: false
  });
}

function getWorldzPayStatus() {
  return Object.freeze({
    version: CONFIG.version,
    status: CONFIG.status,
    liveFundsEnabled: CONFIG.liveFundsEnabled === true,
    custodyEnabled: CONFIG.custodyEnabled === true,
    xMoney: Object.freeze({
      status: CONFIG.methods.x_money.status,
      liveEnabled: CONFIG.methods.x_money.liveEnabled === true,
      officialAccessRequired: CONFIG.methods.x_money.officialAccessRequired === true
    }),
    settlementAssets: Object.freeze([...CONFIG.settlementAssets]),
    productSources: Object.freeze([...LEGACY_REVENUE_POLICY.eligibleSources])
  });
}

module.exports = {
  CONFIG,
  createPaymentIntent,
  buildSettlementPreview,
  getWorldzPayStatus
};
