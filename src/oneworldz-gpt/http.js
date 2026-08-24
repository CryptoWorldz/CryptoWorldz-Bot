const ALLOWED_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com",
  "https://cryptoworldz.xyz",
  "https://www.cryptoworldz.xyz",
  "https://donateworldz.com",
  "https://www.donateworldz.com",
  "https://foodworldz.com",
  "https://www.foodworldz.com",
  "https://learn.oneworldz.com",
  "https://law.oneworldz.com",
  "https://purplediamondcrew.com",
  "https://www.purplediamondcrew.com"
]);

const PUBLIC_GPT_GUARD = Object.freeze({
  profile: "oneworldz-public-low-cost-v1",
  model: "gpt-4o-mini",
  maxOutputTokens: 320,
  perIpLimit: 8,
  dailyLimit: 1000
});

const ROUTES = Object.freeze({
  reagan: { label: "Reagan & Children", href: "https://donateworldz.com/reagan-children/" },
  community: { label: "Community Impact", href: "https://donateworldz.com/community-impact/" },
  davis: { label: "Davis Family", href: "https://donateworldz.com/davis-family/" },
  jayjay: { label: "Support JayJayTeamDev", href: "https://donateworldz.com/jayjayteamdev/" },
  donate: { label: "DonateWorldz", href: "https://donateworldz.com/" },
  food: { label: "FoodWorldz", href: "https://foodworldz.com/" },
  ground: { label: "Purple Diamond Crew — On the Ground", href: "https://purplediamondcrew.com/" },
  learn: { label: "Learn.OneWorldz", href: "https://learn.oneworldz.com/" },
  law: { label: "Law.OneWorldz", href: "https://law.oneworldz.com/" },
  crypto: { label: "CryptoWorldz", href: "https://cryptoworldz.xyz/" },
  home: { label: "OneWorldz", href: "https://oneworldz.com/" }
});

function extractOpenAIText(payload) {
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-4).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim().slice(0, 1000);
    return role && content ? [{ role, content }] : [];
  });
}

function suggestedRoutes(text = "") {
  const value = String(text).toLowerCase();
  const keys = [];
  const add = (key) => { if (!keys.includes(key)) keys.push(key); };

  if (/reagan|uganda|action spreads smiles|children|orphan/.test(value)) add("reagan");
  if (/community impact|community support|35|cause|causes/.test(value)) add("community");
  if (/davis family|davis/.test(value)) add("davis");
  if (/jayjay|teamdev|developer support|support the build/.test(value)) add("jayjay");
  if (/food|meal|hunger|garden|gardening|grow|water/.test(value)) add("food");
  if (/volunteer|on the ground|blanket|tent|repair|purple diamond/.test(value)) add("ground");
  if (/learn|education|research|swift grow|skill/.test(value)) add("learn");
  if (/law|policy|robin hood|rights/.test(value)) add("law");
  if (/crypto|blockchain|token|solana|ethereum|base|bnb|xrp/.test(value)) add("crypto");
  if (/donate|support|give|payment/.test(value)) add("donate");
  if (!keys.length) add("home");
  return keys.slice(0, 4).map((key) => ROUTES[key]);
}

function corsForPublicGuide(req, res, next) {
  const origin = String(req.get("origin") || "").trim();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  return next();
}

function createRateLimiter({ limit = 8, windowMs = 10 * 60 * 1000 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || "unknown");
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > limit) return res.status(429).json({ ok: false, error: "rate_limited" });
    return next();
  };
}

function createDailyLimiter({ limit = 1000 } = {}) {
  let day = new Date().toISOString().slice(0, 10);
  let count = 0;
  return (req, res, next) => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      count = 0;
    }
    count += 1;
    if (count > limit) return res.status(429).json({ ok: false, error: "daily_limit_reached" });
    return next();
  };
}

