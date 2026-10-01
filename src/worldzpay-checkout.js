"use strict";

const crypto = require("node:crypto");
const CHECKOUT = require("../worldzpad-mainnet/payments/worldzpay-checkout.v1.json");
const { createPaymentIntent } = require("./worldzpay");

const PRODUCT_SET = new Set(Object.keys(CHECKOUT.products));

function text(value, label, max = 180) {
  const out = String(value || "").trim();
  if (!out) throw new Error(`${label} is required.`);
  if (out.length > max) throw new Error(`${label} is too long.`);
  return out;
}

function productFor(productId) {
  const id = text(productId, "Product", 80);
  if (!PRODUCT_SET.has(id)) throw new Error("Unknown WorldzPay checkout product.");
  return Object.freeze({ id, ...CHECKOUT.products[id] });
}

function createCheckoutSession({
  productId,
  method,
  fiatCurrency = "AUD",
  fiatAmountMinor,
  settlementAsset = "SOL",
  customerRef,
  idempotencyKey,
  quoteRef
} = {}) {
  const product = productFor(productId);
  const quote = text(quoteRef, "Quote reference", 160);

  const intent = createPaymentIntent({
    sourceId: product.revenueSourceId,
    method,
    fiatCurrency,
    fiatAmountMinor,
    settlementAsset,
    customerRef,
    idempotencyKey
  });

  const checkoutId = `wzc_${crypto.createHash("sha256")
    .update([CHECKOUT.version, product.id, quote, intent.intentId].join("|"))
    .digest("hex")
    .slice(0, 28)}`;

  return Object.freeze({
    schema: "WORLDZPAY-CHECKOUT-V1",
    version: CHECKOUT.version,
    checkoutId,
    state: "quoted",
    productId: product.id,
    productLabel: product.label,
    pricingMode: product.pricingMode,
    quoteRef: quote,
    paymentIntent: intent,
    previewOnly: CHECKOUT.controls.previewOnly === true,
    paymentProviderExecutionDisabled:
      CHECKOUT.controls.paymentProviderExecutionDisabled === true,
    distributionWalletFundingForbidden:
      CHECKOUT.controls.distributionWalletFundingForbidden === true,
    noImpliedXAffiliation:
      CHECKOUT.controls.noImpliedXAffiliation === true
  });
}

function transitionCheckout(session, nextState) {
  if (!session || session.schema !== "WORLDZPAY-CHECKOUT-V1") {
    throw new Error("Valid WorldzPay checkout session required.");
  }

  const state = text(nextState, "Checkout state", 40).toLowerCase();
  if (!CHECKOUT.checkoutStates.includes(state)) {
    throw new Error("Unsupported WorldzPay checkout state.");
  }

  const allowed = {
    draft: ["quoted", "cancelled"],
    quoted: ["awaiting_payment", "cancelled"],
    awaiting_payment: ["paid", "cancelled"],
    paid: ["refunded"],
    cancelled: [],
    refunded: []
  };

  if (!allowed[session.state]?.includes(state)) {
    throw new Error(`Invalid checkout transition: ${session.state} -> ${state}`);
  }

  if (state === "paid" && CHECKOUT.liveCheckoutEnabled !== true) {
    throw new Error("Live payment confirmation is disabled on the WorldzPay side rail.");
  }

  return Object.freeze({
    ...session,
    state
  });
}

function getCheckoutStatus() {
  return Object.freeze({
    version: CHECKOUT.version,
    status: CHECKOUT.status,
    liveCheckoutEnabled: CHECKOUT.liveCheckoutEnabled === true,
    products: Object.freeze(
      Object.entries(CHECKOUT.products).map(([id, item]) =>
        Object.freeze({ id, label: item.label, pricingMode: item.pricingMode })
      )
    )
  });
}

module.exports = {
  CHECKOUT,
  createCheckoutSession,
  transitionCheckout,
  getCheckoutStatus
};
