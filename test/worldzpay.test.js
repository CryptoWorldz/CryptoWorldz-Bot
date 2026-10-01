"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPaymentIntent,
  buildSettlementPreview,
  getWorldzPayStatus
} = require("../src/worldzpay");

test("WorldzPay starts simulation-only with X Money reserved behind official access", () => {
  const status = getWorldzPayStatus();
  assert.equal(status.status, "SIMULATION_ONLY");
  assert.equal(status.liveFundsEnabled, false);
  assert.equal(status.custodyEnabled, false);
  assert.equal(status.xMoney.liveEnabled, false);
  assert.equal(status.xMoney.officialAccessRequired, true);
});

test("X Money intent can be planned but cannot move funds", () => {
  const intent = createPaymentIntent({
    sourceId: "community_suite_own",
    method: "x_money",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "community:test",
    idempotencyKey: "order-001"
  });

  assert.match(intent.intentId, /^wzp_[a-f0-9]{28}$/);
  assert.equal(intent.executionMode, "simulation_only");
  assert.equal(intent.liveFundsEnabled, false);
  assert.equal(intent.requiresOfficialProviderAccess, true);
  assert.equal(intent.noImpliedXAffiliation, true);
});

test("same checkout request creates same intent id", () => {
  const input = {
    sourceId: "community_suite_rent",
    method: "card",
    fiatCurrency: "AUD",
    fiatAmountMinor: 4900,
    settlementAsset: "USDC",
    customerRef: "community:42",
    idempotencyKey: "invoice-42"
  };

  assert.equal(createPaymentIntent(input).intentId, createPaymentIntent(input).intentId);
});

test("SOL settlement preview plugs into the protected Legacy Core revenue ledger", () => {
  const preview = buildSettlementPreview({
    sourceId: "community_suite_own",
    settlementAsset: "SOL",
    netRevenueRaw: 10_000_000_000n
  });

  assert.equal(preview.legacyCoreRouting, "accrue_only");
  assert.equal(preview.liveTransfersEnabled, false);
  assert.equal(preview.legacyCore.legacyCorePoolLamports, 1_500_000_000n);
  assert.equal(preview.legacyCore.allocations.length, 12);
  assert.equal(preview.legacyCore.allocations[0].tokenShareLamports, 125_000_000n);
  assert.equal(preview.legacyCore.historicalDistributionWalletFundingForbidden, true);
});

test("non-SOL settlement cannot silently reuse SOL routing policy", () => {
  const preview = buildSettlementPreview({
    sourceId: "community_suite_own",
    settlementAsset: "USDC",
    netRevenueRaw: 10_000_000n
  });

  assert.equal(preview.legacyCoreRouting, "requires_asset_specific_policy");
  assert.equal(preview.liveTransfersEnabled, false);
});

test("protected or unknown funding sources cannot be sold through WorldzPay", () => {
  assert.throws(() => createPaymentIntent({
    sourceId: "token_distribution_wallet_balances",
    method: "solana_wallet",
    fiatCurrency: "AUD",
    fiatAmountMinor: 100,
    settlementAsset: "SOL",
    customerRef: "blocked",
    idempotencyKey: "blocked-1"
  }), /not a supported WorldzPay product source/);
});
