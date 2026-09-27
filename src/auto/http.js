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
  const dcaPrepared = Boolean(dcaRepository && trader);
  const lockedDcaStatus = Object.freeze({
    mode: "owner_dca",
    prepared: false,
    enabled: false,
    paused: true,
    emergency_stop: true,
    execution_enabled: false,
    signer_ready: false,
    api_ready: false,
    wallet_address: null,
    wallet_matches_signer: false,
    active_schedules: 0,
    draft_schedules: 0,
    completed_schedules: 0,
    total_executions: 0
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb", type: "application/json" }));

  function requireDca(res) {
    if (dcaPrepared) return true;
    res.status(503).json({ ok: false, error: "dca_not_prepared" });
    return false;
  }

  function approvedWalletAddresses(wallets = [], settings = {}) {
    const addresses = (wallets || [])
      .filter((wallet) => wallet.enabled === true && wallet.verified === true)
      .map((wallet) => String(wallet.wallet_address || "").trim())
      .filter(Boolean);
    if (!addresses.length && settings?.wallet_address) addresses.push(String(settings.wallet_address).trim());
    return [...new Set(addresses)];
  }

  function dcaRuntime(settings, wallets = []) {
    const approved = approvedWalletAddresses(wallets, settings);
    return trader && typeof trader.runtimeStatus === "function"
      ? trader.runtimeStatus(approved)
      : { apiReady: false, signerReady: false, walletMatches: false, approvedWallets: approved.length, matchedWallets: 0 };
  }

  app.get("/health", async (req, res) => {
    let dca = { ...lockedDcaStatus, prepared: dcaPrepared };
    try {
      if (dcaPrepared) {
        const [settings, counts, wallets] = await Promise.all([
          dcaRepository.getSettings(),
          dcaRepository.countStatus(),
          dcaRepository.listWallets()
        ]);
        dca = dcaPublicStatus(settings, counts, dcaRuntime(settings, wallets));
      }
    } catch {
      dca = { ...lockedDcaStatus, prepared: true, database_ready: false };
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
    const [settings, tokens] = await Promise.all([
      repository.getSettings(),
      repository.listAllowlistedTokens()
    ]);
    if (!dcaPrepared) {
      return {
        ok: true,
        status: publicStatus(settings, { allowlistedTokens: tokens.length }),
        tokens,
        dca: lockedDcaStatus,
        dca_schedules: []
      };
    }

    const [dcaSettings, dcaCounts, schedules, wallets, assets] = await Promise.all([
      dcaRepository.getSettings(),
      dcaRepository.countStatus(),
      dcaRepository.listSchedules(25),
      dcaRepository.listWallets(),
      dcaRepository.listAssetRegistry(250)
    ]);
    return {
      ok: true,
      status: publicStatus(settings, { allowlistedTokens: tokens.length }),
      tokens,
      dca: dcaPublicStatus(dcaSettings, dcaCounts, dcaRuntime(dcaSettings, wallets)),
      dca_wallets: wallets,
      buy_universe: assets,
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
      if (dcaPrepared) {
        await dcaRepository.setControl({
          patch: { paused: true, execution_enabled: false },
          action: "dca_paused",
          actorTelegramId: req.ownerTelegramId
        });
      }
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
      if (dcaPrepared) {
        await dcaRepository.setControl({
          patch: { enabled: false, paused: true, emergency_stop: true, execution_enabled: false },
          action: "dca_emergency_stop",
          actorTelegramId: req.ownerTelegramId
        });
      }
      return res.json({ ok: true, status: publicStatus(settings) });
    } catch {
      return res.status(500).json({ ok: false, error: "auto_emergency_stop_failed" });
    }
  });

  router.get("/dca", async (req, res) => {
    if (!requireDca(res)) return undefined;
    try {
      const [settings, counts, schedules, tokens, wallets, assets] = await Promise.all([
        dcaRepository.getSettings(),
        dcaRepository.countStatus(),
        dcaRepository.listSchedules(100),
        dcaRepository.listAllowlistedTokens(),
        dcaRepository.listWallets(),
        dcaRepository.listAssetRegistry(250)
      ]);
      return res.json({
        ok: true,
        dca: dcaPublicStatus(settings, counts, dcaRuntime(settings, wallets)),
        schedules,
        tokens,
        wallets,
        buy_universe: assets
      });
    } catch (error) {
      console.error("Auto DCA status failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "dca_status_failed" });
    }
  });

  router.post("/dca/wallet", async (req, res) => {
    if (!requireDca(res)) return undefined;
    const walletAddress = String(req.body?.wallet_address || "").trim();
    if (!isValidSolanaAddress(walletAddress)) return res.status(400).json({ ok: false, error: "invalid_wallet_address" });
    try {
      const settings = await dcaRepository.setWalletAddress({ walletAddress, actorTelegramId: req.ownerTelegramId });
      const verified = Boolean(trader && typeof trader.configured === "function" && trader.configured(walletAddress));
      const wallet = await dcaRepository.upsertWallet({
        walletAddress,
        label: "Primary Owner AUTO Wallet",
        walletRole: "owner",
        enabled: true,
        verified,
        actorTelegramId: req.ownerTelegramId
      });
      const wallets = await dcaRepository.listWallets();
      return res.json({ ok: true, settings, wallet, runtime: dcaRuntime(settings, wallets) });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_wallet_update_failed" });
    }
  });

  router.post("/dca/wallets", async (req, res) => {
    if (!requireDca(res)) return undefined;
    const walletAddress = String(req.body?.wallet_address || "").trim();
    const walletRole = String(req.body?.wallet_role || "dev").trim().toLowerCase();
    const label = String(req.body?.label || (walletRole === "owner" ? "Owner AUTO Wallet" : "Dev AUTO Wallet")).trim().slice(0, 120);
    if (!isValidSolanaAddress(walletAddress)) return res.status(400).json({ ok: false, error: "invalid_wallet_address" });
    if (!["owner", "dev"].includes(walletRole)) return res.status(400).json({ ok: false, error: "invalid_wallet_role" });
    try {
      const verified = Boolean(trader && typeof trader.configured === "function" && trader.configured(walletAddress));
      const wallet = await dcaRepository.upsertWallet({
        walletAddress,
        label: label || "AUTO Wallet",
        walletRole,
        enabled: true,
        verified,
        actorTelegramId: req.ownerTelegramId
      });
      const settings = await dcaRepository.getSettings();
      const wallets = await dcaRepository.listWallets();
      return res.status(verified ? 201 : 202).json({
        ok: true,
        wallet,
        executor_verified: verified,
        execution_ready: verified,
        runtime: dcaRuntime(settings, wallets)
      });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_wallet_allowlist_update_failed" });
    }
  });

  router.post("/dca/limits", async (req, res) => {
    if (!requireDca(res)) return undefined;
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
    if (!requireDca(res)) return undefined;
    try {
      const [settings, tokens, wallets] = await Promise.all([
        dcaRepository.getSettings(),
        dcaRepository.listAllowlistedTokens(),
        dcaRepository.listWallets()
      ]);
      const result = validateDcaSchedule(req.body || {}, {
        settings,
        allowlistedTokens: new Set(tokens.filter((token) => token.auto_buy_enabled !== false).map((token) => token.token_mint)),
        allowlistedWallets: new Set(
          wallets
            .filter((wallet) => wallet.enabled === true && wallet.verified === true)
            .map((wallet) => wallet.wallet_address)
        ),
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
    if (!requireDca(res)) return undefined;
    const id = String(req.params.id || "");
    const action = String(req.params.action || "").toLowerCase();
    if (!validUuid(id)) return res.status(400).json({ ok: false, error: "invalid_schedule_id" });
    const statusByAction = { start: "active", pause: "paused", resume: "active", cancel: "cancelled" };
    const status = statusByAction[action];
    if (!status) return res.status(404).json({ ok: false, error: "unknown_dca_action" });
    try {
      if (["start", "resume"].includes(action)) {
        const [settings, schedule] = await Promise.all([
          dcaRepository.getSettings(),
          dcaRepository.getSchedule(id)
        ]);
        const walletAddress = String(schedule?.wallet_address || settings.wallet_address || "").trim();
        const walletReady = Boolean(trader && typeof trader.configured === "function" && trader.configured(walletAddress));
        if (!settings.enabled || !settings.execution_enabled || settings.paused || settings.emergency_stop || !walletReady) {
          return res.status(409).json({
            ok: false,
            error: "dca_activation_incomplete",
            wallet_address: walletAddress || null,
            wallet_executor_verified: walletReady
          });
        }
      }
      const schedule = await dcaRepository.setScheduleStatus({ id, status, actorTelegramId: req.ownerTelegramId });
      return schedule ? res.json({ ok: true, schedule }) : res.status(404).json({ ok: false, error: "schedule_not_found" });
    } catch {
      return res.status(500).json({ ok: false, error: "dca_schedule_update_failed" });
    }
  });

  router.post("/dca/enable", async (req, res) => {
    if (!requireDca(res)) return undefined;
    try {
      const [settings, wallets] = await Promise.all([
        dcaRepository.getSettings(),
        dcaRepository.listWallets()
      ]);
      const runtime = dcaRuntime(settings, wallets);
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
    if (!requireDca(res)) return undefined;
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
    if (!requireDca(res) || !dcaWorker) return undefined;
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
