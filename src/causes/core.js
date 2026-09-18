const PRIORITIES = new Set(["urgent", "high", "normal", "low"]);
const PLATFORMS = new Set(["facebook", "x", "telegram", "instagram", "youtube", "tiktok"]);

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function slugify(value) {
  return cleanText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeUrl(value) {
  const text = cleanText(value, 1000);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function parseApproval(value) {
  const text = cleanText(value, 120).toLowerCase();
  return /owner|required|yes|true|approval/.test(text);
}

function parseCausePayload(input) {
  const text = String(input || "").trim();
  if (!text) return { ok: false, error: "Add the cause details underneath /cause_add." };

  const aliases = {
    cause: "cause",
    organiser: "organiser",
    organizer: "organiser",
    location: "location",
    needs: "needs",
    priority: "priority",
    platforms: "platforms",
    tracking: "tracking",
    approval: "approval",
    fundraiser: "fundraiserUrl",
    "fundraiser link": "fundraiserUrl",
    "gofundme link": "fundraiserUrl",
    facebook: "facebookUrl",
    "facebook page": "facebookUrl"
  };
  const fields = {};
  let lastKey = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (!match) {
      if (lastKey) fields[lastKey] = `${fields[lastKey]} ${line}`.trim();
      continue;
    }
    const key = aliases[match[1].trim().toLowerCase()];
    if (!key) continue;
    fields[key] = match[2].trim();
    lastKey = key;
  }

  const required = ["cause", "organiser", "location", "needs", "priority", "platforms"];
  const missing = required.filter((key) => !cleanText(fields[key]));
  if (missing.length) return { ok: false, error: `Missing: ${missing.join(", ")}.` };

  const priority = cleanText(fields.priority, 20).toLowerCase();
  if (!PRIORITIES.has(priority)) {
    return { ok: false, error: "Priority must be urgent, high, normal or low." };
  }

  const platforms = [...new Set(
    String(fields.platforms)
      .toLowerCase()
      .split(/[,/&]+|\band\b/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
  const invalidPlatforms = platforms.filter((platform) => !PLATFORMS.has(platform));
  if (!platforms.length || invalidPlatforms.length) {
    return { ok: false, error: `Unsupported platforms: ${invalidPlatforms.join(", ") || "none supplied"}.` };
  }

  const fundraiserUrl = normalizeUrl(fields.fundraiserUrl);
  if (fields.fundraiserUrl && !fundraiserUrl) {
    return { ok: false, error: "Fundraiser link must be a valid HTTPS address." };
  }
  const facebookUrl = normalizeUrl(fields.facebookUrl);
  if (fields.facebookUrl && !facebookUrl) {
    return { ok: false, error: "Facebook Page must be a valid HTTPS address." };
  }

  const cause = cleanText(fields.cause, 160);
  const slug = slugify(cause);
  if (!slug) return { ok: false, error: "The cause name could not be converted into a safe ID." };

  return {
    ok: true,
    value: {
      slug,
      cause,
      organiser: cleanText(fields.organiser, 160),
      location: cleanText(fields.location, 160),
      needs: cleanText(fields.needs, 1000),
      priority,
      platforms,
      tracking: cleanText(fields.tracking, 500),
      approvalRequired: parseApproval(fields.approval),
      fundraiserUrl,
      facebookUrl
    }
  };
}

function formatCause(cause, heading = "💜 Impact Cause") {
  const platforms = Array.isArray(cause.platforms) ? cause.platforms : [];
  return [
    heading,
    "",
    `Cause: ${cause.cause || cause.name}`,
    `Organiser: ${cause.organiser}`,
    `Location: ${cause.location}`,
    `Needs: ${cause.needs}`,
    `Priority: ${String(cause.priority || "normal").toUpperCase()}`,
    `Platforms: ${platforms.map((item) => item === "x" ? "X" : item[0].toUpperCase() + item.slice(1)).join(", ")}`,
    `Tracking: ${cause.tracking || "Not configured"}`,
    `Publishing approval: ${cause.approval_required ? "OWNER REQUIRED" : "Standard Command Centre approval"}`,
    cause.fundraiser_url ? `Fundraiser: ${cause.fundraiser_url}` : "Fundraiser: Link pending",
    cause.facebook_url ? `Facebook: ${cause.facebook_url}` : "Facebook: Link pending",
    `Cause ID: ${cause.slug}`
  ].join("\n");
}

module.exports = { PRIORITIES, PLATFORMS, formatCause, parseCausePayload, slugify };
