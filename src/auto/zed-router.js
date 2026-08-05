const { createRequestLimiter, validateTelegramInitData } = require("../miniapp-auth");

function registerAutoMiniRoutes({ app, config, autoClient, supabase }) {
  const allowRequest = createRequestLimiter({ maxEvents: 30, intervalMs: 60000 });

  async function authenticateSafety(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    const owner = String(result.user.id) === String(config.ownerTelegramId);
    let executive = false;
    if (!owner && supabase) {
      const { data, error } = await supabase
        .from("executive_admins")
        .select("status")
        .eq("telegram_id", result.user.id)
        .maybeSingle();
      if (error && error.code !== "42P01") {
        return res.status(500).json({ ok: false, error: "executive_access_failed" });
      }
      executive = Boolean(data && data.status === "active");
    }
    if (!owner && !executive) {
      return res.status(403).json({ ok: false, error: "executive_required" });
    }
    if (!allowRequest(`${result.user.id}:${req.ip}`)) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }
    if (!autoClient.configured()) {
      return res.status(503).json({ ok: false, error: "auto_not_configured" });
    }
    req.telegramUser = result.user;
    req.autoAuthority = { owner, executive };
    return next();
  }

  function ownerOnly(req, res, next) {
    if (!req.autoAuthority?.owner) {
      return res.status(403).json({ ok: false, error: "owner_required" });
    }
    return next();
  }

  app.get("/api/mini/auto/status", authenticateSafety, async (req, res) => {
    try {
      const payload = await autoClient.status();
      return res.json({ ...payload, access: req.autoAuthority });
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_status_failed" });
    }
  });

  app.post("/api/mini/auto/simulate", authenticateSafety, ownerOnly, async (req, res) => {
    try {
      return res.json(await autoClient.simulate(req.body || {}));
    } catch (error) {
      const status = error.payload?.result?.errors ? 400 : 502;
      return res.status(status).json(error.payload || { ok: false, error: error.code || "auto_simulation_failed" });
    }
  });

  app.post("/api/mini/auto/pause", authenticateSafety, async (req, res) => {
    try {
      return res.json(await autoClient.pause());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_pause_failed" });
    }
  });

  app.post("/api/mini/auto/resume", authenticateSafety, ownerOnly, async (req, res) => {
    try {
      return res.json(await autoClient.resumeSimulation());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_resume_failed" });
    }
  });

  app.post("/api/mini/auto/emergency-stop", authenticateSafety, async (req, res) => {
    try {
      return res.json(await autoClient.emergencyStop());
    } catch (error) {
      return res.status(502).json({ ok: false, error: error.code || "auto_emergency_stop_failed" });
    }
  });
}

module.exports = { registerAutoMiniRoutes };