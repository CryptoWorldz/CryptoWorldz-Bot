const {
  ensureGroup,
  isGroup,
  moduleAvailable,
  owner,
  recordAnalytics,
  telegramAdmin
} = require("./community-suite-core");

const SOCIAL_PLATFORMS = Object.freeze({
  x: { label: "X", publishAdapter: "grace_x", connectCommand: "/connectx" },
  facebook: { label: "Facebook", publishAdapter: "grace_facebook", connectCommand: "/connectfacebook" },
  instagram: { label: "Instagram", publishAdapter: null, connectCommand: null },
  youtube: { label: "YouTube", publishAdapter: null, connectCommand: null },
  tiktok: { label: "TikTok", publishAdapter: null, connectCommand: null },
  telegram: { label: "Telegram", publishAdapter: "native", connectCommand: null },
  other: { label: "Other", publishAdapter: null, connectCommand: null }
});

function safeProfileUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!["https:","http:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function graceCapability(env = process.env) {
  const encryption = String(env.GRACE_TOKEN_ENCRYPTION_KEY || env.GRACE_API_SECRET || "").trim().length >= 32;
  const xClientId = String(env.GRACE_X_CLIENT_ID || env.X_CLIENT_ID || env.TWITTER_CLIENT_ID || "").trim();
  const xSecret = String(env.GRACE_X_CLIENT_SECRET || env.X_CLIENT_SECRET || env.TWITTER_CLIENT_SECRET || "").trim();
  const xRedirect = String(env.GRACE_X_REDIRECT_URI || "").trim();
  const metaId = String(env.GRACE_META_APP_ID || env.META_APP_ID || "").trim();
  const metaSecret = String(env.GRACE_META_APP_SECRET || env.META_APP_SECRET || "").trim();
  const metaRedirect = String(env.GRACE_META_REDIRECT_URI || "").trim();
  return {
    x: Boolean(xClientId && xSecret && xRedirect && encryption),
    facebook: Boolean(metaId && metaSecret && metaRedirect && encryption),
    telegram: true,
    instagram: false,
    youtube: false,
    tiktok: false
  };
}

function registerCommunitySocial({ bot, config, supabase, env = process.env }) {
  const send = (message, text) => bot.sendMessage(message.chat.id, text);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);
  const capabilities = graceCapability(env);

  async function ready(message) {
    if (!isGroup(message)) return false;
    await ensureGroup(supabase, message, config);
    return moduleAvailable(supabase, message.chat.id, "social");
  }

  bot.onText(/^\/socials(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "📣 Open /socials inside the customer community.");
      if (!(await ready(message))) return send(message, "⏸ Social Operations are switched off or paused.");
      const { data, error } = await supabase.from("community_suite_social_accounts")
        .select("*").eq("chat_id", Number(message.chat.id)).eq("status","active")
        .order("platform").order("created_at");
      if (error) throw error;
      const lines = (data || []).map((row) => {
        const label = SOCIAL_PLATFORMS[row.platform]?.label || row.platform;
        const authority = row.connection_mode === "oauth" || row.connection_mode === "native"
          ? "✅ connected authority"
          : row.connection_mode === "pending_oauth" ? "⚙️ OAuth pending" : "🔗 directory/manual";
        return `#${row.id} • ${label} • ${row.handle || "account"} • ${authority}${row.profile_url ? "\n"+row.profile_url : ""}`;
      });
      return send(message, `📣 COMMUNITY SOCIALS\n\n${lines.join("\n\n") || "No social accounts registered."}\n\nAdmin: /sociallink PLATFORM | HANDLE | URL\nCapabilities: /socialcapabilities`);
    } catch {
      return send(message, "❌ Social accounts could not be loaded.");
    }
  });

  bot.onText(/^\/socialcapabilities(?:@\w+)?$/i, async (message) => {
    const rows = [
      `X — ${capabilities.x ? "✅ G.R.A.C.E. OAuth/publishing runtime configured" : "⚙️ G.R.A.C.E. adapter exists; runtime credentials not fully configured"}`,
      `Facebook — ${capabilities.facebook ? "✅ G.R.A.C.E. OAuth/publishing runtime configured" : "⚙️ G.R.A.C.E. adapter exists; runtime credentials not fully configured"}`,
      "Instagram — 🧩 account directory + campaigns supported; direct publishing adapter still requires a dedicated Meta integration",
      "YouTube — 🧩 account directory + campaign/shill tracking supported; direct publishing adapter still requires Google OAuth integration",
      "TikTok — 🧩 account directory + campaign/shill tracking supported; direct publishing adapter still requires TikTok OAuth integration",
      "Telegram — ✅ native bot/community integration"
    ];
    return send(message, [
      "📣 WORLDZ SOCIAL CAPABILITIES",
      "",
      ...rows,
      "",
      "Recording a profile URL does not grant publishing authority.",
      "X: /connectx • Facebook: /connectfacebook"
    ].join("\n"));
  });

  bot.onText(/^\/sociallink(?:@\w+)?\s+(x|facebook|instagram|youtube|tiktok|telegram|other)\s*\|\s*([^|]*?)\s*\|\s*(\S+)$/i, async (message, match) => {
    try {
      if (!(await ready(message))) return send(message, "⏸ Social Operations are switched off or paused.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const platform = String(match[1]).toLowerCase();
      const handle = String(match[2] || "").trim().replace(/^@/,"").slice(0,120);
      const profileUrl = safeProfileUrl(match[3]);
      if (!profileUrl) return send(message, "❌ Use a valid http/https profile URL.");
      const mode = platform === "telegram" ? "native" : "manual";
      const { data, error } = await supabase.from("community_suite_social_accounts").upsert({
        chat_id:Number(message.chat.id),
        platform,
        handle,
        profile_url:profileUrl,
        connection_mode:mode,
        status:"active",
        created_by:Number(message.from.id),
        updated_at:new Date().toISOString()
      }, { onConflict:"chat_id,platform,handle" }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase,message.chat.id,message.from.id,"social_account_registered",{platform,accountId:data.id});
      const adapter = SOCIAL_PLATFORMS[platform];
      const next = platform === "x" ? "For publishing authority, use the existing /connectx OAuth flow." :
        platform === "facebook" ? "For publishing authority, use the existing /connectfacebook OAuth flow." :
        ["instagram","youtube","tiktok"].includes(platform) ? "This records the official account for directory/campaign use; direct publishing OAuth is not active for this platform yet." :
        "Account recorded.";
      return send(message, `✅ ${adapter?.label || platform} account #${data.id} recorded.\n${profileUrl}\n\n${next}`);
    } catch {
      return send(message, "❌ Social account could not be recorded.");
    }
  });

  bot.onText(/^\/socialdisable(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_social_accounts")
        .update({status:"disabled",updated_at:new Date().toISOString()})
        .eq("id",Number(match[1])).eq("chat_id",Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Social account #${match[1]} disabled from the Community Suite directory.`);
    } catch {
      return send(message, "❌ Social account could not be disabled.");
    }
  });

  return { capabilities };
}

module.exports = { SOCIAL_PLATFORMS, graceCapability, registerCommunitySocial, safeProfileUrl };
