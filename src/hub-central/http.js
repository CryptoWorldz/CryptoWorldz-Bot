const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const { validateTelegramInitData } = require("../miniapp-auth");
const {
  WRITE_CONFIRMATION,
  cleanDomain,
  createHostingerClient,
  diagnosePublicDns,
  requireWriteConfirmation
} = require("./hostinger-client");

function safeTokenMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string" || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function bearerToken(req) {
  const value = String(req.get("authorization") || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function hubAuth({ config, hubApiSecret }) {
  return (req, res, next) => {
    if (safeTokenMatch(bearerToken(req), hubApiSecret)) {
      req.hubIdentity = { type: "server", owner: true };
      return next();
    }
    const initData = String(req.get("x-telegram-init-data") || "");
    if (initData) {
      const result = validateTelegramInitData(initData, config.botToken);
      if (result.ok && String(result.user.id) === String(config.ownerTelegramId)) {
        req.hubIdentity = { type: "telegram", owner: true, telegram_id: result.user.id };
        return next();
      }
    }
    return res.status(401).json({ ok: false, error: "hub_owner_auth_required" });
  };
}

function safeError(error) {
  return {
    error: error?.message || "hub_operation_failed",
    status: error?.status || 500,
    provider: error?.payload?.error ? "hostinger" : undefined,
    provider_message: typeof error?.payload?.error === "string" ? error.payload.error.slice(0, 300) : undefined,
    correlation_id: error?.payload?.correlation_id || undefined
  };
}

function extractOpenAIText(payload) {
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) if (content?.type === "output_text" && content.text) chunks.push(content.text);
  }
  return chunks.join("\n").trim();
}

function extractProposals(payload) {
  const proposals = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "function_call") continue;
    let args = {};
    try { args = JSON.parse(item.arguments || "{}"); } catch { args = {}; }
    proposals.push({ call_id: item.call_id || null, action: item.name, arguments: args });
  }
  return proposals;
}

