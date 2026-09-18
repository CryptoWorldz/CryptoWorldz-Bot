const GRACE_PLATFORMS = Object.freeze(["x", "facebook", "instagram", "youtube", "tiktok"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePlatform(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return GRACE_PLATFORMS.includes(normalized) ? normalized : null;
}

function parseDraftPayload(raw) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false, error: "A caption is required." };

  const pieces = text.split("|").map((piece) => piece.trim()).filter(Boolean);
  const hasTitle = pieces.length >= 2;
  const title = hasTitle ? pieces.shift() : "Grace Social Draft";
  const body = hasTitle ? pieces.join(" | ") : text;

  if (title.length > 160) return { ok: false, error: "The title must be 160 characters or fewer." };
  if (body.length > 4000) return { ok: false, error: "The caption must be 4000 characters or fewer." };

  return { ok: true, value: { title, body } };
}

function parseAccountPayload(raw) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false, error: "Account action required." };

  const [actionRaw, ...rest] = text.split(/\s+/);
  const action = actionRaw.toLowerCase();

  if (["enable", "disable"].includes(action)) {
    const accountId = Number(rest[0]);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return { ok: false, error: `Use: /accounts ${action} account_id` };
    }
    return { ok: true, value: { action, accountId } };
  }

  if (action !== "add") {
    return { ok: false, error: "Use: /accounts add, enable or disable." };
  }

  const payload = rest.join(" ");
  const parts = payload.split("|").map((part) => part.trim());
  if (parts.length < 3 || parts.length > 4) {
    return {
      ok: false,
      error: "Use: /accounts add platform | account_key | display name | @handle"
    };
  }

  const platform = normalizePlatform(parts[0]);
  const accountKey = String(parts[1] || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const displayName = String(parts[2] || "").trim();
  const handle = String(parts[3] || "").trim().replace(/^@/, "");

  if (!platform) return { ok: false, error: `Platform must be one of: ${GRACE_PLATFORMS.join(", ")}.` };
  if (!accountKey || accountKey.length > 50) return { ok: false, error: "Account key must be 1-50 safe characters." };
  if (!displayName || displayName.length > 120) return { ok: false, error: "Display name is required." };
  if (handle.length > 120) return { ok: false, error: "Handle is too long." };

  return { ok: true, value: { action, platform, accountKey, displayName, handle } };
}

function parseSchedulePayload(raw) {
  const parts = String(raw || "").split("|").map((part) => part.trim());
  if (parts.length !== 3) {
    return {
      ok: false,
      error: "Use: /schedule post_uuid | 2026-08-06T09:00+10:00 | account_ids"
    };
  }

  const [postId, dateText, accountText] = parts;
  if (!UUID_PATTERN.test(postId)) return { ok: false, error: "The post UUID is invalid." };

  const scheduledFor = new Date(dateText);
  if (Number.isNaN(scheduledFor.getTime())) {
    return { ok: false, error: "Use an ISO date with timezone, for example 2026-08-06T09:00+10:00." };
  }

  const accountIds = [...new Set(accountText.split(/[\s,]+/).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!accountIds.length) return { ok: false, error: "At least one valid account ID is required." };

  return { ok: true, value: { postId, scheduledFor: scheduledFor.toISOString(), accountIds } };
}

function parsePostActionPayload(raw, requiresReason = false) {
  const text = String(raw || "").trim();
  const [postId, ...reasonParts] = text.split(/\s+/);
  if (!UUID_PATTERN.test(postId || "")) return { ok: false, error: "A valid post UUID is required." };
  const reason = reasonParts.join(" ").trim();
  if (requiresReason && !reason) return { ok: false, error: "A rejection reason is required." };
  return { ok: true, value: { postId, reason } };
}

function parseBudgetPayload(raw) {
  const amount = Number(String(raw || "").trim());
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
    return { ok: false, error: "Use a monthly budget from 0 to 100000 USD." };
  }
  return { ok: true, value: Number(amount.toFixed(2)) };
}

function secretReferenceFor(platform, accountKey) {
  const safePlatform = String(platform || "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const safeKey = String(accountKey || "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `GRACE_${safePlatform}_TOKEN_${safeKey}`;
}

function estimatePostCost(platform, hasLink, costModel = {}) {
  const model = costModel && typeof costModel === "object" ? costModel[platform] : null;
  if (!model || typeof model !== "object") return 0;
  const value = Number(hasLink ? model.link : model.text);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatMoney(value) {
  return `$${(Number(value) || 0).toFixed(2)} USD`;
}

function shortId(value) {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text;
}

module.exports = {
  GRACE_PLATFORMS,
  estimatePostCost,
  formatMoney,
  normalizePlatform,
  parseAccountPayload,
  parseBudgetPayload,
  parseDraftPayload,
  parsePostActionPayload,
  parseSchedulePayload,
  secretReferenceFor,
  shortId
};
