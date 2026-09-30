const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const net = require("node:net");
const {
  currentLicence,
  ensureGroup,
  isGroup,
  moduleAvailable,
  owner,
  recordAnalytics,
  secureRandomToken,
  telegramAdmin
} = require("./community-suite-core");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function privateIp(address) {
  const value = String(address || "").toLowerCase();
  if (net.isIP(value) === 4) {
    const [a,b] = value.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
  }
  if (net.isIP(value) === 6) {
    return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") ||
      value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
  }
  return true;
}

async function safeWebhookUrl(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (net.isIP(host) && privateIp(host)) return null;
  try {
    const rows = await dns.lookup(host, { all: true, verbatim: true });
    if (!rows.length || rows.some((row) => privateIp(row.address))) return null;
  } catch {
    return null;
  }
  return url;
}

function cryptoKey(value) {
  const raw = String(value || "").trim();
  return raw ? crypto.createHash("sha256").update(raw).digest() : null;
}

function encryptSecret(secret, master) {
  const key = cryptoKey(master);
  if (!key) throw new Error("webhook_encryption_not_configured");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(secret), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptSecret(value, master) {
  const key = cryptoKey(master);
  const parts = String(value || "").split(".");
  if (!key || parts.length !== 4 || parts[0] !== "v1") throw new Error("invalid_encrypted_secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[3], "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function registerCommunityApi({ app, bot, config, supabase, env = process.env }) {
  const encryptionKey = String(env.WORLDZ_SUITE_SECRET_ENCRYPTION_KEY || "").trim();
  const send = (message, text) => bot.sendMessage(message.chat.id, text);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);

  async function verifyApi(req, chatId, requiredScope = "read") {
    const header = String(req.get("authorization") || "");
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    const hash = sha256(match[1]);
    const { data, error } = await supabase.from("community_suite_api_keys")
      .select("*").eq("chat_id", Number(chatId)).eq("token_hash", hash).eq("enabled", true).maybeSingle();
    if (error || !data) return null;
    if (!(data.scopes || []).includes(requiredScope) && !(data.scopes || []).includes("*")) return null;
    await supabase.from("community_suite_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return data;
  }

  async function dispatch(chatId, eventType, payload = {}) {
    const { data, error } = await supabase.from("community_suite_webhooks")
      .select("*").eq("chat_id", Number(chatId)).eq("enabled", true);
    if (error) throw error;
    const body = JSON.stringify({
      id: crypto.randomUUID(),
      event_type: String(eventType),
      chat_id: Number(chatId),
      occurred_at: new Date().toISOString(),
      payload
    });
    const results = [];
    for (const row of data || []) {
      const events = Array.isArray(row.event_types) ? row.event_types : ["*"];
      if (!events.includes("*") && !events.includes(eventType)) continue;
      const url = await safeWebhookUrl(row.endpoint_url);
      if (!url) {
        results.push({ id: row.id, ok: false, error: "unsafe_or_unresolvable_url" });
        continue;
      }
      try {
        const secret = decryptSecret(row.secret_ciphertext, encryptionKey);
        const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        let response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "user-agent": "WorldzCommunitySuite-Webhooks/1.0",
              "x-worldz-event": String(eventType),
              "x-worldz-signature": `sha256=${signature}`
            },
            body,
            signal: controller.signal,
            redirect: "error"
          });
        } finally {
          clearTimeout(timer);
        }
        results.push({ id: row.id, ok: response.ok, status: response.status });
      } catch (error2) {
        results.push({ id: row.id, ok: false, error: error2?.message || "delivery_failed" });
      }
    }
    return results;
  }

  bot.onText(/^\/apikeycreate(?:@\w+)?(?:\s+(.+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Create API keys inside the licensed customer group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await ensureGroup(supabase, message, config);
      if (!(await moduleAvailable(supabase, message.chat.id, "webhooks"))) return send(message, "⏸ API + Webhooks are switched off or paused.");
      const label = String(match?.[1] || "Customer API").trim().slice(0, 80);
      const token = `wz_live_${secureRandomToken(24)}`;
      const { data, error } = await supabase.from("community_suite_api_keys").insert({
        chat_id: Number(message.chat.id),
        label,
        token_hash: sha256(token),
        token_prefix: token.slice(0, 16),
        scopes: ["read","events"],
        enabled: true,
        created_by: Number(message.from.id)
      }).select("id").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "api_key_created", { apiKeyId: data.id });
      return send(message, [
        `🔑 WORLDZ API KEY #${data.id}`,
        "",
        token,
        "",
        "Copy this key now. Worldz stores only its hash and cannot show the full key again.",
        "Scopes: read • events"
      ].join("\n"));
    } catch {
      return send(message, "❌ API key could not be created.");
    }
  });

  bot.onText(/^\/apikeys(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { data, error } = await supabase.from("community_suite_api_keys")
        .select("id,label,token_prefix,scopes,enabled,created_at,last_used_at")
        .eq("chat_id", Number(message.chat.id)).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.enabled ? "✅" : "⬜"} ${row.label} • ${row.token_prefix}… • ${(row.scopes || []).join(",")}`);
      return send(message, `🔑 WORLDZ API KEYS\n\n${lines.join("\n") || "No API keys."}\n\nRevoke: /apikeyrevoke ID`);
    } catch {
      return send(message, "❌ API keys could not be loaded.");
    }
  });

  bot.onText(/^\/apikeyrevoke(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_api_keys")
        .update({ enabled: false }).eq("id", Number(match[1])).eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ API key #${match[1]} revoked.`);
    } catch {
      return send(message, "❌ API key could not be revoked.");
    }
  });

  bot.onText(/^\/webhookadd(?:@\w+)?\s+([^\s|]+)(?:\s*\|\s*(.+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await ensureGroup(supabase, message, config);
      if (!(await moduleAvailable(supabase, message.chat.id, "webhooks"))) return send(message, "⏸ API + Webhooks are switched off or paused.");
      if (!encryptionKey) return send(message, "⚙️ Webhook signing is not configured on the server yet. Add WORLDZ_SUITE_SECRET_ENCRYPTION_KEY first.");
      const url = await safeWebhookUrl(match[1]);
      if (!url) return send(message, "❌ Webhook must be a public HTTPS endpoint that does not resolve to a private/local address.");
      const eventTypes = String(match?.[2] || "*").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 30);
      const secret = `wzhk_${secureRandomToken(24)}`;
      const { data, error } = await supabase.from("community_suite_webhooks").upsert({
        chat_id: Number(message.chat.id),
        endpoint_url: url.toString(),
        event_types: eventTypes.length ? eventTypes : ["*"],
        secret_ciphertext: encryptSecret(secret, encryptionKey),
        enabled: true,
        created_by: Number(message.from.id),
        updated_at: new Date().toISOString()
      }, { onConflict: "chat_id,endpoint_url" }).select("id").single();
      if (error) throw error;
      return send(message, [
        `🔌 WEBHOOK #${data.id} ACTIVE`,
        `Endpoint: ${url}`,
        `Events: ${(eventTypes.length ? eventTypes : ["*"]).join(", ")}`,
        "",
        `Signing secret: ${secret}`,
        "",
        "Copy the signing secret now. It is encrypted at rest and is not shown again.",
        "Verify X-Worldz-Signature using HMAC-SHA256 over the raw JSON body."
      ].join("\n"));
    } catch (error) {
      console.error("Community webhook add failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ Webhook could not be registered.");
    }
  });

  bot.onText(/^\/webhooks(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { data, error } = await supabase.from("community_suite_webhooks")
        .select("id,endpoint_url,event_types,enabled,created_at").eq("chat_id", Number(message.chat.id)).order("created_at");
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.enabled ? "✅" : "⬜"} • ${row.endpoint_url} • ${(row.event_types || []).join(",")}`);
      return send(message, `🔌 WORLDZ WEBHOOKS\n\n${lines.join("\n") || "No webhooks."}\n\nAdd: /webhookadd https://example.com/hook | *\nTest: /webhooktest\nRemove: /webhookremove ID`);
    } catch {
      return send(message, "❌ Webhooks could not be loaded.");
    }
  });

  bot.onText(/^\/webhookremove(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_webhooks")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", Number(match[1])).eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Webhook #${match[1]} disabled.`);
    } catch {
      return send(message, "❌ Webhook could not be disabled.");
    }
  });

  bot.onText(/^\/webhooktest(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const results = await dispatch(message.chat.id, "webhook.test", { requested_by: Number(message.from.id) });
      const ok = results.filter((row) => row.ok).length;
      return send(message, `🔌 Webhook test complete: ${ok}/${results.length} deliveries accepted.`);
    } catch {
      return send(message, "❌ Webhook test could not complete.");
    }
  });

  app.get("/api/community-suite/:chatId/status", async (req, res) => {
    const chatId = Number(req.params.chatId);
    if (!Number.isSafeInteger(chatId)) return res.status(400).json({ ok: false, error: "invalid_chat_id" });
    const key = await verifyApi(req, chatId, "read");
    if (!key) return res.status(401).json({ ok: false, error: "unauthorized" });
    try {
      const [group, modules, brand, licence] = await Promise.all([
        supabase.from("community_suite_groups").select("*").eq("chat_id", chatId).maybeSingle(),
        supabase.from("community_suite_modules").select("module_key,enabled,config").eq("chat_id", chatId),
        supabase.from("community_suite_branding").select("*").eq("chat_id", chatId).maybeSingle(),
        currentLicence(supabase, chatId)
      ]);
      return res.json({
        ok: true,
        group: group.data || null,
        modules: modules.data || [],
        branding: brand.data || null,
        licence
      });
    } catch {
      return res.status(500).json({ ok: false, error: "status_failed" });
    }
  });

  app.post("/api/community-suite/:chatId/event", async (req, res) => {
    const chatId = Number(req.params.chatId);
    if (!Number.isSafeInteger(chatId)) return res.status(400).json({ ok: false, error: "invalid_chat_id" });
    const key = await verifyApi(req, chatId, "events");
    if (!key) return res.status(401).json({ ok: false, error: "unauthorized" });
    const eventType = String(req.body?.event_type || "").trim().slice(0, 80);
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
    if (!eventType) return res.status(400).json({ ok: false, error: "event_type_required" });
    await recordAnalytics(supabase, chatId, null, eventType, metadata, "customer_api");
    const deliveries = await dispatch(chatId, eventType, metadata).catch(() => []);
    return res.json({ ok: true, webhook_deliveries: deliveries.length });
  });

  return { dispatch, verifyApi };
}

module.exports = {
  decryptSecret,
  encryptSecret,
  privateIp,
  registerCommunityApi,
  safeWebhookUrl,
  sha256
};