async function askHubAI({ apiKey, model, message, context, fetchImpl = globalThis.fetch }) {
  if (!apiKey) throw new Error("openai_api_not_configured");
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: [
        "You are OneWorldz Hub Central, an owner-controlled operations planner.",
        "Never claim an external change happened unless the server reports it happened.",
        "For Hostinger changes, propose one precise tool call and wait for explicit owner approval.",
        "Prefer diagnosis before writes. Never request passwords, API keys, bank details or private secrets in chat.",
        `Current server context: ${JSON.stringify(context)}`
      ].join(" "),
      input: String(message || "").slice(0, 4000),
      tools: [
        {
          type: "function",
          name: "inspect_domain",
          description: "Inspect public DNS and Hostinger DNS for one domain without changing anything.",
          parameters: {
            type: "object",
            additionalProperties: false,
            required: ["domain"],
            properties: { domain: { type: "string" } }
          }
        },
        {
          type: "function",
          name: "set_a_record",
          description: "Propose setting one Hostinger A record. This does not execute until separately approved.",
          parameters: {
            type: "object",
            additionalProperties: false,
            required: ["domain", "name", "ip"],
            properties: {
              domain: { type: "string" },
              name: { type: "string", description: "Use @ for the root record." },
              ip: { type: "string" },
              ttl: { type: "integer", minimum: 60, maximum: 604800 }
            }
          }
        },
        {
          type: "function",
          name: "create_subdomain",
          description: "Propose creating a Hostinger subdomain under an existing hosted website.",
          parameters: {
            type: "object",
            additionalProperties: false,
            required: ["domain", "subdomain"],
            properties: {
              domain: { type: "string" },
              subdomain: { type: "string" },
              directory: { type: "string" }
            }
          }
        },
        {
          type: "function",
          name: "clear_cache",
          description: "Propose clearing Hostinger website cache for a domain.",
          parameters: {
            type: "object",
            additionalProperties: false,
            required: ["domain"],
            properties: { domain: { type: "string" } }
          }
        }
      ]
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`openai_api_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return { text: extractOpenAIText(payload), proposals: extractProposals(payload), response_id: payload.id || null };
}

function registerHubCentralRoutes({ app, config }) {
  const hostinger = createHostingerClient({ token: process.env.HOSTINGER_API_TOKEN || "" });
  const hubApiSecret = String(process.env.HUB_API_SECRET || "").trim();
  const openaiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const openaiModel = String(process.env.HUB_OPENAI_MODEL || "gpt-5.6").trim();
  const authenticate = hubAuth({ config, hubApiSecret });
  const publicPath = path.join(__dirname, "..", "..", "public", "hub-central");

  app.use("/hub-central", express.static(publicPath, {
    index: "index.html",
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store, max-age=0")
  }));

  app.get("/api/hub-central/status", authenticate, async (req, res) => {
    res.json({
      ok: true,
      service: "OneWorldz Hub Central",
      owner_authenticated: true,
      hostinger_api_configured: hostinger.configured(),
      openai_api_configured: Boolean(openaiApiKey),
      openai_model: openaiModel,
      write_confirmation: WRITE_CONFIRMATION,
      mode: "approval_controlled"
    });
  });

  app.get("/api/hub-central/public-dns/:domain", authenticate, async (req, res) => {
    try { return res.json({ ok: true, dns: await diagnosePublicDns(req.params.domain) }); }
    catch (error) { return res.status(400).json({ ok: false, ...safeError(error) }); }
  });

  app.get("/api/hub-central/hostinger/websites", authenticate, async (req, res) => {
    try { return res.json({ ok: true, websites: await hostinger.listWebsites() }); }
    catch (error) { const safe = safeError(error); return res.status(safe.status).json({ ok: false, ...safe }); }
  });

  app.get("/api/hub-central/hostinger/dns/:domain", authenticate, async (req, res) => {
    try {
      const domain = cleanDomain(req.params.domain);
      const [publicDns, hostingerDns] = await Promise.all([diagnosePublicDns(domain), hostinger.getDnsZone(domain)]);
      return res.json({ ok: true, domain, public_dns: publicDns, hostinger_dns: hostingerDns });
    } catch (error) { const safe = safeError(error); return res.status(safe.status === 500 ? 400 : safe.status).json({ ok: false, ...safe }); }
  });

  app.post("/api/hub-central/hostinger/dns/:domain/a", authenticate, async (req, res) => {
    try {
      requireWriteConfirmation(req.body?.confirmation);
      const domain = cleanDomain(req.params.domain);
      const before = await hostinger.getDnsZone(domain);
      const after = await hostinger.setARecord(domain, {
        name: req.body?.name || "@",
        content: req.body?.ip,
        ttl: req.body?.ttl || 14400,
        overwrite: true
      });
      const publicDns = await diagnosePublicDns(domain);
      return res.json({ ok: true, action: "set_a_record", domain, before, after, public_dns: publicDns });
    } catch (error) { const safe = safeError(error); return res.status(safe.status === 500 ? 400 : safe.status).json({ ok: false, ...safe }); }
  });

  app.get("/api/hub-central/hostinger/subdomains/:domain", authenticate, async (req, res) => {
    try { return res.json({ ok: true, domain: cleanDomain(req.params.domain), subdomains: await hostinger.listSubdomains(req.params.domain) }); }
    catch (error) { const safe = safeError(error); return res.status(safe.status).json({ ok: false, ...safe }); }
  });

  app.post("/api/hub-central/hostinger/subdomains", authenticate, async (req, res) => {
    try {
      requireWriteConfirmation(req.body?.confirmation);
      const result = await hostinger.createSubdomain(req.body?.domain, req.body?.subdomain, {
        directory: req.body?.directory || undefined,
        isUsingPublicDirectory: false
      });
      return res.status(201).json({ ok: true, action: "create_subdomain", result });
    } catch (error) { const safe = safeError(error); return res.status(safe.status === 500 ? 400 : safe.status).json({ ok: false, ...safe }); }
  });

  app.post("/api/hub-central/hostinger/cache/clear", authenticate, async (req, res) => {
    try {
      requireWriteConfirmation(req.body?.confirmation);
      const domain = cleanDomain(req.body?.domain);
      await hostinger.clearCache(domain);
      return res.json({ ok: true, action: "clear_cache", domain });
    } catch (error) { const safe = safeError(error); return res.status(safe.status === 500 ? 400 : safe.status).json({ ok: false, ...safe }); }
  });

  app.post("/api/hub-central/chat", authenticate, async (req, res) => {
    try {
      const message = String(req.body?.message || "").trim();
      if (!message) return res.status(400).json({ ok: false, error: "message_required" });
      const result = await askHubAI({
        apiKey: openaiApiKey,
        model: openaiModel,
        message,
        context: { hostinger_api_configured: hostinger.configured(), write_mode: "approval_controlled" }
      });
      return res.json({ ok: true, ...result });
    } catch (error) { const safe = safeError(error); return res.status(safe.status === 500 ? 400 : safe.status).json({ ok: false, ...safe }); }
  });

  return { hostinger, authenticate };
}

module.exports = {
  WRITE_CONFIRMATION,
  safeTokenMatch,
  hubAuth,
  extractOpenAIText,
  extractProposals,
  askHubAI,
  registerHubCentralRoutes
};