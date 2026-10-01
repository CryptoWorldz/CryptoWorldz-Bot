"use strict";

const {
  createPaymentIntent,
  buildSettlementPreview,
  getWorldzPayStatus
} = require("./worldzpay");

function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)])
    );
  }
  return value;
}

function registerWorldzPayRoutes({ app }) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("WorldzPay requires an Express-compatible app.");
  }

  app.get("/api/worldzpay/status", (_req, res) => {
    return res.json({ ok: true, worldzpay: jsonSafe(getWorldzPayStatus()) });
  });

  app.post("/api/worldzpay/intent-preview", (req, res) => {
    try {
      const intent = createPaymentIntent(req.body || {});
      return res.json({ ok: true, intent: jsonSafe(intent) });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: String(error?.message || "invalid_worldzpay_intent")
      });
    }
  });

  app.post("/api/worldzpay/settlement-preview", (req, res) => {
    try {
      const preview = buildSettlementPreview(req.body || {});
      return res.json({ ok: true, preview: jsonSafe(preview) });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: String(error?.message || "invalid_worldzpay_settlement")
      });
    }
  });
}

module.exports = {
  jsonSafe,
  registerWorldzPayRoutes
};
