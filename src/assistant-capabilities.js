const CAPABILITY_CATALOG = Object.freeze([
  {
    key: "command_centre",
    label: "ZED Command Centre",
    moduleKey: null,
    summary: "Core navigation, profiles, points, commands and group operations.",
    memberCommands: ["/zedstart", "/commands", "/profile", "/points", "/leaderboard"],
    adminCommands: ["/zedsettings"]
  },
  {
    key: "worldping",
    label: "WorldPing™",
    moduleKey: "worldping",
    summary: "Visible Telegram group alerts with AdminsOnlyPing or FullMemberPing modes.",
    memberCommands: ["/worldping alert | TITLE | MESSAGE", "/worldping <message>"],
    adminCommands: ["/worldpingmode admin", "/worldpingmode full"]
  },
  {
    key: "ronald_raider",
    label: "Ronald Raider",
    moduleKey: "ronald_raider",
    summary: "Interactive Raid queue, post targets, DONE submissions and Legend Points review flow.",
    memberCommands: ["/raid", "/next"],
    adminCommands: ["/raid <post URL>", "/raidprogress LIKES REPOSTS REPLIES VIEWS", "/stopraid"]
  },
  {
    key: "shill_links",
    label: "Shill Links + Referrals",
    moduleKey: null,
    summary: "Unique referral links, recorded joins and referral status.",
    memberCommands: ["/shilllink", "/referrals"],
    adminCommands: []
  },
  {
    key: "shill_rewards",
    label: "Shill Rewards",
    moduleKey: "shill_rewards",
    summary: "Verified token-sharing proofs across supported social platforms for Legend Points.",
    memberCommands: ["/shillpoints", "/shill TOKEN | https://proof-link"],
    adminCommands: ["/pendingshills", "/approveshill ID", "/rejectshill ID reason"]
  },
  {
    key: "rex_secureguard",
    label: "REX SecureGuard™",
    moduleKey: "rex_secureguard",
    summary: "Group security, verification, moderation and emergency controls.",
    memberCommands: ["/secureguard status"],
    adminCommands: ["/secureguard"]
  },
  {
    key: "alice_support",
    label: "ALICE™ Support",
    moduleKey: "alice_support",
    summary: "Tracked member support, ticket creation, replies and admin resolution.",
    memberCommands: ["/alice", "/support", "/ticket SUBJECT | MESSAGE", "/mytickets"],
    adminCommands: ["/tickets", "/ticketclose ID"]
  },
  {
    key: "custom_ai",
    label: "Community AI",
    moduleKey: "custom_ai",
    summary: "Customer-configurable AI with approved knowledge, Auto Pick personalities and live capability awareness.",
    memberCommands: ["/aicommunity", "/askcommunity QUESTION", "/aicapabilities", "/autopicks"],
    adminCommands: ["/aiconfig", "/autopick PRESET", "/aibuild NAME | PERSONALITY | PURPOSE", "/aiknowledge"]
  },
  {
    key: "worldzscan",
    label: "WorldzScan™",
    moduleKey: "worldzscan",
    summary: "Token/contract scan routes for one or multiple addresses.",
    memberCommands: ["/scan TOKEN_ADDRESS", "/scan20 ADDRESS1 ADDRESS2 ..."],
    adminCommands: []
  },
  {
    key: "market_alerts",
    label: "Major Buy + Market Alerts",
    moduleKey: "market_alerts",
    summary: "Configured real market/buy alert rules and thresholds.",
    memberCommands: ["/buyalerts"],
    adminCommands: ["/buyalert", "/buyalertoff"]
  },
  {
    key: "wallet_watch",
    label: "Wallet Watchlists",
    moduleKey: "wallet_watch",
    summary: "Public wallet watchlists for configured community monitoring.",
    memberCommands: ["/walletwatch"],
    adminCommands: ["/watchwallet", "/unwatchwallet"]
  },
  {
    key: "calendar",
    label: "Community Calendar",
    moduleKey: "calendar",
    summary: "Community events and launch countdowns.",
    memberCommands: ["/events", "/launchcountdown"],
    adminCommands: ["/eventadd", "/eventdel"]
  },
  {
    key: "giveaways",
    label: "Giveaways",
    moduleKey: "giveaways",
    summary: "Recorded giveaway entries and controlled winner draws.",
    memberCommands: ["/giveaway", "/giveawayjoin ID"],
    adminCommands: ["/giveawaydraw ID"]
  },
  {
    key: "votes",
    label: "Worldz Votes Centre™",
    moduleKey: "votes",
    summary: "Organic popularity voting and rankings.",
    memberCommands: ["/worldzvotes", "/tokenvote", "/worldztrending", "/worldzrankings"],
    adminCommands: []
  },
  {
    key: "govern",
    label: "WorldzGovern™",
    moduleKey: "govern",
    summary: "DAO governance proposals, voting and delegation, separate from popularity voting.",
    memberCommands: ["/worldzgovern", "/governproposals", "/governvote"],
    adminCommands: []
  },
  {
    key: "inbox",
    label: "Worldz Inbox™",
    moduleKey: "inbox",
    summary: "Private Worldz messaging, replies and message settings.",
    memberCommands: ["/inbox", "/dm", "/replydm", "/dmsettings"],
    adminCommands: []
  },
  {
    key: "worldzcast",
    label: "WorldzCast™",
    moduleKey: "worldzcast",
    summary: "Approval-controlled broadcasts across enabled Telegram destinations.",
    memberCommands: [],
    adminCommands: ["/worldzcast", "/confirmworldzcast", "/worldzcasttargets"]
  },
  {
    key: "social",
    label: "G.R.A.C.E. Social",
    moduleKey: "social",
    summary: "Approval-controlled social drafting, scheduling, campaigns and supported account connections.",
    memberCommands: ["/socials", "/socialcapabilities"],
    adminCommands: ["/grace", "/draft", "/schedule", "/campaigns"]
  },
  {
    key: "analytics",
    label: "Community Analytics",
    moduleKey: "analytics",
    summary: "Community Suite activity and operational analytics.",
    memberCommands: [],
    adminCommands: ["/analytics"]
  },
  {
    key: "launchpad",
    label: "WorldzLaunchPad™",
    moduleKey: "launchpad",
    summary: "LaunchPad project/token linkage and community launch status.",
    memberCommands: ["/launchstatus"],
    adminCommands: ["/launchconnect"]
  },
  {
    key: "webhooks",
    label: "API + Webhooks",
    moduleKey: "webhooks",
    summary: "Customer API keys and signed webhook integrations.",
    memberCommands: [],
    adminCommands: ["/apikeycreate", "/apikeys", "/webhookadd", "/webhooks"]
  }
]);