async function moderateInput({ apiKey, input, fetchImpl = globalThis.fetch }) {
  const response = await fetchImpl("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`openai_moderation_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return Boolean(payload?.results?.[0]?.flagged);
}

async function askOneWorldzGPT({ apiKey, model, message, history = [], page = "oneworldz", maxOutputTokens = 320, fetchImpl = globalThis.fetch }) {
  if (!apiKey) {
    const error = new Error("openai_api_not_configured");
    error.status = 503;
    throw error;
  }

  const cleanMessage = String(message || "").trim().slice(0, 1200);
  if (!cleanMessage) {
    const error = new Error("message_required");
    error.status = 400;
    throw error;
  }

  if (await moderateInput({ apiKey, input: cleanMessage, fetchImpl })) {
    const error = new Error("message_not_supported");
    error.status = 400;
    throw error;
  }

  const input = [
    ...normalizeHistory(history),
    { role: "user", content: cleanMessage }
  ];

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: maxOutputTokens,
      instructions: [
        "You are OneWorldz GPT, the shared public AI guide for OneWorldz Full Support and the CryptoWorldz GTP surface.",
        "Mission: Helping the People Who Help People. Keep the tone clear, practical, respectful and hopeful.",
        "OneWorldz is the human/global gateway. CryptoWorldz is the separate crypto and blockchain branch. Do not turn ordinary OneWorldz questions into crypto promotion.",
        "The four separated support pathways are Reagan & Children at https://donateworldz.com/reagan-children/ ; Community Impact at https://donateworldz.com/community-impact/ ; Davis Family at https://donateworldz.com/davis-family/ ; Support JayJayTeamDev at https://donateworldz.com/jayjayteamdev/ .",
        "PurpleDiamondCrew.com is the hands-on On the Ground action pathway. FoodWorldz.com is food relief, growing, water and practical food-system projects. Learn.OneWorldz.com is practical learning and research. Law.OneWorldz.com is public-interest policy education and is not individual legal advice.",
        "The 2026–2030 Help the People movement includes the planned march, concert, community action, purposeful travel, sponsors, learning and practical projects. Do not claim an event, sponsor, partnership or deployment is confirmed unless the user supplies confirmed evidence.",
        "Never request or accept card numbers, bank details, passwords, API keys, wallet seed phrases, private keys or other secrets. Direct payment actions must happen only on the approved DonateWorldz/Stripe payment pages, not in chat.",
        "Do not claim donations are tax deductible, guaranteed to reach a recipient, or already transferred unless that fact is explicitly verified by the system.",
        "Do not give individual legal, medical or financial advice. Explain general information and route users to appropriate professional or official sources where necessary.",
        "Keep responses concise. When useful, finish with one short action the visitor can take next.",
        `Current website surface: ${String(page || "oneworldz").slice(0, 80)}.`
      ].join(" "),
      input
    }),
    signal: AbortSignal.timeout(30000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload?.error?.code || payload?.error?.type || "");
    const quota = code === "insufficient_quota" || code === "billing_hard_limit_reached";
    const error = new Error(quota ? "openai_quota_exhausted" : `openai_api_${response.status}`);
    error.status = response.status;
    throw error;
  }

  const text = extractOpenAIText(payload);
  return {
    text: text || "I can help you find the right OneWorldz support pathway.",
    suggestions: suggestedRoutes(`${cleanMessage}\n${text}`),
    response_id: payload.id || null,
    usage: payload.usage || null
  };
}

function registerOneWorldzGptRoutes({ app }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = PUBLIC_GPT_GUARD.model;
  const maxOutputTokens = PUBLIC_GPT_GUARD.maxOutputTokens;
  const perIpLimit = PUBLIC_GPT_GUARD.perIpLimit;
  const dailyLimit = PUBLIC_GPT_GUARD.dailyLimit;
  const rateLimit = createRateLimiter({ limit: perIpLimit });
  const dailyRateLimit = createDailyLimiter({ limit: dailyLimit });

  app.use("/api/oneworldz-gpt", corsForPublicGuide);

  app.get("/api/oneworldz-gpt/status", (req, res) => {
    res.json({
      ok: true,
      service: "OneWorldz GPT",
      openai_api_configured: Boolean(apiKey),
      guard_profile: PUBLIC_GPT_GUARD.profile,
      guard_enforced: true,
      model,
      max_output_tokens: maxOutputTokens,
      per_ip_limit_10m: perIpLimit,
      daily_request_limit: dailyLimit,
      mode: "public_guidance",
      payments_in_chat: false,
      secrets_in_browser: false
    });
  });

  app.post("/api/oneworldz-gpt/chat", dailyRateLimit, rateLimit, async (req, res) => {
    try {
      const result = await askOneWorldzGPT({
        apiKey,
        model,
        message: req.body?.message,
        history: req.body?.history,
        page: req.body?.page,
        maxOutputTokens
      });
      const { usage, ...publicResult } = result;
      if (usage) {
        console.info(JSON.stringify({
          event: "oneworldz_gpt_usage",
          model,
          response_id: result.response_id,
          input_tokens: Number(usage.input_tokens || 0),
          output_tokens: Number(usage.output_tokens || 0),
          total_tokens: Number(usage.total_tokens || 0)
        }));
      }
      return res.json({ ok: true, service: "OneWorldz GPT", powered_by: "OpenAI", ...publicResult });
    } catch (error) {
      const status = Number(error?.status) || 500;
      return res.status(status).json({ ok: false, error: error?.message || "oneworldz_gpt_failed" });
    }
  });
}

module.exports = {
  ALLOWED_ORIGINS,
  PUBLIC_GPT_GUARD,
  ROUTES,
  askOneWorldzGPT,
  corsForPublicGuide,
  createDailyLimiter,
  createRateLimiter,
  extractOpenAIText,
  moderateInput,
  normalizeHistory,
  registerOneWorldzGptRoutes,
  suggestedRoutes
};
