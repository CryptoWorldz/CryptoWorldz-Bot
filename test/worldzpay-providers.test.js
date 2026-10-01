"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assessProviderReadiness,
  assertNoSecretMaterial,
  listProviderAccess,
  providerForPaymentMethod
} = require("../src/worldzpay-providers");

test("provider registry exposes four disabled side-rail provider slots", () => {
  const providers = listProviderAccess();
  assert.equal(providers.length, 4);
  assert.equal(providers.every((item) => item.productionEnabled === false), true);
});

test("X Money stays non-production even if readiness evidence is complete", () => {
  const readiness = assessProviderReadiness("x_money", {
    official_access_granted: true,
    official_docs_verified: true,
    commercial_terms_approved: true,
    compliance_review_approved: true,
    credentials_configured_server_side: true,
    webhook_or_callback_verification_ready: true,
    sandbox_or_certification_passed: true
  });

  assert.equal(readiness.readinessPassed, true);
  assert.equal(readiness.productionEligible, false);
  assert.equal(readiness.executionState, "side_rail_only");
});

test("provider readiness reports exactly what is missing", () => {
  const readiness = assessProviderReadiness("card_processor", {
    provider_selected: true,
    merchant_account_approved: true
  });

  assert.equal(readiness.readinessPassed, false);
  assert.equal(readiness.missing.includes("sandbox_or_certification_passed"), true);
  assert.equal(readiness.missing.includes("credentials_configured_server_side"), true);
});

test("payment methods map to provider slots", () => {
  assert.equal(providerForPaymentMethod("x_money").id, "x_money");
  assert.equal(providerForPaymentMethod("card").id, "card_processor");
  assert.equal(providerForPaymentMethod("bank").id, "bank_rail");
  assert.equal(providerForPaymentMethod("usdc").id, "solana_wallet");
});

test("secret material is rejected from readiness evidence", () => {
  assert.throws(
    () => assertNoSecretMaterial({ api_key: "do-not-store-this" }),
    /Secret material must not be supplied/
  );
});
