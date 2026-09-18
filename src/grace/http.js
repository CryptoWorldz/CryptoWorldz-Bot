const crypto = require("node:crypto");

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function oauthResultPage({ ok, title, message }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f051d;color:#fff;font-family:system-ui,sans-serif;padding:24px}main{max-width:560px;padding:32px;border:1px solid #8a2be2;border-radius:22px;background:#1a0b2e;box-shadow:0 18px 60px rgba(0,0,0,.45)}h1{margin:0 0 16px;font-size:1.8rem}p{line-height:1.55;color:#e4d6f7}.status{font-weight:800;color:${ok ? "#9fffb0" : "#ffb3c0"}}</style></head><body><main><div class="status">${ok ? "CONNECTED" : "NOT CONNECTED"}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p>You may now close this page and return to Telegram.</p></main></body></html>`;
}

function secureOAuthHeaders(res) {
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  });
}

function registerGraceRoutes({ app, graceRepository, graceOAuth = null, graceFacebookOAuth = null, apiSecret = process.env.GRACE_API_SECRET || "" }) {
  app.get("/grace/health", (req, res) => {
    res.json({
      ok: true,
      service: "grace-social-engine",
      stage3_power_upgrade: true,
      campaign_centre: true,
      analytics: true,
      ads_budget_controls: true,
      automatic_ad_spend: false,
      posting: "approval-controlled",
      x_oauth_configured: Boolean(graceOAuth?.configured?.()),
      facebook_oauth_configured: Boolean(graceFacebookOAuth?.configured?.()),
      facebook_redirect: "/grace/oauth/facebook/callback"
    });
  });

  app.get("/grace/oauth/x/callback", async (req, res) => {
    secureOAuthHeaders(res);
    if (!graceOAuth) return res.status(503).send(oauthResultPage({ ok: false, title: "Grace X Connection Unavailable", message: "The Grace X connection service is not configured on this server." }));
    try {
      const result = await graceOAuth.completeConnection({ state: req.query.state, code: req.query.code, error: req.query.error, errorDescription: req.query.error_description });
      return res.status(200).send(oauthResultPage({ ok: true, title: `@${result.user.username} Connected to Grace`, message: "The exact approved CryptoWorldz X account was verified. Posting remains approval-controlled through Zed." }));
    } catch (error) {
      console.error("Grace X OAuth callback failed", { code: error?.code || "UNKNOWN" });
      return res.status(400).send(oauthResultPage({ ok: false, title: "Grace X Connection Rejected", message: error?.message || "The X account could not be connected." }));
    }
  });

  app.get("/grace/oauth/facebook/callback", async (req, res) => {
    secureOAuthHeaders(res);
    if (!graceFacebookOAuth) return res.status(503).send(oauthResultPage({ ok: false, title: "Grace Facebook Connection Unavailable", message: "The Grace Facebook connection service is not configured on this server." }));
    try {
      const result = await graceFacebookOAuth.completeConnection({ state: req.query.state, code: req.query.code, error: req.query.error, errorDescription: req.query.error_description || req.query.error_message });
      return res.status(200).send(oauthResultPage({ ok: true, title: `${result.page.name} Connected to Grace`, message: "The approved CryptoWorldz Facebook Page was verified. Admin scheduling remains approval-controlled through Grace." }));
    } catch (error) {
      console.error("Grace Facebook OAuth callback failed", { code: error?.code || "UNKNOWN" });
      return res.status(400).send(oauthResultPage({ ok: false, title: "Grace Facebook Connection Rejected", message: error?.message || "The Facebook Page could not be connected." }));
    }
  });

  const authorize = (req, res, next) => {
    const supplied = req.get("x-grace-api-secret");
    if (!apiSecret || !safeEqual(supplied, apiSecret)) return res.status(401).json({ ok: false, error: "Unauthorized" });
    return next();
  };

  app.get("/api/grace/status", authorize, async (req, res) => {
    try {
      const status = await graceRepository.getStatus();
      const monthlySpend = await graceRepository.getMonthlySpend();
      return res.json({ ok: true, status, monthly_spend_usd: monthlySpend });
    } catch { return res.status(500).json({ ok: false, error: "Grace status unavailable" }); }
  });

  app.get("/api/grace/accounts", authorize, async (req, res) => {
    try { return res.json({ ok: true, accounts: await graceRepository.listAccounts() }); }
    catch { return res.status(500).json({ ok: false, error: "Grace accounts unavailable" }); }
  });

  app.get("/api/grace/calendar", authorize, async (req, res) => {
    try {
      const days = Math.max(1, Math.min(Number(req.query.days) || 7, 31));
      return res.json({ ok: true, days, posts: await graceRepository.listCalendar(days) });
    } catch { return res.status(500).json({ ok: false, error: "Grace calendar unavailable" }); }
  });
}

module.exports = { escapeHtml, oauthResultPage, registerGraceRoutes, safeEqual, secureOAuthHeaders };
