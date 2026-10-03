const crypto = require("node:crypto");

const DEFAULT_CAS_BASE_URL = "https://api.cas.chat";
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_PATTERN_THRESHOLD = 0.82;

const SOURCE_POLICIES = Object.freeze({
  worldz_owner_adjudication: Object.freeze({
    sourceKey: "worldz_owner_adjudication",
    displayName: "Worldz Security Adjudication",
    baseWeight: 100,
    maxAutoAction: "network_block",
    requiresCorroboration: false
  }),
  cas: Object.freeze({
    sourceKey: "cas",
    displayName: "Combot Anti-Spam (CAS)",
    baseWeight: 85,
    maxAutoAction: "quarantine",
    requiresCorroboration: true
  }),
  worldz_admin_report: Object.freeze({
    sourceKey: "worldz_admin_report",
    displayName: "Worldz Admin Evidence Report",
    baseWeight: 45,
    maxAutoAction: "watch",
    requiresCorroboration: true
  }),
  pattern_match: Object.freeze({
    sourceKey: "pattern_match",
    displayName: "REX Pattern Guard Match",
    baseWeight: 55,
    maxAutoAction: "quarantine",
    requiresCorroboration: true
  }),
  identity_match: Object.freeze({
    sourceKey: "identity_match",
    displayName: "REX Identity Guard Match",
    baseWeight: 35,
    maxAutoAction: "watch",
    requiresCorroboration: true
  }),
  local_behavior: Object.freeze({
    sourceKey: "local_behavior",
    displayName: "REX Local Behaviour Signal",
    baseWeight: 30,
    maxAutoAction: "watch",
    requiresCorroboration: true
  })
});

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

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function riskContribution({ baseWeight = 0, severity = 0, sourceConfidence = 0 } = {}) {
  const weight = clampScore(baseWeight);
  const sev = clampScore(severity);
  const confidence = clampScore(sourceConfidence);
  return clampScore(weight * ((sev / 100) * 0.55 + (confidence / 100) * 0.45));
}

function combineRiskContributions(values = []) {
  let safeProbability = 1;
  for (const value of values) {
    const score = clampScore(value);
    safeProbability *= (1 - score / 100);
  }
  return clampScore((1 - safeProbability) * 100);
}

