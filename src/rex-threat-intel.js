const crypto = require("node:crypto");

const DEFAULT_CAS_BASE_URL = "https://api.cas.chat";
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_PATTERN_THRESHOLD = 0.82;

function safeTelegramId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " <url> ")
    .replace(/[@#][\p{L}\p{N}_]+/gu, " <handle> ")
    .replace(/\b\d{5,}\b/g, " <number> ")
    .replace(/[^\p{L}\p{N}<>]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function textFingerprint(value) {
  return crypto.createHash("sha256").update(normalizeText(value)).digest("hex");
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 1));
}

function jaccardSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  const union = left.size + right.size - overlap;
  return union ? overlap / union : 0;
}

function activeRow(row) {
  if (!row || row.status !== "blocked") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

function createRexThreatIntel({
  supabase,
  fetchImpl = global.fetch,
  casBaseUrl = process.env.REX_CAS_BASE_URL || DEFAULT_CAS_BASE_URL,
  cacheTtlMs = Number(process.env.REX_THREAT_CACHE_TTL_MS) || DEFAULT_CACHE_TTL_MS,
  patternThreshold = Number(process.env.REX_PATTERN_THRESHOLD) || DEFAULT_PATTERN_THRESHOLD
} = {}) {
  const cache = new Map();

  function cached(key) {
    const row = cache.get(key);
    if (!row || row.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }
    return row.value;
  }

  function remember(key, value, ttl = cacheTtlMs) {
    cache.set(key, { value, expiresAt: Date.now() + Math.max(1000, ttl) });
    return value;
  }

  async function checkCas(userId) {
    const id = safeTelegramId(userId);
    if (!id) return { available: false, blocked: false, source: "cas", reason: "invalid_telegram_id" };
    const key = `cas:${id}`;
    const hit = cached(key);
    if (hit) return hit;
    if (typeof fetchImpl !== "function") return { available: false, blocked: false, source: "cas", reason: "fetch_unavailable" };

    try {
      const url = new URL("/check", String(casBaseUrl).replace(/\/$/, "") + "/");
      url.searchParams.set("user_id", String(id));
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "REXSECURE-Ultimate/1.0" },
        signal: AbortSignal.timeout(5000)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) {
        return remember(key, { available: false, blocked: false, source: "cas", reason: "provider_unavailable" }, 60_000);
      }
      const blocked = Boolean(body.ok && body.result);
      return remember(key, {
        available: true,
        blocked,
        source: "cas",
        reason: blocked ? String(body.result?.reason || body.description || "CAS documented spam record") : "",
        evidence: blocked ? body.result : null
      });
    } catch {
      return remember(key, { available: false, blocked: false, source: "cas", reason: "provider_unavailable" }, 60_000);
    }
  }

  async function checkRegistry(userId) {
    const id = safeTelegramId(userId);
    if (!id || !supabase) return { available: Boolean(supabase), blocked: false, source: "rex_registry" };
    const key = `registry:${id}`;
    const hit = cached(key);
    if (hit) return hit;
    try {
      const { data, error } = await supabase
        .from("secureguard_threat_profiles")
        .select("telegram_id,status,confidence,source,reason,evidence_url,expires_at,updated_at")
        .eq("telegram_id", id)
        .maybeSingle();
      if (error) throw error;
      return remember(key, {
        available: true,
        blocked: activeRow(data),
        watch: Boolean(data && data.status === "watch"),
        source: "rex_registry",
        record: data || null,
        reason: data?.reason || ""
      }, 60_000);
    } catch {
      return { available: false, blocked: false, source: "rex_registry", reason: "registry_unavailable" };
    }
  }

  async function assessUser(userId, { casEnabled = true } = {}) {
    const id = safeTelegramId(userId);
    if (!id) return { telegramId: null, blocked: false, confidence: 0, sources: [] };
    const registry = await checkRegistry(id);
    if (registry.blocked) {
      return {
        telegramId: id,
        blocked: true,
        confidence: Number(registry.record?.confidence || 100),
        action: "ban",
        reason: registry.reason || "REX Network Shield block",
        sources: [registry]
      };
    }
    const cas = casEnabled ? await checkCas(id) : { available: false, blocked: false, source: "cas", reason: "disabled" };
    if (cas.blocked) {
      return {
        telegramId: id,
        blocked: true,
        confidence: 100,
        action: "ban",
        reason: cas.reason || "CAS documented spam record",
        sources: [registry, cas]
      };
    }
    return {
      telegramId: id,
      blocked: false,
      watch: Boolean(registry.watch),
      confidence: registry.watch ? Number(registry.record?.confidence || 50) : 0,
      reason: registry.reason || "",
      sources: [registry, cas]
    };
  }

  async function setRegistryProfile({
    telegramId,
    status = "blocked",
    confidence = 100,
    source = "worldz_admin",
    reason = "",
    evidenceUrl = null,
    actorTelegramId = null,
    expiresAt = null
  }) {
    const id = safeTelegramId(telegramId);
    if (!id || !supabase) throw new Error("registry_unavailable");
    const cleanStatus = ["blocked", "watch", "cleared"].includes(status) ? status : "blocked";
    const { error } = await supabase.from("secureguard_threat_profiles").upsert({
      telegram_id: id,
      status: cleanStatus,
      confidence: Math.max(0, Math.min(100, Number(confidence) || 0)),
      source: String(source || "worldz_admin").slice(0, 64),
      reason: String(reason || "").slice(0, 500),
      evidence_url: evidenceUrl ? String(evidenceUrl).slice(0, 500) : null,
      actor_telegram_id: safeTelegramId(actorTelegramId),
      expires_at: expiresAt || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "telegram_id" });
    if (error) throw error;
    cache.delete(`registry:${id}`);
    return checkRegistry(id);
  }

  async function reportProfile({
    chatId,
    reporterTelegramId,
    subjectTelegramId,
    messageId = null,
    reason = "",
    evidence = ""
  }) {
    if (!supabase) throw new Error("reports_unavailable");
    const subject = safeTelegramId(subjectTelegramId);
    const reporter = safeTelegramId(reporterTelegramId);
    if (!subject || !reporter) throw new Error("invalid_telegram_id");
    const { data, error } = await supabase.from("secureguard_reports").insert({
      chat_id: Number(chatId),
      reporter_telegram_id: reporter,
      subject_telegram_id: subject,
      message_id: messageId == null ? null : Number(messageId),
      reason: String(reason || "").slice(0, 500),
      evidence: String(evidence || "").slice(0, 1500)
    }).select("id,status").single();
    if (error) throw error;
    return data;
  }

  async function addPattern({ chatId, text, sourceTelegramId = null, actorTelegramId = null, reason = "" }) {
    if (!supabase) throw new Error("patterns_unavailable");
    const normalized = normalizeText(text);
    if (normalized.length < 12) throw new Error("pattern_too_short");
    const fingerprint = textFingerprint(normalized);
    const { data, error } = await supabase.from("secureguard_spam_patterns").upsert({
      chat_id: Number(chatId),
      fingerprint,
      normalized_text: normalized.slice(0, 2000),
      source_telegram_id: safeTelegramId(sourceTelegramId),
      actor_telegram_id: safeTelegramId(actorTelegramId),
      reason: String(reason || "").slice(0, 500),
      active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "chat_id,fingerprint" }).select("id,fingerprint").single();
    if (error) throw error;
    cache.delete(`patterns:${Number(chatId)}`);
    return data;
  }

  async function patterns(chatId) {
    if (!supabase) return [];
    const id = Number(chatId);
    const key = `patterns:${id}`;
    const hit = cached(key);
    if (hit) return hit;
    const { data, error } = await supabase.from("secureguard_spam_patterns")
      .select("id,fingerprint,normalized_text,reason")
      .eq("chat_id", id)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return remember(key, data || [], 60_000);
  }

  async function matchPattern(chatId, text) {
    const normalized = normalizeText(text);
    if (normalized.length < 12) return null;
    const fingerprint = textFingerprint(normalized);
    const rows = await patterns(chatId);
    for (const row of rows) {
      if (row.fingerprint === fingerprint) return { row, similarity: 1 };
      const similarity = jaccardSimilarity(normalized, row.normalized_text);
      if (similarity >= patternThreshold) return { row, similarity };
    }
    return null;
  }

  return {
    assessUser,
    checkCas,
    checkRegistry,
    setRegistryProfile,
    reportProfile,
    addPattern,
    matchPattern,
    normalizeText,
    textFingerprint,
    jaccardSimilarity
  };
}

module.exports = {
  DEFAULT_CAS_BASE_URL,
  DEFAULT_PATTERN_THRESHOLD,
  createRexThreatIntel,
  jaccardSimilarity,
  normalizeText,
  safeTelegramId,
  textFingerprint
};
