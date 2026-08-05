const crypto = require("node:crypto");

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function registerGraceRoutes({ app, graceRepository, apiSecret = process.env.GRACE_API_SECRET || "" }) {
  app.get("/grace/health", (req, res) => {
    res.json({ ok: true, service: "grace-social-engine", posting: "approval-controlled" });
  });

  const authorize = (req, res, next) => {
    const supplied = req.get("x-grace-api-secret");
    if (!apiSecret || !safeEqual(supplied, apiSecret)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    return next();
  };

  app.get("/api/grace/status", authorize, async (req, res) => {
    try {
      const status = await graceRepository.getStatus();
      const monthlySpend = await graceRepository.getMonthlySpend();
      return res.json({ ok: true, status, monthly_spend_usd: monthlySpend });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "Grace status unavailable" });
    }
  });

  app.get("/api/grace/accounts", authorize, async (req, res) => {
    try {
      return res.json({ ok: true, accounts: await graceRepository.listAccounts() });
    } catch {
      return res.status(500).json({ ok: false, error: "Grace accounts unavailable" });
    }
  });

  app.get("/api/grace/calendar", authorize, async (req, res) => {
    try {
      const days = Math.max(1, Math.min(Number(req.query.days) || 7, 31));
      return res.json({ ok: true, days, posts: await graceRepository.listCalendar(days) });
    } catch {
      return res.status(500).json({ ok: false, error: "Grace calendar unavailable" });
    }
  });
}

module.exports = { registerGraceRoutes, safeEqual };