function classifyRisk({ score = 0, independentSourceCount = 0, ownerBlocked = false, activeAppeal = false } = {}) {
  const risk = clampScore(score);
  let riskBand = "clear";
  let recommendedAction = "allow";

  if (risk >= 95 && ownerBlocked) {
    riskBand = "blocked";
    recommendedAction = "network_block";
  } else if (risk >= 80) {
    riskBand = "block_candidate";
    recommendedAction = Number(independentSourceCount) >= 2 ? "local_block" : "quarantine";
  } else if (risk >= 55) {
    riskBand = "quarantine";
    recommendedAction = "quarantine";
  } else if (risk >= 30) {
    riskBand = "watch";
    recommendedAction = "watch";
  }

  const escalationFrozen = Boolean(activeAppeal && ["local_block", "network_block"].includes(recommendedAction));
  if (escalationFrozen) recommendedAction = "quarantine";

  return {
    riskScore: risk,
    riskBand,
    recommendedAction,
    escalationFrozen,
    blocked: ["local_block", "network_block"].includes(recommendedAction),
    watch: recommendedAction === "watch"
  };
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

  async function sourcePolicies() {
    const key = "source-policies";
    const hit = cached(key);
    if (hit) return hit;

    const fallback = new Map(Object.entries(SOURCE_POLICIES).map(([sourceKey, row]) => [sourceKey, row]));
    if (!supabase) return fallback;

    try {
      const { data, error } = await supabase
        .from("secureguard_intel_sources")
        .select("source_key,display_name,base_weight,max_auto_action,requires_corroboration,freshness_hours,enabled")
        .eq("enabled", true);
      if (error) throw error;
      const map = new Map();
      for (const row of data || []) {
        map.set(row.source_key, {
          sourceKey: row.source_key,
          displayName: row.display_name,
          baseWeight: clampScore(row.base_weight),
          maxAutoAction: row.max_auto_action,
          requiresCorroboration: row.requires_corroboration !== false,
          freshnessHours: row.freshness_hours == null ? null : Number(row.freshness_hours)
        });
      }
      for (const [sourceKey, row] of fallback) if (!map.has(sourceKey)) map.set(sourceKey, row);
      return remember(key, map, 60_000);
    } catch {
      return fallback;
    }
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
        headers: { accept: "application/json", "user-agent": "REXSECURE-Ultimate/2.0" },
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
        cleared: Boolean(data && data.status === "cleared"),
        source: "rex_registry",
        record: data || null,
        reason: data?.reason || ""
      }, 60_000);
    } catch {
      return { available: false, blocked: false, source: "rex_registry", reason: "registry_unavailable" };
    }
  }

  async function evidenceFor(userId) {
    const id = safeTelegramId(userId);
    if (!id || !supabase) return [];
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("secureguard_evidence")
        .select("id,subject_telegram_id,source_key,source_reference,signal_type,severity,source_confidence,evidence_url,evidence,metadata,status,observed_at,expires_at,created_by_telegram_id")
        .eq("subject_telegram_id", id)
        .eq("status", "active")
        .order("observed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).filter((row) => !row.expires_at || row.expires_at > now);
    } catch {
      return [];
    }
  }

  async function getActiveAppeal(userId) {
    const id = safeTelegramId(userId);
    if (!id || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("secureguard_appeals")
        .select("id,subject_telegram_id,appellant_telegram_id,status,reason,evidence_url,created_at,updated_at")
        .eq("subject_telegram_id", id)
        .in("status", ["pending", "under_review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch {
      return null;
    }
  }

  async function recordAssessment(assessment) {
    if (!supabase || !assessment?.telegramId) return null;
    try {
      const { data, error } = await supabase.from("secureguard_assessments").insert({
        subject_telegram_id: assessment.telegramId,
        risk_score: assessment.riskScore,
        risk_band: assessment.riskBand,
        recommended_action: assessment.recommendedAction,
        source_count: assessment.signals.length,
        independent_source_count: assessment.independentSourceCount,
        active_appeal: assessment.activeAppeal,
        rationale: {
          reason: assessment.reason,
          escalation_frozen: assessment.escalationFrozen,
          signals: assessment.signals.map((signal) => ({
            source_key: signal.sourceKey,
            contribution: signal.contribution,
            severity: signal.severity,
            source_confidence: signal.sourceConfidence
          }))
        }
      }).select("id").single();
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  }

  async function assessUser(userId, { casEnabled = true, record = true } = {}) {
    const id = safeTelegramId(userId);
    if (!id) return {
      telegramId: null,
      blocked: false,
      watch: false,
      confidence: 0,
      riskScore: 0,
      riskBand: "clear",
      recommendedAction: "allow",
      independentSourceCount: 0,
      activeAppeal: false,
      signals: [],
      sources: []
    };

    const [policies, registry, evidenceRows, appeal] = await Promise.all([
      sourcePolicies(),
      checkRegistry(id),
      evidenceFor(id),
      getActiveAppeal(id)
    ]);
    const cas = casEnabled
      ? await checkCas(id)
      : { available: false, blocked: false, source: "cas", reason: "disabled" };

    const signals = [];

    if (registry.blocked) {
      const policy = policies.get("worldz_owner_adjudication") || SOURCE_POLICIES.worldz_owner_adjudication;
      const confidence = clampScore(registry.record?.confidence ?? 100);
      signals.push({
        sourceKey: "worldz_owner_adjudication",
        source: "rex_registry",
        severity: 100,
        sourceConfidence: confidence,
        contribution: riskContribution({ baseWeight: policy.baseWeight, severity: 100, sourceConfidence: confidence }),
        reason: registry.reason || "Worldz adjudicated network block"
      });
    } else if (registry.watch) {
      const policy = policies.get("worldz_owner_adjudication") || SOURCE_POLICIES.worldz_owner_adjudication;
      const confidence = clampScore(registry.record?.confidence ?? 60);
      signals.push({
        sourceKey: "worldz_owner_adjudication",
        source: "rex_registry",
        severity: 45,
        sourceConfidence: confidence,
        contribution: riskContribution({ baseWeight: Math.min(65, policy.baseWeight), severity: 45, sourceConfidence: confidence }),
        reason: registry.reason || "Worldz watch status"
      });
    }

    if (cas.blocked) {
      const policy = policies.get("cas") || SOURCE_POLICIES.cas;
      signals.push({
        sourceKey: "cas",
        source: "cas",
        severity: 90,
        sourceConfidence: 95,
        contribution: riskContribution({ baseWeight: policy.baseWeight, severity: 90, sourceConfidence: 95 }),
        reason: cas.reason || "CAS documented spam record"
      });
    }

    for (const row of evidenceRows) {
      const policy = policies.get(row.source_key) || {
        sourceKey: row.source_key,
        displayName: row.source_key,
        baseWeight: 25,
        maxAutoAction: "watch",
        requiresCorroboration: true
      };
      const severity = clampScore(row.severity);
      const sourceConfidence = clampScore(row.source_confidence);
      signals.push({
        sourceKey: row.source_key,
        source: row.source_key,
        evidenceId: row.id,
        severity,
        sourceConfidence,
        contribution: riskContribution({ baseWeight: policy.baseWeight, severity, sourceConfidence }),
        reason: row.evidence || row.signal_type || row.source_key
      });
    }

    const riskScore = combineRiskContributions(signals.map((signal) => signal.contribution));
    const independentSourceCount = new Set(signals.map((signal) => signal.sourceKey)).size;
    const ownerBlocked = Boolean(
      registry.blocked &&
      /^(worldz_owner|worldz_security|worldz_owner_adjudication)/i.test(String(registry.record?.source || ""))
    );
    const classified = classifyRisk({
      score: riskScore,
      independentSourceCount,
      ownerBlocked,
      activeAppeal: Boolean(appeal)
    });

    const reason = signals
      .slice()
      .sort((a, b) => b.contribution - a.contribution)
      .map((signal) => signal.reason)
      .filter(Boolean)
      .slice(0, 3)
      .join("; ");

    const assessment = {
      telegramId: id,
      ...classified,
      confidence: classified.riskScore,
      independentSourceCount,
      activeAppeal: Boolean(appeal),
      appeal: appeal || null,
      reason,
      signals,
      sources: [registry, cas],
      cleared: Boolean(registry.cleared)
    };

    if (record) await recordAssessment(assessment);
    return assessment;
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
      confidence: clampScore(confidence),
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

  async function recordEvidence({
    subjectTelegramId,
    sourceKey,
    sourceReference = null,
    signalType = "risk_signal",
    severity = 50,
    sourceConfidence = 50,
    evidenceUrl = null,
    evidence = "",
    metadata = {},
    expiresAt = null,
    createdByTelegramId = null
  }) {
    const subject = safeTelegramId(subjectTelegramId);
    if (!subject || !supabase) throw new Error("evidence_unavailable");
    const { data, error } = await supabase.from("secureguard_evidence").insert({
      subject_telegram_id: subject,
      source_key: String(sourceKey || "local_behavior").slice(0, 64),
      source_reference: sourceReference ? String(sourceReference).slice(0, 200) : null,
      signal_type: String(signalType || "risk_signal").slice(0, 64),
      severity: clampScore(severity),
      source_confidence: clampScore(sourceConfidence),
      evidence_url: evidenceUrl ? String(evidenceUrl).slice(0, 500) : null,
      evidence: String(evidence || "").slice(0, 2000),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      expires_at: expiresAt || null,
      created_by_telegram_id: safeTelegramId(createdByTelegramId)
    }).select("id,subject_telegram_id,source_key,status,observed_at").single();
    if (error) throw error;
    return data;
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

    try {
      await recordEvidence({
        subjectTelegramId: subject,
        sourceKey: "worldz_admin_report",
        sourceReference: `report:${data.id}`,
        signalType: "admin_report",
        severity: 60,
        sourceConfidence: 80,
        evidence: [String(reason || "").trim(), String(evidence || "").trim()].filter(Boolean).join(" | "),
        metadata: { chat_id: Number(chatId), message_id: messageId == null ? null : Number(messageId) },
        createdByTelegramId: reporter,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch {}

    return data;
  }

  async function createAppeal({
    subjectTelegramId,
    appellantTelegramId,
    chatId = null,
    reason = "",
    evidenceUrl = null,
    evidence = ""
  }) {
    if (!supabase) throw new Error("appeals_unavailable");
    const subject = safeTelegramId(subjectTelegramId);
    const appellant = safeTelegramId(appellantTelegramId);
    const cleanReason = String(reason || "").trim();
    if (!subject || !appellant) throw new Error("invalid_telegram_id");
    if (cleanReason.length < 5) throw new Error("appeal_reason_required");

    const { data: existing, error: existingError } = await supabase
      .from("secureguard_appeals")
      .select("id,status,created_at")
      .eq("subject_telegram_id", subject)
      .in("status", ["pending", "under_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { ...existing, existing: true };

    const { data, error } = await supabase.from("secureguard_appeals").insert({
      subject_telegram_id: subject,
      appellant_telegram_id: appellant,
      chat_id: chatId == null ? null : Number(chatId),
      reason: cleanReason.slice(0, 1000),
      evidence_url: evidenceUrl ? String(evidenceUrl).slice(0, 500) : null,
      evidence: String(evidence || "").slice(0, 2000)
    }).select("id,status,created_at").single();
    if (error) throw error;
    return { ...data, existing: false };
  }

  async function listAppeals({ status = "pending", limit = 25 } = {}) {
    if (!supabase) return [];
    const statuses = status === "active" ? ["pending", "under_review"] : [String(status || "pending")];
    const { data, error } = await supabase
      .from("secureguard_appeals")
      .select("id,subject_telegram_id,appellant_telegram_id,chat_id,reason,evidence_url,status,created_at,updated_at")
      .in("status", statuses)
      .order("created_at", { ascending: true })
      .limit(Math.max(1, Math.min(100, Number(limit) || 25)));
    if (error) throw error;
    return data || [];
  }

  async function resolveAppeal({ appealId, decision, reviewerTelegramId, reviewNote = "" }) {
    if (!supabase) throw new Error("appeals_unavailable");
    const id = Number(appealId);
    const reviewer = safeTelegramId(reviewerTelegramId);
    const normalizedDecision = String(decision || "").toLowerCase();
    if (!Number.isSafeInteger(id) || id < 1 || !reviewer) throw new Error("invalid_appeal");
    if (!["grant", "deny"].includes(normalizedDecision)) throw new Error("invalid_appeal_decision");

    const { data: appeal, error: loadError } = await supabase
      .from("secureguard_appeals")
      .select("id,subject_telegram_id,status,reason")
      .eq("id", id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!appeal) throw new Error("appeal_not_found");
    if (!["pending", "under_review"].includes(appeal.status)) throw new Error("appeal_already_resolved");

    const finalStatus = normalizedDecision === "grant" ? "granted" : "denied";
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("secureguard_appeals")
      .update({
        status: finalStatus,
        reviewer_telegram_id: reviewer,
        review_note: String(reviewNote || "").slice(0, 1000),
        resolved_at: now,
        updated_at: now
      })
      .eq("id", id)
      .in("status", ["pending", "under_review"])
      .select("id,subject_telegram_id,status,resolved_at")
      .single();
    if (error) throw error;

    if (normalizedDecision === "grant") {
      await supabase.from("secureguard_evidence")
        .update({ status: "dismissed", updated_at: now })
        .eq("subject_telegram_id", appeal.subject_telegram_id)
        .eq("status", "active");
      await setRegistryProfile({
        telegramId: appeal.subject_telegram_id,
        status: "cleared",
        confidence: 100,
        source: "worldz_security_review",
        reason: `Appeal #${id} granted${reviewNote ? ": "+String(reviewNote).slice(0, 300) : ""}`,
        actorTelegramId: reviewer
      });
    }

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
    evidenceFor,
    getActiveAppeal,
    setRegistryProfile,
    recordEvidence,
    reportProfile,
    createAppeal,
    listAppeals,
    resolveAppeal,
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
  SOURCE_POLICIES,
  classifyRisk,
  combineRiskContributions,
  createRexThreatIntel,
  jaccardSimilarity,
  normalizeText,
  riskContribution,
  safeTelegramId,
  textFingerprint
};
