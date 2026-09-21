// Compatibility marker: startProtectedPublicFallback
// Full CryptoWorldz runtime is preserved in src/full-runtime-entry.js: require("./src/hub-central/preload")
// The full runtime remains primary when configured; the dependency-free protected GPT gateway below is fail-safe fallback only.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { loadProtectedEnvironment } = require("./src/protected-env");

const GUARD = Object.freeze({
  profile: "oneworldz-public-low-cost-v1",
  model: "gpt-4o-mini",
  maxOutputTokens: 320,
  perIpLimit: 8,
  dailyLimit: 1000
});

const ALLOWED_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com",
  "https://donateworldz.com",
  "https://www.donateworldz.com",
  "https://foodworldz.com",
  "https://www.foodworldz.com",
  "https://learn.oneworldz.com",
  "https://law.oneworldz.com",
  "https://purplediamondcrew.com",
  "https://www.purplediamondcrew.com"
]);

const protectedEnvironment = loadProtectedEnvironment({ appRoot: __dirname });

// Hostinger masks managed Node environment values when they are read through its API.
// Normalise the supported server-side aliases at runtime instead of trying to copy
// masked values into .env. Supabase URL and publishable key are public project config.
process.env.BOT_TOKEN = String(
  process.env.BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_TOKEN ||
  process.env.ZED_BOT_TOKEN ||
  process.env.CRYPTOWORLDZ_BOT_TOKEN ||
  ""
).trim();
process.env.SUPABASE_URL = String(
  process.env.SUPABASE_URL || "https://hknymhhyqldtzmplzuzh.supabase.co"
).trim();
process.env.SUPABASE_PUBLISHABLE_KEY = String(
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_3ognbqSCTAcAnLHOeKZp8A_IgriwUJV"
).trim();

const fullRuntimeConfigured =
  Boolean(process.env.BOT_TOKEN) &&
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim());
if (fullRuntimeConfigured) {
  try {
    require("./src/full-runtime-entry");
    return;
  } catch (error) {
    console.error("Full runtime unavailable; starting protected public gateway", error && error.message ? error.message : error);
  }
}

const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
const buckets = new Map();
let dailyDay = new Date().toISOString().slice(0, 10);
let dailyCount = 0;

const MINIAPP_ROOT = path.join(__dirname, "public", "miniapp");
const MINIAPP_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
});

function serveFallbackMiniapp(req, res, pathname) {
  if (!["GET", "HEAD"].includes(req.method || "")) return false;
  if (pathname !== "/miniapp" && !pathname.startsWith("/miniapp/")) return false;

  const relative = pathname === "/miniapp" || pathname === "/miniapp/"
    ? "index.html"
    : decodeURIComponent(pathname.slice("/miniapp/".length));
  const resolved = path.resolve(MINIAPP_ROOT, relative);
  if (resolved !== MINIAPP_ROOT && !resolved.startsWith(MINIAPP_ROOT + path.sep)) {
    sendJson(res, 400, { ok: false, error: "invalid_path" });
    return true;
  }

  let stat;
  try { stat = fs.statSync(resolved); } catch { stat = null; }
  const file = stat && stat.isDirectory() ? path.join(resolved, "index.html") : resolved;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return true;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", MINIAPP_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "HEAD") return void res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

function sendJson(res, status, payload, origin = "") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.end(JSON.stringify(payload));
}

function rateAllowed(ip) {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= GUARD.perIpLimit;
}

function dailyAllowed() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyDay) {
    dailyDay = today;
    dailyCount = 0;
  }
  dailyCount += 1;
  return dailyCount <= GUARD.dailyLimit;
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-4).flatMap((item) => {
    const role = item && item.role === "assistant" ? "assistant" : item && item.role === "user" ? "user" : null;
    const content = String(item && item.content || "").trim().slice(0, 1000);
    return role && content ? [{ role, content }] : [];
  });
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 32768) throw Object.assign(new Error("payload_too_large"), { status: 413 });
  }
  try { return body ? JSON.parse(body) : {}; }
  catch { throw Object.assign(new Error("invalid_json"), { status: 400 }); }
}

