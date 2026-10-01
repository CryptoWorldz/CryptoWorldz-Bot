const crypto = require("node:crypto");

const GROUP_TYPES = new Set(["group", "supergroup"]);
const SOL_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{32,128}$/;

const MODULES = Object.freeze([
  ["rex_secureguard", "🛡 REXSECURE ULTIMATE™"],
  ["alice_support", "📥 ALICE™ Support"],
  ["custom_ai", "🤖 Custom AI Community Bot"],
  ["ronald_raider", "🤠 Ronald Raider"],
  ["shill_rewards", "📣 Shill Rewards"],
  ["votes", "🗳 Worldz Votes Centre™"],
  ["worldzscan", "🔎 WorldzScan™"],
  ["market_alerts", "🐋 Major Buy + Market Alerts"],
  ["wallet_watch", "👛 Wallet Watchlists"],
  ["calendar", "📅 Community Calendar"],
  ["giveaways", "🎁 Giveaways"],
  ["analytics", "📊 Analytics"],
  ["social", "👩‍💼 G.R.A.C.E. Social"],
  ["inbox", "📥 Worldz Inbox™"],
  ["worldping", "🌐 WorldPing™"],
  ["worldzcast", "📡 WorldzCast™"],
  ["launchpad", "🚀 WorldzLaunchPad™"],
  ["webhooks", "🔌 API + Webhooks"]
]);

const THEME_PACKS = Object.freeze([
  { key: "purple_galaxy", name: "Purple Galaxy", primary: "#6B4EFF", accent: "#9EDBFF" },
  { key: "cyber_blue", name: "Cyber Blue", primary: "#147BFF", accent: "#62E4FF" },
  { key: "gold_empire", name: "Gold Empire", primary: "#B98A2E", accent: "#FFE39A" },
  { key: "neon_green", name: "Neon Green", primary: "#2BE275", accent: "#B9FFCF" },
  { key: "inferno", name: "Inferno", primary: "#E04A2A", accent: "#FFB08A" },
  { key: "ice", name: "Ice", primary: "#6BD9FF", accent: "#E8FAFF" },
  { key: "diamond", name: "Diamond", primary: "#8D9CFF", accent: "#F4F7FF" },
  { key: "blackout", name: "Blackout", primary: "#17171C", accent: "#D5D5E8" },
  { key: "rainbow_worldz", name: "Rainbow Worldz", primary: "#7B5CFF", accent: "#FFDF5C" },
  { key: "meme_mode", name: "Meme Mode", primary: "#FF4FD8", accent: "#FFF16B" }
]);

function isGroup(message) {
  return GROUP_TYPES.has(String(message?.chat?.type || ""));
}

