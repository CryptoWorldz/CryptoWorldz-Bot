"use strict";

const crypto = require("node:crypto");

function required(value, label, max = 180) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > max) throw new Error(`${label} is too long.`);
  return text;
}

function buildCheckoutReceiptDraft({
  checkout,
  merchantLabel = "WorldzFullBuild",
  issuedAt = new Date().toISOString()
} = {}) {
  if (!checkout || checkout.schema !== "WORLDZPAY-CHECKOUT-V1") {
    throw new Error("WorldzPay checkout session required.");
  }

  const merchant = required(merchantLabel, "Merchant label", 120);
  const timestamp = required(issuedAt, "Issued at", 80);

  const receiptId = `wzp_receipt_${crypto.createHash("sha256")
    .update([
      checkout.checkoutId,
      checkout.paymentIntent.intentId,
      merchant,
      timestamp
    ].join("|"))
    .digest("hex")
    .slice(0, 24)}`;

  return Object.freeze({
    schema: "WORLDZPAY-RECEIPT-DRAFT-V1",
    receiptId,
    checkoutId: checkout.checkoutId,
    paymentIntentId: checkout.paymentIntent.intentId,
    merchantLabel: merchant,
    productId: checkout.productId,
    productLabel: checkout.productLabel,
    fiatCurrency: checkout.paymentIntent.fiatCurrency,
    fiatAmountMinor: checkout.paymentIntent.fiatAmountMinor,
    settlementAsset: checkout.paymentIntent.settlementAsset,
    paymentMethod: checkout.paymentIntent.requestedMethod,
    checkoutState: checkout.state,
    worldzProofStatus: "DRAFT_ONLY",
    settlementReference: null,
    explorerUrl: null,
    onChainConfirmed: false,
    liveFundsMoved: false,
    issuedAt: timestamp,
    note: "Draft receipt only. It is not proof of payment or settlement."
  });
}

module.exports = {
  buildCheckoutReceiptDraft
};