const CAPABILITY_ALIASES = Object.freeze({
  command_centre: ["command centre", "command center", "zed"],
  worldping: ["worldping", "world ping"],
  ronald_raider: ["ronald raider", "raid bot", "raider"],
  shill_links: ["shill link", "shill links", "referral link", "referral links"],
  shill_rewards: ["shill rewards", "shill points"],
  rex_secureguard: ["rex secureguard", "secureguard", "secure guard", "rex"],
  alice_support: ["alice support", "alice"],
  custom_ai: ["community ai", "auto pick", "autopick", "custom ai"],
  worldzscan: ["worldzscan", "worldz scan", "token scan"],
  market_alerts: ["buy alerts", "market alerts", "whale alerts"],
  wallet_watch: ["wallet watch", "wallet watchlist", "wallet watchlists"],
  calendar: ["community calendar", "calendar", "launch countdown"],
  giveaways: ["giveaway", "giveaways"],
  votes: ["worldz votes", "votes centre", "votes center", "token vote"],
  govern: ["worldzgovern", "worldz govern", "governance"],
  inbox: ["worldz inbox", "inbox", "private dm"],
  worldzcast: ["worldzcast", "worldz cast"],
  social: ["g.r.a.c.e.", "grace social", "grace"],
  analytics: ["community analytics", "analytics"],
  launchpad: ["worldzlaunchpad", "worldz launchpad", "launchpad"],
  webhooks: ["api and webhooks", "api + webhooks", "webhooks", "api key"]
});

const CAPABILITY_INTENT = /\b(do we|have|has|is there|can we|can i|how|what|where|use|using|send|start|run|open|enable|disable|set|feature|command|available|works?|alert|broadcast|create|make|show)\b/i;
const LOCKDOWN_ALLOWED = new Set(["command_centre", "rex_secureguard", "alice_support", "inbox"]);

