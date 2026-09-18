const {
  ONEWORLDZ_GPT_ORIGINS,
  extractOpenAIText,
  normalizeGuideHistory,
  suggestedGuideRoutes
} = require("./live-v1");

const buckets = new Map();

function allowRequest(req) {
  const now = Date.now();
  const key = String(req.ip || req.socket?.remoteAddress || "unknown");
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 24;
}

function setCors(req, res) {
  const origin = String(req.get("origin") || "").trim();
  if (origin && ONEWORLDZ_GPT_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  }
}

function safeOpenAIErrorCode(payload) {
  const value = String(payload?.error?.code || payload?.error?.type || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .slice(0, 80);
  return value || "unknown";
}

async function moderateWithFallback(apiKey, input) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (response.ok) {
    return { flagged: Boolean(payload?.results?.[0]?.flagged), mode: "openai_moderation" };
  }

  const code = safeOpenAIErrorCode(payload);
  if (response.status === 429) {
    console.warn("OneWorldz GPT moderation rate-limited; relying on Responses API safety", { code });
    return { flagged: false, mode: "responses_api_safety_fallback" };
  }

  const error = new Error(`openai_moderation_${response.status}_${code}`);
  error.status = response.status === 401 || response.status === 403 ? response.status : 502;
  throw error;
}

async function askOpenAI({ message, history, page }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = String(process.env.ONEWORLDZ_OPENAI_MODEL || process.env.HUB_OPENAI_MODEL || "gpt-5.6").trim();
  if (!apiKey) {
    const error = new Error("openai_api_not_configured");
    error.status = 503;
    throw error;
  }

  const cleanMessage = String(message || "").trim().slice(0, 2500);
  if (!cleanMessage) {
    const error = new Error("message_required");
    error.status = 400;
    throw error;
  }

  const moderation = await moderateWithFallback(apiKey, cleanMessage);
  if (moderation.flagged) {
    const error = new Error("message_not_supported");
    error.status = 400;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      instructions: [
        "You are OneWorldz GPT, the public AI guide for OneWorldz Full Support.",
        "Mission: Helping the People Who Help People. Be clear, practical, respectful and concise.",
        "OneWorldz is the human/global gateway. CryptoWorldz is the separate crypto and blockchain branch. Do not turn normal OneWorldz questions into crypto promotion.",
        "Keep the three support pathways separate: Reagan & Children at https://donateworldz.com/reagan-children/ ; Community Impact at https://donateworldz.com/community-impact/ ; Support JayJayTeamDev at https://donateworldz.com/jayjayteamdev/ .",
        "PurpleDiamondCrew.com is On the Ground action. FoodWorldz.com covers food relief, growing, water and food-system projects. Learn.OneWorldz.com covers practical learning and research. Law.OneWorldz.com is public-interest policy information and not individual legal advice.",
        "The 2026–2030 Help the People movement is a planned march, concert and participation movement. Never invent a confirmed event, sponsor, partner, donation, deployment status or endorsement.",
        "Never ask for card numbers, bank details, passwords, API keys, wallet seed phrases or private keys. Payments happen only on approved DonateWorldz/Stripe pages, never in chat.",
        "Do not claim tax deductibility or completed fund transfers unless explicitly verified. Do not give individual legal, medical or financial advice.",
        "When useful, finish with one short next action.",
        `Current website surface: ${String(page || "oneworldz").slice(0, 80)}.`
      ].join(" "),
      input: [...normalizeGuideHistory(history), { role: "user", content: cleanMessage }]
    }),
    signal: AbortSignal.timeout(45000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = safeOpenAIErrorCode(payload);
    const error = new Error(`openai_api_${response.status}_${code}`);
    error.status = response.status;
    throw error;
  }

  const text = extractOpenAIText(payload) || "I can help you find the right OneWorldz support pathway.";
  return {
    text,
    suggestions: suggestedGuideRoutes(`${cleanMessage}\n${text}`),
    response_id: payload.id || null,
    model,
    moderation_mode: moderation.mode
  };
}

function registerOneWorldzGptGateway(app) {
  if (!app || typeof app.post !== "function") throw new Error("express_app_required");

  app.options("/api/oneworldz-gpt/chat", (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });

  app.post("/api/oneworldz-gpt/chat", async (req, res) => {
    setCors(req, res);
    res.set("Cache-Control", "no-store, max-age=0");
    if (!allowRequest(req)) return res.status(429).json({ ok: false, error: "rate_limited" });
    try {
      const result = await askOpenAI({
        message: req.body?.message,
        history: req.body?.history,
        page: req.body?.page
      });
      return res.json({ ok: true, service: "OneWorldz GPT", powered_by: "OpenAI", ...result });
    } catch (error) {
      return res.status(Number(error?.status) || 500).json({ ok: false, error: error?.message || "oneworldz_gpt_failed" });
    }
  });
}

module.exports = { askOpenAI, moderateWithFallback, registerOneWorldzGptGateway, safeOpenAIErrorCode };
