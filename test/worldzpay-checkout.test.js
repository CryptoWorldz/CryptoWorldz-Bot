"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCheckoutSession,
  transitionCheckout,
  getCheckoutStatus
} = require("../src/worldzpay-checkout");
const { buildCheckoutReceiptDraft } = require("../src/worldzpay-receipt");

test("WorldzPay Checkout side rail stays preview-only", () => {
  const status = getCheckoutStatus();
  assert.equal(status.status, "SIDE_RAIL_PREVIEW_ONLY");
  assert.equal(status.liveCheckoutEnabled, false);
  assert.equal(status.products.length, 5);
});

test("buy outright checkout creates a deterministic quoted session", () => {
  const input = {
    productId: "community_suite_own",
    method: "x_money",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "tg:123",
    idempotencyKey: "quote:123",
    quoteRef: "Q-123"
  };

  const a = createCheckoutSession(input);
  const b = createCheckoutSession(input);

  assert.equal(a.checkoutId, b.checkoutId);
  assert.equal(a.state, "quoted");
  assert.equal(a.previewOnly, true);
  assert.equal(a.paymentProviderExecutionDisabled, true);
  assert.equal(a.paymentIntent.liveFundsEnabled, false);
  assert.equal(a.paymentIntent.requiresOfficialProviderAccess, true);
});

test("side rail allows quote progression but blocks paid state", () => {
  const checkout = createCheckoutSession({
    productId: "community_suite_rent",
    method: "card",
    fiatCurrency: "AUD",
    fiatAmountMinor: 4900,
    settlementAsset: "USDC",
    customerRef: "customer:42",
    idempotencyKey: "invoice:42",
    quoteRef: "Q-42"
  });

  const awaiting = transitionCheckout(checkout, "awaiting_payment");
  assert.equal(awaiting.state, "awaiting_payment");
  assert.throws(
    () => transitionCheckout(awaiting, "paid"),
    /Live payment confirmation is disabled/
  );
});

test("invalid checkout transitions are rejected", () => {
  const checkout = createCheckoutSession({
    productId: "community_suite_trial",
    method: "solana_wallet",
    fiatCurrency: "AUD",
    fiatAmountMinor: 100,
    settlementAsset: "SOL",
    customerRef: "trial:1",
    idempotencyKey: "trial:1",
    quoteRef: "TRIAL-1"
  });

  assert.throws(
    () => transitionCheckout(checkout, "refunded"),
    /Invalid checkout transition/
  );
});

test("receipt is explicitly draft-only and cannot masquerade as settlement proof", () => {
  const checkout = createCheckoutSession({
    productId: "community_suite_addons",
    method: "usdc",
    fiatCurrency: "AUD",
    fiatAmountMinor: 2500,
    settlementAsset: "USDC",
    customerRef: "addon:1",
    idempotencyKey: "addon:1",
    quoteRef: "ADD-1"
  });

  const receipt = buildCheckoutReceiptDraft({
    checkout,
    merchantLabel: "WorldzFullBuild",
    issuedAt: "2026-10-01T05:00:00.000Z"
  });

  assert.equal(receipt.worldzProofStatus, "DRAFT_ONLY");
  assert.equal(receipt.onChainConfirmed, false);
  assert.equal(receipt.liveFundsMoved, false);
  assert.equal(receipt.settlementReference, null);
  assert.match(receipt.note, /not proof of payment/i);
});
