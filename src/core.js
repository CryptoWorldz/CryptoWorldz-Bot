const MAX_POINT_ADJUSTMENT = 10000;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parseIdSet(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => /^-?\d+$/.test(item))
  );
}

function isAdmin(telegramId, adminIds) {
  return adminIds instanceof Set && adminIds.has(String(telegramId));
}

function decodeBase58(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];

  for (const character of value) {
    const alphabetIndex = alphabet.indexOf(character);
    if (alphabetIndex === -1) return null;

    let carry = alphabetIndex;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) {
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

function isValidSolanaAddress(address) {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return false;
  const decoded = decodeBase58(trimmed);
  return decoded !== null && decoded.length === 32;
}

function shortenWallet(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not Set";
}

const RANKS = Object.freeze([
  [1500, "CryptoWorldz Commander"], [750, "Purple Diamond Legend"],
  [350, "Worldz Champion"], [150, "CryptoWorldz Warrior"],
  [50, "Raaiiidd Legend"], [0, "New Legend"]
]);

function getRank(pointsValue) {
  const points = Number(pointsValue) || 0;
  return RANKS.find(([minimum]) => points >= minimum)[1];
}

const PLATFORM_DEFAULTS = Object.freeze({
  X: ["CryptoWorldz X Raaiiidd", "❤️ Like\n🔁 Repost\n💬 Leave a genuine relevant comment\n⭐ Bookmark when useful"],
  Telegram: ["CryptoWorldz Telegram Raaiiidd", "👀 View the post\n💬 React or reply genuinely\n📣 Share when useful"],
  YouTube: ["CryptoWorldz YouTube Raaiiidd", "▶️ Watch the video\n👍 Like\n💬 Leave a genuine relevant comment\n🔔 Subscribe when useful"],
  TikTok: ["CryptoWorldz TikTok Raaiiidd", "▶️ Watch\n❤️ Like\n💬 Leave a genuine relevant comment\n🔁 Share when useful"],
  Instagram: ["CryptoWorldz Instagram Raaiiidd", "❤️ Like\n💬 Leave a genuine relevant comment\n📣 Share or save when useful"],
  Facebook: ["CryptoWorldz Facebook Raaiiidd", "❤️ React\n💬 Leave a genuine relevant comment\n🔁 Share when useful"],
  Reddit: ["CryptoWorldz Reddit Raaiiidd", "⬆️ Upvote when deserved\n💬 Add a genuine relevant comment"],
  Discord: ["CryptoWorldz Discord Raaiiidd", "👀 View the message\n💬 Join the discussion genuinely"],
  Website: ["CryptoWorldz Website Raaiiidd", "🌐 Visit the page\n📖 Read the update\n📣 Share when useful"],
  Other: ["CryptoWorldz Community Raaiiidd", "🌐 Open the link\n✅ Complete the requested community action"]
});

function detectPlatform(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (["x.com", "twitter.com"].includes(host)) return "X";
  if (host === "t.me" || host.endsWith(".telegram.me")) return "Telegram";
  if (["youtube.com", "youtu.be"].includes(host)) return "YouTube";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return "Facebook";
  if (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it") return "Reddit";
  if (["discord.com", "discord.gg"].includes(host)) return "Discord";
  return "Website";
}

function parseSimpleRaid(value) {
  const parts = String(value || "").split("|").map((item) => item.trim());
  if (!parts[0] || parts.length > 3) return { ok: false, error: "invalid_format" };
  let url;
  try {
    url = new URL(parts[0]);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
  } catch { return { ok: false, error: "invalid_link" }; }
  const reward = parts[1] ? Number(parts[1]) : 10;
  if (!Number.isSafeInteger(reward) || reward < 0 || reward > MAX_POINT_ADJUSTMENT) return { ok: false, error: "invalid_reward" };
  let expiresAt = null;
  if (parts[2]) {
    const match = parts[2].match(/^(\d+)(h|d)$/i);
    if (!match) return { ok: false, error: "invalid_duration" };
    const hours = Number(match[1]) * (match[2].toLowerCase() === "d" ? 24 : 1);
    if (hours < 1 || hours > 24 * 365) return { ok: false, error: "invalid_duration" };
    expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
  }
  const platform = detectPlatform(url);
  const [title, instructions] = PLATFORM_DEFAULTS[platform] || PLATFORM_DEFAULTS.Other;
  return { ok: true, mission: { title, platform, reward_points: reward, link: url.href, target_url: url.href,
    description: "Support this CryptoWorldz community post.",
    instructions: `${instructions}\n✅ Reply DONE after completing the mission`, status: "active",
    starts_at: new Date().toISOString(), expires_at: expiresAt, difficulty: "standard" } };
}

function missionLink(mission) {
  return String((mission && (mission.link || mission.target_url)) || "").trim();
}

function formatMission(mission, options = {}) {
  if (!mission) return "🚀 No active Raaiiidd missions right now. Check back soon, Legend!";

  const reward = Math.max(0, Number(mission.reward_points) || 0);
  const parts = [
    "🚀💜 CryptoWorldz Raaiiidd Mission",
    "",
    `🆔 Mission #${mission.id}`,
    `🎯 ${mission.title || "CryptoWorldz Mission"}`,
    `🌐 Platform: ${mission.platform || "Community"}`,
    `⭐ Reward: ${reward} Legend Points`
  ];

  if (mission.description) parts.push("", String(mission.description).trim());
  if (mission.instructions) parts.push("", `📋 ${String(mission.instructions).trim()}`);
  const link = missionLink(mission);
  if (link) parts.push("", `🔗 ${link}`);

  parts.push("", "Reply DONE or ✅ DONE once completed.");
  if (options.includeMissionsHint !== false) {
    parts.push("Use /missions to view every active Raaiiidd.");
  }

  return parts.join("\n");
}

function formatMissionList(missions) {
  if (!Array.isArray(missions) || missions.length === 0) {
    return "🚀 Active CryptoWorldz Raaiiidds\n\nNo active missions right now. Check back soon, Legend!";
  }

  const blocks = missions.map((mission) => {
    const lines = [
      `🆔 #${mission.id} — ${mission.title || "CryptoWorldz Mission"}`,
      `🌐 ${mission.platform || "Community"} • ⭐ ${Math.max(0, Number(mission.reward_points) || 0)} LP`
    ];
    if (mission.instructions) lines.push(`📋 ${String(mission.instructions).trim()}`);
    const link = missionLink(mission);
    if (link) lines.push(`🔗 ${link}`);
    return lines.join("\n");
  });

  return `🚀 Active CryptoWorldz Raaiiidds\n\n${blocks.join("\n\n")}`;
}

function medalFor(index) {
  return ["🥇", "🥈", "🥉"][index] || `${index + 1}.`;
}

function isDoneClaim(text) {
  return /^\s*(?:✅\s*)?done(?:\s+.*)?\s*$/i.test(String(text || ""));
}

function isDuplicateError(error) {
  return Boolean(error && (error.code === "23505" || /duplicate|unique/i.test(error.message || "")));
}

function calculateAdjustedPoints(currentValue, adjustmentValue) {
  const current = Math.max(0, Number(currentValue) || 0);
  const adjustment = Number(adjustmentValue);

  if (!Number.isSafeInteger(adjustment) || adjustment === 0) {
    return { ok: false, error: "invalid_adjustment" };
  }
  if (Math.abs(adjustment) > MAX_POINT_ADJUSTMENT) {
    return { ok: false, error: "adjustment_too_large" };
  }
  if (current + adjustment < 0) {
    return { ok: false, error: "points_below_zero" };
  }

  return { ok: true, points: current + adjustment, adjustment };
}

function parsePositiveId(value) {
  const parsed = Number(String(value || "").trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNewMissionPayload(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (parts.length !== 6 || parts.some((part, index) => index < 4 && !part)) {
    return { ok: false, error: "invalid_format" };
  }

  const rewardPoints = Number(parts[2]);
  if (!Number.isSafeInteger(rewardPoints) || rewardPoints < 0 || rewardPoints > MAX_POINT_ADJUSTMENT) {
    return { ok: false, error: "invalid_reward" };
  }

  try {
    const url = new URL(parts[3]);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  } catch {
    return { ok: false, error: "invalid_link" };
  }

  return {
    ok: true,
    mission: {
      title: parts[0],
      platform: parts[1],
      reward_points: rewardPoints,
      link: parts[3],
      target_url: parts[3],
      description: parts[4],
      instructions: parts[5],
      status: "open"
    }
  };
}

const EDITABLE_MISSION_FIELDS = new Set([
  "title",
  "description",
  "platform",
  "link",
  "instructions",
  "reward_points",
  "status"
]);

function parseEditMissionPayload(value) {
  const match = String(value || "").match(/^\s*(\d+)\s+([a-z_]+)\s*\|\s*(.+?)\s*$/i);
  if (!match) return { ok: false, error: "invalid_format" };

  const missionId = parsePositiveId(match[1]);
  const field = match[2].toLowerCase();
  let newValue = match[3].trim();

  if (!missionId || !EDITABLE_MISSION_FIELDS.has(field) || !newValue) {
    return { ok: false, error: "invalid_edit" };
  }

  if (field === "reward_points") {
    const reward = Number(newValue);
    if (!Number.isSafeInteger(reward) || reward < 0 || reward > MAX_POINT_ADJUSTMENT) {
      return { ok: false, error: "invalid_reward" };
    }
    newValue = reward;
  }

  if (field === "status") {
    const validStatuses = new Set(["active", "open", "completed", "closed", "cancelled"]);
    newValue = newValue.toLowerCase();
    if (!validStatuses.has(newValue)) return { ok: false, error: "invalid_status" };
  }

  if (field === "link") {
    try {
      const url = new URL(newValue);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
    } catch {
      return { ok: false, error: "invalid_link" };
    }
  }

  return { ok: true, missionId, field, newValue };
}

function parsePointsAdjustment(value) {
  const match = String(value || "").trim().match(/^(\d+)\s+([+-]?\d+)$/);
  if (!match) return { ok: false, error: "invalid_format" };

  const telegramId = parsePositiveId(match[1]);
  const amount = Number(match[2]);
  const validation = calculateAdjustedPoints(Math.max(0, -amount), amount);
  if (!telegramId || !validation.ok) return { ok: false, error: validation.error || "invalid_id" };
  return { ok: true, telegramId, amount };
}

function formatCommunity(config) {
  const links = [
    ["💬 Telegram", config.communityTelegramUrl],
    ["𝕏 X", config.communityXUrl],
    ["🌐 Website", config.communityWebsiteUrl],
    ["📢 Announcements", config.communityAnnouncementsUrl],
    ["🛟 Support", config.communitySupportUrl]
  ];

  const rows = links.filter(([, link]) => link).map(([label, link]) => `${label}:\n${link}`);
  return `🌍 CryptoWorldz Community\n\n${rows.join("\n\n")}`;
}

function formatWebsite(config) {
  const url = config.websiteUrl || "https://CryptoWorldz.xyz";
  return config.websiteLaunched
    ? `🌍 CryptoWorldz.xyz\n\n${url}`
    : `🌍 CryptoWorldz.xyz\n\nWebsite launching soon...\n\n${url}`;
}

function splitTelegramMessage(text, limit = 4096) {
  const value = String(text || "");
  if (value.length <= limit) return [value];

  const chunks = [];
  let remaining = value;
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = remaining.lastIndexOf(" ", limit);
    if (splitAt < 1) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function createRateLimiter({ maxEvents, intervalMs, now = () => Date.now() }) {
  const events = new Map();
  return function allow(key) {
    const timestamp = now();
    const cutoff = timestamp - intervalMs;
    const recent = (events.get(key) || []).filter((item) => item > cutoff);
    if (recent.length >= maxEvents) {
      events.set(key, recent);
      return false;
    }
    recent.push(timestamp);
    events.set(key, recent);
    return true;
  };
}

module.exports = {
  EDITABLE_MISSION_FIELDS,
  MAX_POINT_ADJUSTMENT,
  calculateAdjustedPoints,
  createRateLimiter,
  decodeBase58,
  formatCommunity,
  formatMission,
  formatMissionList,
  formatWebsite,
  getRank,
  isAdmin,
  isDoneClaim,
  isDuplicateError,
  isValidSolanaAddress,
  medalFor,
  missionLink,
  parseBoolean,
  parseEditMissionPayload,
  parseIdSet,
  parseNewMissionPayload,
  parseSimpleRaid,
  parsePointsAdjustment,
  parsePositiveId,
  shortenWallet,
  splitTelegramMessage
};