function slugify(value, fallback = "worldz-community") {
  const result = String(value || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return result || fallback;
}

async function telegramAdmin(bot, message) {
  if (!isGroup(message)) return false;
  try {
    const member = await bot.getChatMember(message.chat.id, message.from.id);
    return ["creator", "administrator"].includes(String(member?.status || ""));
  } catch {
    return false;
  }
}

function owner(message, config) {
  return String(message?.from?.id || "") === String(config?.ownerTelegramId || "");
}

async function ensureGroup(supabase, message, config) {
  if (!isGroup(message)) return null;
  const chatId = Number(message.chat.id);
  const displayName = String(message.chat.title || "Worldz Community").slice(0, 120);
  const workspaceSlug = slugify(`${displayName}-${Math.abs(chatId)}`, `group-${Math.abs(chatId)}`);
  const groupPayload = {
    chat_id: chatId,
    workspace_slug: workspaceSlug,
    display_name: displayName,
    updated_at: new Date().toISOString()
  };
  if (owner(message, config)) {
    groupPayload.owner_telegram_id = Number(message.from.id);
    groupPayload.internal_access = true;
  }
  const { data, error } = await supabase.from("community_suite_groups").upsert(
    groupPayload,
    { onConflict: "chat_id" }
  ).select("*").single();
  if (error) throw error;

  await supabase.from("community_suite_branding").upsert({
    chat_id: chatId,
    updated_at: new Date().toISOString()
  }, { onConflict: "chat_id" });

  const existing = await supabase.from("community_suite_modules")
    .select("module_key").eq("chat_id", chatId);
  if (existing.error) throw existing.error;
  const have = new Set((existing.data || []).map((row) => row.module_key));
  const missing = MODULES.filter(([key]) => !have.has(key)).map(([module_key]) => ({
    chat_id: chatId,
    module_key,
    enabled: true,
    updated_at: new Date().toISOString()
  }));
  if (missing.length) {
    const seeded = await supabase.from("community_suite_modules").insert(missing);
    if (seeded.error) throw seeded.error;
  }
  return data;
}

async function moduleEnabled(supabase, chatId, moduleKey) {
  const { data, error } = await supabase.from("community_suite_modules")
    .select("enabled").eq("chat_id", Number(chatId)).eq("module_key", String(moduleKey)).maybeSingle();
  if (error) throw error;
  return data ? data.enabled !== false : true;
}

async function suiteAccessAllowed(supabase, chatId) {
  const { data: group, error: groupError } = await supabase.from("community_suite_groups")
    .select("internal_access").eq("chat_id", Number(chatId)).maybeSingle();
  if (groupError) throw groupError;
  if (group?.internal_access === true) return true;
  return Boolean(await currentLicence(supabase, chatId));
}

async function moduleAvailable(supabase, chatId, moduleKey) {
  if (!(await suiteAccessAllowed(supabase, chatId))) return false;
  const { data: group, error: groupError } = await supabase.from("community_suite_groups")
    .select("emergency_lockdown").eq("chat_id", Number(chatId)).maybeSingle();
  if (groupError) throw groupError;
  const emergencyAllowed = new Set(["rex_secureguard","alice_support","inbox"]);
  if (group?.emergency_lockdown && !emergencyAllowed.has(String(moduleKey))) return false;
  return moduleEnabled(supabase, chatId, moduleKey);
}

async function setModule(supabase, chatId, moduleKey, enabled, actorId) {
  if (!MODULES.some(([key]) => key === moduleKey)) throw new Error("unknown_module");
  const { error } = await supabase.from("community_suite_modules").upsert({
    chat_id: Number(chatId),
    module_key: moduleKey,
    enabled: Boolean(enabled),
    updated_by_telegram_id: actorId == null ? null : Number(actorId),
    updated_at: new Date().toISOString()
  }, { onConflict: "chat_id,module_key" });
  if (error) throw error;
}

async function recordAnalytics(supabase, chatId, telegramId, eventType, metadata = {}, source = "telegram") {
  try {
    await supabase.from("community_suite_analytics_events").insert({
      chat_id: Number(chatId),
      telegram_id: telegramId == null ? null : Number(telegramId),
      event_type: String(eventType).slice(0, 80),
      source: String(source).slice(0, 40),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      created_at: new Date().toISOString()
    });
  } catch {}
}

async function currentLicence(supabase, chatId) {
  const { data, error } = await supabase.from("zed_group_licences")
    .select("chat_id,plan,status,expires_at,product_package,rent_to_own_payments,trial_credit_sol,trial_credit_used_at")
    .eq("chat_id", Number(chatId)).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") return null;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}

function pricing(env = process.env) {
  const positive = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  };
  return Object.freeze({
    trialSol: positive(env.WORLDZ_SUITE_TRIAL_SOL, 0.05),
    trialDays: Math.max(1, Math.floor(positive(env.WORLDZ_SUITE_TRIAL_DAYS, 7))),
    rentSol: positive(env.WORLDZ_SUITE_RENT_SOL, 0.3),
    rentDays: Math.max(1, Math.floor(positive(env.WORLDZ_SUITE_RENT_DAYS, 31))),
    rentToOwnSol: positive(env.WORLDZ_SUITE_RENT_TO_OWN_SOL, 0.5),
    rentToOwnMonths: Math.max(1, Math.floor(positive(env.WORLDZ_SUITE_RENT_TO_OWN_MONTHS, 12))),
    ownSol: positive(env.WORLDZ_SUITE_OWN_SOL, 4.5),
    wallet: String(env.ZED_MAX_SOL_WALLET_ADDRESS || "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u").trim()
  });
}

function secureRandomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

module.exports = {
  GROUP_TYPES,
  MODULES,
  THEME_PACKS,
  SOL_SIGNATURE,
  currentLicence,
  ensureGroup,
  isGroup,
  moduleAvailable,
  moduleEnabled,
  suiteAccessAllowed,
  owner,
  pricing,
  recordAnalytics,
  secureRandomToken,
  setModule,
  slugify,
  telegramAdmin
};
