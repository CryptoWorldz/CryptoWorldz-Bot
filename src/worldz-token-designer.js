const { createRequestLimiter } = require("./miniapp-auth");

const ALLOWED_ORIGINS = new Set([
  "https://launchpad.cryptoworldz.xyz",
  "https://cryptoworldz.xyz",
  "https://www.cryptoworldz.xyz"
]);

function extractText(payload) {
  const out = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item.content || []) {
      if (part?.type === "output_text" && part.text) out.push(part.text);
    }
  }
  return out.join("\n").trim();
}

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function cors(req, res, next) {
  const origin = clean(req.get("origin"), 200);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  return next();
}

function normalizeDesign(body = {}) {
  const supply = Number(body.supply);
  const budgetAud = Number(body.budget_aud);
  return {
    creator_mode: clean(body.creator_mode, 40) || "Beginner",
    token_name: clean(body.token_name, 60) || "Undecided",
    symbol: clean(body.symbol, 16).toUpperCase() || "Undecided",
    primary_chain: clean(body.primary_chain, 40) || "Solana",
    supply: Number.isFinite(supply) && supply > 0 ? Math.floor(supply) : null,
    budget_aud: Number.isFinite(budgetAud) && budgetAud >= 0 ? budgetAud : null,
    purpose: clean(body.purpose, 700),
    audience: clean(body.audience, 300),
    distribution_priorities: clean(body.distribution_priorities, 500),
    liquidity_preference: clean(body.liquidity_preference, 80) || "Undecided",
    cross_chain_targets: Array.isArray(body.cross_chain_targets)
      ? body.cross_chain_targets.map((x) => clean(x, 40)).filter(Boolean).slice(0, 10)
      : [],
    notes: clean(body.notes, 500)
  };
}

async function moderate(apiKey, input) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error("moderation_unavailable"), { status: 503 });
  return Boolean(payload?.results?.[0]?.flagged);
}

function registerWorldzTokenDesigner({ app }) {
  const apiKey = clean(process.env.OPENAI_API_KEY, 300);
  const model = clean(process.env.WORLDZ_TOKEN_DESIGN_MODEL, 80) || "gpt-4o-mini";
  const perIp = createRequestLimiter({ maxEvents: 6, intervalMs: 10 * 60 * 1000 });
  let day = new Date().toISOString().slice(0, 10);
  let daily = 0;
  const dailyLimit = Math.max(1, Math.min(5000, Number(process.env.WORLDZ_TOKEN_DESIGN_DAILY_LIMIT) || 300));

  app.use("/api/worldz-token-designer", cors);

  app.get("/api/worldz-token-designer/status", (req, res) => {
    return res.json({
      ok: true,
      service: "Worldz Token Designer",
      powered_by: "OpenAI API",
      configured: Boolean(apiKey),
      model,
      visitor_price: "FREE_WITHIN_WORLDZ_PUBLIC_ALLOWANCE",
      api_billing: "WORLDZ_SERVER_SIDE",
      browser_api_key_required: false,
      execution_enabled: false,
      daily_limit: dailyLimit
    });
  });

  app.post("/api/worldz-token-designer/design", async (req, res) => {
    const origin = clean(req.get("origin"), 200);
    if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
    if (!perIp(`${req.ip}:token-designer`)) return res.status(429).json({ ok: false, error: "rate_limited" });

    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) { day = today; daily = 0; }
    daily += 1;
    if (daily > dailyLimit) return res.status(429).json({ ok: false, error: "daily_allowance_reached" });
    if (!apiKey) return res.status(503).json({ ok: false, error: "openai_api_not_configured", fallback: "USE_LOCAL_PROMPT_BUILDER" });

    const design = normalizeDesign(req.body);
    if (!design.purpose) return res.status(400).json({ ok: false, error: "purpose_required" });

    const userText = [
      "Design a crypto token plan from this creator brief.",
      JSON.stringify(design, null, 2)
    ].join("\n\n");

    try {
      if (await moderate(apiKey, userText)) return res.status(400).json({ ok: false, error: "design_not_supported" });

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 900,
          instructions: [
            "You are Worldz Token Design GPT inside WorldzLaunchPad.",
            "Create a practical token design draft, not investment advice and not a promise of profit.",
            "Return these headings in order: TOKEN IDENTITY; PURPOSE + UTILITY; CHAIN ARCHITECTURE; SUPPLY + DISTRIBUTION; LIQUIDITY PLAN; STARTING PRICE METHOD; FEES + TREASURY; SECURITY + PROOF; CROSS-CHAIN PLAN; NEXT 5 ACTIONS.",
            "Percent allocations must add to exactly 100%. If this is a WorldzLaunchPad launch, include the mandatory disclosed 0.60% genesis allocation: 0.30% Worldz Operations Multisig, 0.18% Miricle Team Multisig, 0.12% Purple Diamond Crew Multisig.",
            "Treat a creator's stated budget as personal capital unless they explicitly say otherwise.",
            "For Meteora DAMM v2, distinguish BUY, LP DEPOSIT and one-sided launch behavior. Never invent exact live LP token/SOL requirements; say to run the Worldz live LP calculator for the exact pool quote.",
            "For starting price, give a method and at most three example scenarios based on supply/circulating supply/budget. Do not present a guessed price as correct.",
            "For multichain design, keep one canonical economic supply. Wrapped or represented supply must be backed by lock/burn/reserve accounting; do not multiply the total supply on every chain.",
            "Robinhood or other centralized listings are targets requiring provider approval, never guaranteed launch destinations.",
            "Do not suggest wash trading, fake volume, deceptive buys, undisclosed self-dealing or artificial market activity.",
            "Use concise plain English. Flag any missing information needed before an irreversible transaction."
          ].join(" "),
          input: userText
        }),
        signal: AbortSignal.timeout(30000)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = clean(payload?.error?.code || payload?.error?.type, 100);
        const quota = code === "insufficient_quota" || code === "billing_hard_limit_reached";
        return res.status(quota ? 503 : response.status).json({ ok: false, error: quota ? "worldz_ai_allowance_unavailable" : "openai_response_failed" });
      }

      const text = extractText(payload);
      if (!text) return res.status(502).json({ ok: false, error: "empty_ai_design" });
      return res.json({
        ok: true,
        service: "Worldz Token Designer",
        powered_by: "OpenAI API",
        model,
        execution_enabled: false,
        design: text,
        input: design
      });
    } catch (error) {
      return res.status(Number(error?.status) || 500).json({ ok: false, error: clean(error?.message, 120) || "token_design_failed" });
    }
  });
}

module.exports = {
  ALLOWED_ORIGINS,
  extractText,
  normalizeDesign,
  registerWorldzTokenDesigner
};
