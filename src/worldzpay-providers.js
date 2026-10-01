"use strict";

const REGISTRY = require("../worldzpad-mainnet/payments/worldzpay-providers.v1.json");

const PROVIDER_IDS = Object.freeze(Object.keys(REGISTRY.providers));
const SECRETISH_KEY = /(secret|private|seed|mnemonic|token|api[_-]?key|credential[_-]?value)/i;

function requiredText(value, label, max = 180) {
  const out = String(value || "").trim();
  if (!out) throw new Error(`${label} is required.`);
  if (out.length > max) throw new Error(`${label} is too long.`);
  return out;
}

function providerById(providerId) {
  const id = requiredText(providerId, "Provider", 80).toLowerCase();
  const provider = REGISTRY.providers[id];
  if (!provider) throw new Error("Unknown WorldzPay provider.");
  return Object.freeze({ id, ...provider });
}

function assertNoSecretMaterial(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return true;
  for (const [key, value] of Object.entries(evidence)) {
    if (SECRETISH_KEY.test(key) && typeof value === "string" && value.trim()) {
      throw new Error("Secret material must not be supplied to WorldzPay readiness evidence.");
    }
  }
  return true;
}

function normalizedEvidence(evidence = {}) {
  assertNoSecretMaterial(evidence);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(evidence).map(([key, value]) => [String(key), value === true])
    )
  );
}

function assessProviderReadiness(providerId, evidence = {}) {
  const provider = providerById(providerId);
  const proof = normalizedEvidence(evidence);
  const requirements = Array.isArray(provider.requiredReadiness)
    ? provider.requiredReadiness
    : [];

  const checks = requirements.map((requirement) =>
    Object.freeze({
      requirement,
      passed: proof[requirement] === true
    })
  );

  const missing = checks.filter((item) => !item.passed).map((item) => item.requirement);
  const readinessPassed = missing.length === 0;
  const productionEligible =
    readinessPassed &&
    REGISTRY.productionProvidersEnabled === true &&
    provider.productionEnabled === true;

  return Object.freeze({
    providerId: provider.id,
    label: provider.label,
    accessState: provider.accessState,
    methods: Object.freeze([...(provider.methods || [])]),
    officialAccessRequired: provider.officialAccessRequired === true,
    checks: Object.freeze(checks),
    missing: Object.freeze(missing),
    readinessPassed,
    productionEligible,
    executionState: "side_rail_only"
  });
}

function providerForPaymentMethod(method) {
  const requested = requiredText(method, "Payment method", 40).toLowerCase();
  const match = PROVIDER_IDS.find((providerId) =>
    (REGISTRY.providers[providerId].methods || []).includes(requested)
  );
  if (!match) throw new Error("No WorldzPay provider slot exists for that payment method.");
  return providerById(match);
}

function listProviderAccess() {
  return Object.freeze(
    PROVIDER_IDS.map((providerId) => {
      const provider = providerById(providerId);
      return Object.freeze({
        providerId,
        label: provider.label,
        methods: Object.freeze([...(provider.methods || [])]),
        accessState: provider.accessState,
        productionEnabled: provider.productionEnabled === true,
        officialAccessRequired: provider.officialAccessRequired === true
      });
    })
  );
}

module.exports = {
  REGISTRY,
  assessProviderReadiness,
  assertNoSecretMaterial,
  listProviderAccess,
  providerById,
  providerForPaymentMethod
};