function normalizeCapabilityQuestion(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9+.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCapabilityMention(question) {
  const normalized = normalizeCapabilityQuestion(question);
  if (!normalized || !CAPABILITY_INTENT.test(normalized)) return null;
  for (const capability of CAPABILITY_CATALOG) {
    const aliases = CAPABILITY_ALIASES[capability.key] || [capability.label.toLowerCase()];
    if (aliases.some((alias) => normalized.includes(normalizeCapabilityQuestion(alias)))) return capability.key;
  }
  return null;
}

function stateSentence(item) {
  switch (item?.state) {
    case "enabled":
      return "It is enabled and available in this group.";
    case "runtime_available":
      return "It is built into the Worldz runtime and available.";
    case "runtime_available_group_state_unknown":
      return "It is built into the Worldz runtime; this group's module/licence state is not configured or not readable yet.";
    case "disabled_in_group":
      return "It exists, but it is switched off in this group.";
    case "configured_but_unlicensed":
      return "It exists, but this group needs active Community Suite access/licensing before the module can run.";
    case "paused_by_lockdown":
      return "It exists, but Emergency Lockdown is currently pausing this module in this group.";
    default:
      return "It exists in the Worldz runtime.";
  }
}

function formatSingleCapability(item) {
  if (!item) return null;
  const member = item.member_commands || [];
  const admin = item.admin_commands || [];
  const lines = [
    `✅ ${item.label} exists.`,
    stateSentence(item),
    item.summary || ""
  ];
  if (member.length) lines.push("", `Use: ${member[0]}`);
  if (member.length > 1) lines.push(`Simple form: ${member[1]}`);
  if (admin.length) lines.push(`Admin controls: ${admin.slice(0, 3).join(" • ")}`);
  return lines.filter(Boolean).join("\n");
}

function deterministicCapabilityAnswer(question, context) {
  const key = findCapabilityMention(question);
  if (!key) return null;
  const item = (context?.capabilities || []).find((row) => row.key === key);
  if (!item) return null;
  return { key, text: formatSingleCapability(item), item };
}

function safeRows(result) {
  return result && !result.error && Array.isArray(result.data) ? result.data : [];
}

function licenceIsActive(licence) {
  if (!licence || licence.status !== "active") return false;
  return !licence.expires_at || Date.parse(licence.expires_at) > Date.now();
}

function capabilityState({ capability, groupKnown, suiteAccess, moduleState, emergencyLockdown }) {
  if (!capability.moduleKey) return "runtime_available";
  if (!groupKnown) return "runtime_available_group_state_unknown";
  if (moduleState === false) return "disabled_in_group";
  if (!suiteAccess) return "configured_but_unlicensed";
  if (emergencyLockdown && !LOCKDOWN_ALLOWED.has(capability.key)) return "paused_by_lockdown";
  return "enabled";
}

async function buildAssistantCapabilityContext({ supabase, chatId }) {
  const numericChatId = Number(chatId);
  let group = null;
  let licence = null;
  let moduleRows = [];

  if (supabase && Number.isFinite(numericChatId)) {
    const [groupResult, modulesResult, licenceResult] = await Promise.allSettled([
      supabase.from("community_suite_groups")
        .select("chat_id,display_name,product_package,language_code,emergency_lockdown,internal_access")
        .eq("chat_id", numericChatId).maybeSingle(),
      supabase.from("community_suite_modules")
        .select("module_key,enabled")
        .eq("chat_id", numericChatId),
      supabase.from("zed_group_licences")
        .select("chat_id,plan,status,expires_at,product_package")
        .eq("chat_id", numericChatId).maybeSingle()
    ]);

    if (groupResult.status === "fulfilled" && !groupResult.value.error) group = groupResult.value.data || null;
    if (modulesResult.status === "fulfilled") moduleRows = safeRows(modulesResult.value);
    if (licenceResult.status === "fulfilled" && !licenceResult.value.error) licence = licenceResult.value.data || null;
  }

  const groupKnown = Boolean(group);
  const activeLicence = licenceIsActive(licence);
  const suiteAccess = Boolean(group?.internal_access === true || activeLicence);
  const moduleMap = new Map(moduleRows.map((row) => [String(row.module_key), row.enabled !== false]));

  const capabilities = CAPABILITY_CATALOG.map((capability) => ({
    key: capability.key,
    label: capability.label,
    summary: capability.summary,
    module_key: capability.moduleKey,
    state: capabilityState({
      capability,
      groupKnown,
      suiteAccess,
      moduleState: capability.moduleKey ? moduleMap.get(capability.moduleKey) : true,
      emergencyLockdown: group?.emergency_lockdown === true
    }),
    member_commands: capability.memberCommands,
    admin_commands: capability.adminCommands
  }));

  return {
    source: "Worldz runtime capability registry",
    rule: "A listed capability exists in the Worldz runtime. Group state controls whether it is enabled and licensed here. Assistants may explain and route exact commands, but must not claim an action ran unless a runtime result proves it.",
    chat_id: Number.isFinite(numericChatId) ? numericChatId : null,
    group_known: groupKnown,
    community: group?.display_name || null,
    product_package: licence?.product_package || group?.product_package || null,
    licence: licence ? {
      plan: licence.plan || null,
      status: licence.status || null,
      active: activeLicence,
      expires_at: licence.expires_at || null
    } : null,
    internal_access: group?.internal_access === true,
    emergency_lockdown: group?.emergency_lockdown === true,
    suite_access: suiteAccess,
    capabilities
  };
}

function formatCapabilitySummary(context) {
  const rows = (context?.capabilities || []).map((item) => {
    const mark = item.state === "enabled" || item.state === "runtime_available" ? "✅" :
      item.state === "disabled_in_group" ? "⬜" :
      item.state === "configured_but_unlicensed" ? "🔒" :
      item.state === "paused_by_lockdown" ? "🚨" : "ℹ️";
    const commands = [...(item.member_commands || []), ...(item.admin_commands || [])].slice(0, 3).join(" • ");
    return `${mark} ${item.label} — ${item.state}${commands ? `\n   ${commands}` : ""}`;
  });
  return [
    "🧠 AI CAPABILITY MAP",
    "",
    ...rows,
    "",
    "✅ enabled/runtime available • ⬜ disabled here • 🔒 licence required • 🚨 paused by lockdown • ℹ️ group state not configured"
  ].join("\n");
}

module.exports = {
  CAPABILITY_ALIASES,
  CAPABILITY_CATALOG,
  buildAssistantCapabilityContext,
  deterministicCapabilityAnswer,
  findCapabilityMention,
  formatCapabilitySummary,
  formatSingleCapability,
  licenceIsActive
};