function extractText(payload) {
  const chunks = [];
  for (const item of payload && payload.output || []) {
    if (!item || item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content && content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAI(message, history, page) {
  if (!apiKey) throw Object.assign(new Error("openai_api_not_configured"), { status: 503 });
  const cleanMessage = String(message || "").trim().slice(0, 1200);
  if (!cleanMessage) throw Object.assign(new Error("message_required"), { status: 400 });

  const moderation = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input: cleanMessage }),
    signal: AbortSignal.timeout(15000)
  });
  const moderationPayload = await moderation.json().catch(() => ({}));
  if (!moderation.ok) throw Object.assign(new Error(`openai_moderation_${moderation.status}`), { status: moderation.status });
  if (moderationPayload && moderationPayload.results && moderationPayload.results[0] && moderationPayload.results[0].flagged) {
    throw Object.assign(new Error("message_not_supported"), { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GUARD.model,
      store: false,
      max_output_tokens: GUARD.maxOutputTokens,
      instructions: [
        "You are OneWorldz GPT, the public AI guide for OneWorldz Full Support.",
        "Keep responses clear, practical, respectful and concise.",
        "Never request passwords, API keys, wallet seed phrases, private keys, card numbers or bank credentials.",
        "Payments happen only on approved DonateWorldz pages, never inside chat.",
        "Do not claim donations, sponsors, partnerships or deployments are confirmed unless verified.",
        `Current website surface: ${String(page || "oneworldz").slice(0, 80)}.`
      ].join(" "),
      input: [...cleanHistory(history), { role: "user", content: cleanMessage }]
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload && payload.error && (payload.error.code || payload.error.type) || "");
    const quota = code === "insufficient_quota" || code === "billing_hard_limit_reached";
    throw Object.assign(new Error(quota ? "openai_quota_exhausted" : `openai_api_${response.status}`), { status: response.status });
  }
  const usage = payload.usage || null;
  if (usage) {
    console.info(JSON.stringify({
      event: "oneworldz_gpt_usage",
      model: GUARD.model,
      input_tokens: Number(usage.input_tokens || 0),
      output_tokens: Number(usage.output_tokens || 0),
      total_tokens: Number(usage.total_tokens || 0)
    }));
  }
  return {
    text: extractText(payload) || "I can help you find the right OneWorldz support pathway.",
    response_id: payload.id || null
  };
}

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || "").trim();
  const url = new URL(req.url || "/", "http://localhost");

  if (serveFallbackMiniapp(req, res, url.pathname)) return;

  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/oneworldz-gpt")) {
    res.statusCode = 204;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/") {
    return sendJson(res, 200, {
      ok: true,
      service: "CryptoWorldz Protected Public Gateway",
      runtime: "dependency_free_guard_v2",
      environment_source: protectedEnvironment.source,
      full_runtime_configured: fullRuntimeConfigured,
      bot_token_configured: Boolean(process.env.BOT_TOKEN),
      supabase_runtime_key_configured: Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim())
    }, origin);
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 503, {
      ok: false,
      ready: false,
      degraded: true,
      service: "CryptoWorldz Protected Public Gateway",
      runtime: "dependency_free_guard_v2",
      reason: "full_zed_runtime_unavailable"
    }, origin);
  }

  if (req.method === "GET" && url.pathname === "/api/oneworldz-gpt/status") {
    return sendJson(res, 200, {
      ok: true,
      service: "OneWorldz GPT",
      openai_api_configured: Boolean(apiKey),
      guard_profile: GUARD.profile,
      guard_enforced: true,
      model: GUARD.model,
      max_output_tokens: GUARD.maxOutputTokens,
      per_ip_limit_10m: GUARD.perIpLimit,
      daily_request_limit: GUARD.dailyLimit,
      mode: "public_guidance",
      payments_in_chat: false,
      secrets_in_browser: false,
      runtime: "dependency_free_guard_v2"
    }, origin);
  }

  if (req.method === "POST" && url.pathname === "/api/oneworldz-gpt/chat") {
    const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket.remoteAddress || "unknown").trim();
    if (!dailyAllowed()) return sendJson(res, 429, { ok: false, error: "daily_limit_reached" }, origin);
    if (!rateAllowed(ip)) return sendJson(res, 429, { ok: false, error: "rate_limited" }, origin);
    try {
      const body = await readJson(req);
      const result = await callOpenAI(body.message, body.history, body.page);
      return sendJson(res, 200, { ok: true, service: "OneWorldz GPT", powered_by: "OpenAI", ...result }, origin);
    } catch (error) {
      return sendJson(res, Number(error && error.status) || 500, {
        ok: false,
        error: String(error && error.message || "oneworldz_gpt_failed")
      }, origin);
    }
  }

  return sendJson(res, 404, { ok: false, error: "not_found" }, origin);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`CryptoWorldz protected public gateway listening on ${port} • dependency_free_guard_v2`);
});
