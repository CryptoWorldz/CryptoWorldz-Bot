const { createRequestLimiter, validateTelegramInitData } = require("../miniapp-auth");

function registerAutoMiniRoutes({ app, config, autoClient }) {
  const allowRequest = createRequestLimiter({ maxEvents: 30, intervalMs: 60000 });

  function authenticateOwner(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (String(result.user.id) !== String(config.ownerTelegramId)) {
      return res.status(403).json({ ok: false, error: "owner_required" });
    }
    if (!allowRequest(`${result.user.id}:${req.ip}`)) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }
    if (!autoClient.configured()) {
      return res.status(503).json({ ok: false, error: "auto_not_configured" });
    }
    req.telegramUser = result.user;
    return next();
  }

  app.get("/api/mini/auto/status", authenticateOwner, async (req, res) => {
    try {
      return res.json(await autoClient.status());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_status_failed" });
    }
  });

  app.post("/api/mini/auto/simulate", authenticateOwner, async (req, res) => {
    try {
      return res.json(await autoClient.simulate(req.body || {}));
    } catch (error) {
      const status = error.payload?.result?.errors ? 400 : 502;
      return res.status(status).json(error.payload || { ok: false, error: error.code || "auto_simulation_failed" });
    }
  });

  app.post("/api/mini/auto/pause", authenticateOwner, async (req, res) => {
    try {
      return res.json(await autoClient.pause());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_pause_failed" });
    }
  });

  app.post("/api/mini/auto/resume", authenticateOwner, async (req, res) => {
    try {
      return res.json(await autoClient.resumeSimulation());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_resume_failed" });
    }
  });

  app.post("/api/mini/auto/emergency-stop", authenticateOwner, async (req, res) => {
    try {
      return res.json(await autoClient.emergencyStop());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_emergency_stop_failed" });
    }
  });
}

module.exports = { registerAutoMiniRoutes };
