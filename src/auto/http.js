const crypto = require("crypto");
const express = require("express");
const { dcaPublicStatus, isValidSolanaAddress, validateDcaSchedule } = require("./dca-core");
const { publicStatus, validateSimulationRequest } = require("./core");

function safeEqual(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function createAutoHttpApp({ config, repository, dcaRepository, trader, dcaWorker }) {
  const app = express();
  const router = express.Router();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb", type: "application/json" }));

  app.get("/health", async (req, res) => {
    let dca = { prepared: Boolean(dcaRepository), execution_enabled: false };
    try {
      if (dcaRepository) {
        const settings = await dcaRepository.getSettings();
        const counts = await dcaRepository.countStatus();
        dca = dcaPublicStatus(settings, counts, trader.runtimeStatus(settings.wallet_address));
      }
    } catch {
      dca = { prepared: true, database_ready: false, execution_enabled: false };
    }
    return res.json({ ok: true, service: "Diamond Buy Auto", legacy_mode: "safe_locked", dca });
  });

  function authenticateOwner(req, res, next) {
    const bearer = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const token = req.get("x-auto-internal-token") || bearer;
    const ownerId = req.get("x-owner-telegram-id") || req.body?.telegram_id || req.body?.telegramId || "";
    if (!safeEqual(String(token || ""), config.internalToken) || String(ownerId) !== String(config.ownerTelegramId)) {
      return res.status(403).json({ ok: false, error: "owner_authorization_required" });
    }
    req.ownerTelegramId = String(ownerId);
    return next();
  }

  async function combinedStatus() {
    const [settings, tokens, dcaSettings, dcaCounts, schedules] = await Promise.all([
      repository.getSettings(),
      repository.listAllowlistedTokens(),
      dcaRepository.getSettings(),
      dcaRepository.countStatus(),
      dcaRepository.listSchedules(25)
    ]);
    return {
      ok: true,
      status: publicStatus(settings, { allowlistedTokens: tokens.length }),
      tokens,
      dca: dcaPublicStatus(dcaSettings, dcaCounts, trader.runtimeStatus(dcaSettings.wallet_address)),
      dca_schedules: schedules
    };
  }

  router.get(["/", "/status"], async (req, res) => {
    try {
      return res.json(await combinedStatus());
    } catch (error) {
      console.error("Auto status failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "auto_status_failed" });
    }
  });

  router.post("/simulate", async (req, res) => {
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
      return res.status(result.ok ? 200 : 400).json({ ok: result.ok, simulation, result });
    } catch (error) {
      console.error("Auto simulation failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "auto_simulation_failed" });
    }
  });

  router.post("/pause", async (req, res) => {
    try {
      const settings = await repository.setPaused({ paused: true, actorTelegramId: req.ownerTelegramId });
      await dcaRepository.setControl({
        patch: { paused: true, execution_enabled: false },
        action: "dca_paused",
        actorTelegramId: req.ownerTelegramId
      });
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch {
      return res.status(500).json({ ok: false, error: "auto_pause_failed" });
    }
  });

  router.post(["/resume", "/resume-simulation"], async (req, res) => {
    try {
      const settings = await repository.setPaused({ paused: false, actorTelegramId: req.ownerTelegramId });
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch {
      return res.status(500).json({ ok: false, error: "auto_resume_failed" });
    }
  });

  router.post("/emergency-stop", async (req, res) => {
    try {
      const settings = await repository.emergencyStop(req.ownerTelegramId);
      await dcaRepository.setControl({
        patch: { enabled: false, paused: true, emergency_stop: true, execution_enabled: false },
        action: "dca_emergency_stop",
        actorTelegramId: req.ownerTelegramId
      });
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch {
      return res.status(500).json({ ok: false, error: "auto_emergency_stop_failed" });
    }
  });

  router.get("/dca", async (req, res) => {
    try {
      const settings = await dcaRepository.getSettings();
      const counts = await dcaRepository.countStatus();
      return res.json({
        ok: true,
        dca: dcaPublicStatus(settings, counts, trader.runtimeStatus(settings.wallet_address)),
        schedules: await dcaRepository.listSchedules(100),
        tokens: await dcaRepository.listAllowlistedTokens()
      });
    } catch (error) {
      console.error("Auto DCA status failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "dca_status_failed" });
    }
  });

  router.post("/dca/wallet", async (req, res) => {
    const walletAddress = String(req.body?.wallet_address || "").trim();
    if (!isValidSolanaAddress(walletAddress)) return res.status(400).json({ ok: false, error: "invalid_wallet_address" });
    try {
      const settings = await dcaRepository.setWalletAddress({ walletAddress, actorTelegramId: req.ownerTelegramId });
      return res.json({ ok: true, settings, runtime: trader.runtimeStatus(settings.wallet_address) });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_wallet_update_failed" });
    }
  });

  router.post("/dca/limits", async (req, res) => {
    const fields = ["max_order_amount", "max_daily_amount", "max_weekly_amount", "max_monthly_amount", "min_interval_minutes", "max_slippage_bps", "max_price_impact_bps"];
    const patch = {};
    for (const field of fields) {
      if (req.body?.[field] === undefined) continue;
      const value = Number(req.body[field]);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ ok: false, error: `invalid_${field}` });
      patch[field] = ["min_interval_minutes", "max_slippage_bps", "max_price_impact_bps"].includes(field) ? Math.floor(value) : value;
    }
    if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: "no_limits_supplied" });
    try {
      const settings = await dcaRepository.setLimits({ patch, actorTelegramId: req.ownerTelegramId });
      return res.json({ ok: true, settings });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_limits_update_failed" });
    }
  });

  router.post("/dca/schedules", async (req, res) => {
    try {
      const [settings, tokens] = await Promise.all([
        dcaRepository.getSettings(),
        dcaRepository.listAllowlistedTokens()
      ]);
      const result = validateDcaSchedule(req.body || {}, {
        settings,
        allowlistedTokens: new Set(tokens.map((token) => token.token_mint)),
        usdcMint: process.env.SOLANA_USDC_MINT
      });
      if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors, result });
      const schedule = await dcaRepository.createSchedule({ proposal: result.proposal, actorTelegramId: req.ownerTelegramId });
      return res.status(201).json({ ok: true, schedule, result });
    } catch (error) {
      console.error("Auto DCA schedule creation failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "dca_schedule_creation_failed" });
    }
  });

  router.post("/dca/schedules/:id/:action", async (req, res) => {
    const id = String(req.params.id || "");
    const action = String(req.params.action || "").toLowerCase();
    if (!validUuid(id)) return res.status(400).json({ ok: false, error: "invalid_schedule_id" });
    const statusByAction = { start: "active", pause: "paused", resume: "active", cancel: "cancelled" };
    const status = statusByAction[action];
    if (!status) return res.status(404).json({ ok: false, error: "unknown_dca_action" });
    try {
      if (["start", "resume"].includes(action)) {
        const settings = await dcaRepository.getSettings();
        const runtime = trader.runtimeStatus(settings.wallet_address);
        if (!settings.enabled || !settings.execution_enabled || settings.paused || settings.emergency_stop || !runtime.walletMatches || !runtime.apiReady || !runtime.signerReady) {
          return res.status(409).json({ ok: false, error: "dca_activation_incomplete", runtime });
        }
      }
      const schedule = await dcaRepository.setScheduleStatus({ id, status, actorTelegramId: req.ownerTelegramId });
      return schedule ? res.json({ ok: true, schedule }) : res.status(404).json({ ok: false, error: "schedule_not_found" });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_schedule_update_failed" });
    }
  });

  router.post("/dca/enable", async (req, res) => {
    try {
      const settings = await dcaRepository.getSettings();
      const runtime = trader.runtimeStatus(settings.wallet_address);
      if (!runtime.apiReady || !runtime.signerReady || !runtime.walletMatches) {
        return res.status(409).json({ ok: false, error: "dca_runtime_not_ready", runtime });
      }
      const updated = await dcaRepository.setControl({
        patch: { enabled: true, paused: false, emergency_stop: false, execution_enabled: true },
        action: "dca_execution_enabled",
        actorTelegramId: req.ownerTelegramId
      });
      return res.json({ ok: true, settings: updated, runtime });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_enable_failed" });
    }
  });

  router.post("/dca/disable", async (req, res) => {
    try {
      const settings = await dcaRepository.setControl({
        patch: { enabled: false, paused: true, execution_enabled: false },
        action: "dca_execution_disabled",
        actorTelegramId: req.ownerTelegramId
      });
      return res.json({ ok: true, settings });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_disable_failed" });
    }
  });

  router.post("/dca/tick", async (req, res) => {
    try {
      await dcaWorker.tick();
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_tick_failed" });
    }
  });

  app.use("/internal", authenticateOwner, router);
  app.use("/", authenticateOwner, router);
  app.use((req, res) => res.status(404).json({ ok: false, error: "not_found" }));
  return app;
}

module.exports = { createAutoHttpApp, safeEqual, validUuid };
