const crypto = require("crypto");
const express = require("express");
const { publicStatus, validateSimulationRequest } = require("./core");

function safeEqual(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createAutoHttpApp({ config, repository }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb", type: "application/json" }));

  app.get("/", (req, res) => res.json({
    ok: true,
    service: "Diamond Buy Auto",
    name: "Auto",
    mode: "safe_locked",
    execution_enabled: false
  }));

  app.get("/health", (req, res) => res.json({
    ok: true,
    service: "Diamond Buy Auto",
    mode: "safe_locked",
    execution_enabled: false,
    signing_enabled: false
  }));

  function authenticateOwner(req, res, next) {
    const token = req.get("x-auto-internal-token") || "";
    const ownerId = req.get("x-owner-telegram-id") || "";
    if (!safeEqual(token, config.internalToken) || String(ownerId) !== String(config.ownerTelegramId)) {
      return res.status(403).json({ ok: false, error: "owner_authorization_required" });
    }
    req.ownerTelegramId = String(ownerId);
    return next();
  }

  app.use("/internal", authenticateOwner);

  app.get("/internal/status", async (req, res) => {
    try {
      const [settings, tokens] = await Promise.all([
        repository.getSettings(),
        repository.listAllowlistedTokens()
      ]);
      return res.json({
        ok: true,
        status: publicStatus(settings, { allowlistedTokens: tokens.length }),
        tokens
      });
    } catch (error) {
      console.error("Auto status failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "auto_status_failed" });
    }
  });

  app.post("/internal/simulate", async (req, res) => {
    try {
      const [settings, tokens] = await Promise.all([
        repository.getSettings(),
        repository.listAllowlistedTokens()
      ]);
      const allowlistedTokens = new Set(tokens.map((token) => token.token_mint));
      const result = validateSimulationRequest(req.body || {}, { settings, allowlistedTokens });
      const simulation = await repository.recordSimulation({
        actorTelegramId: req.ownerTelegramId,
        request: req.body || {},
        result
      });
      return res.status(result.ok ? 200 : 400).json({
        ok: result.ok,
        simulation,
        result
      });
    } catch (error) {
      console.error("Auto simulation failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "auto_simulation_failed" });
    }
  });

  app.post("/internal/pause", async (req, res) => {
    try {
      const settings = await repository.setPaused({ paused: true, actorTelegramId: req.ownerTelegramId });
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "auto_pause_failed" });
    }
  });

  app.post("/internal/resume-simulation", async (req, res) => {
    try {
      const settings = await repository.setPaused({ paused: false, actorTelegramId: req.ownerTelegramId });
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "auto_resume_failed" });
    }
  });

  app.post("/internal/emergency-stop", async (req, res) => {
    try {
      const settings = await repository.emergencyStop(req.ownerTelegramId);
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "auto_emergency_stop_failed" });
    }
  });

  app.use((req, res) => res.status(404).json({ ok: false, error: "not_found" }));
  return app;
}

module.exports = { createAutoHttpApp, safeEqual };
