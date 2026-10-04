function platformFromUrl(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (["x.com", "twitter.com"].includes(host)) return { platform: "X", url: url.href };
  if (["youtube.com", "youtu.be"].includes(host)) return { platform: "YouTube", url: url.href };
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return { platform: "TikTok", url: url.href };
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return { platform: "Facebook", url: url.href };
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return { platform: "Instagram", url: url.href };
  if (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it") return { platform: "Reddit", url: url.href };
  if (host === "t.me" || host.endsWith(".telegram.me")) return { platform: "Telegram", url: url.href };
  if (["discord.com", "discord.gg"].includes(host)) return { platform: "Discord", url: url.href };
  return { platform: "Website", url: url.href };
}

function normalizeSymbol(value) {
  return String(value || "").trim().replace(/^\$/, "").toUpperCase().slice(0, 20);
}

function parseShillProof(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (parts.length !== 2) return { ok: false, error: "invalid_format" };
  const symbol = normalizeSymbol(parts[0]);
  const proof = platformFromUrl(parts[1]);
  if (!symbol || !proof) return { ok: false, error: "invalid_proof" };
  return { ok: true, symbol, ...proof };
}

const CURRENT_SHILL_CAMPAIGN = Object.freeze({
  id: "CREATE_YOUR_OWN_MONEY_2026_10_02",
  title: "CREATE YOUR OWN MONEY‼️*",
  url: "https://launchpad.cryptoworldz.xyz/create-your-own-money/",
  tagline: "Your Idea. Your Token. Your Community.",
  shareLine: "Share it with your Family & Friends 💜",
  truth: "*Create your own crypto token. Creating one does not automatically make it legal tender, valuable or liquid.",
  footer: "WORLDZ 🌐 — A BETTER WORLD 🌏"
});

function buildShillPackText(campaign = CURRENT_SHILL_CAMPAIGN) {
  return [
    "📣 WORLDZ SHILL PACK",
    "",
    campaign.title,
    campaign.tagline,
    campaign.shareLine,
    "",
    campaign.url,
    "",
    campaign.truth,
    "",
    campaign.footer,
    "",
    "Share genuinely. No spam • No bots • No fake engagement."
  ].join("\n");
}

function registerShillRewards({ bot, repository, supabase, config }) {
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);
  const permission = (telegramId, name) => repository.hasPermission(
    telegramId,
    name,
    config.adminTelegramIds,
    config.ownerTelegramId
  );

  async function enabled(chatId) {
    try {
      const { data, error } = await supabase
        .from("zed_chat_settings")
        .select("shill_rewards_enabled")
        .eq("chat_id", Number(chatId))
        .maybeSingle();
      if (error) throw error;
      return data ? data.shill_rewards_enabled !== false : true;
    } catch {
      return true;
    }
  }

  async function token(symbol) {
    const { data, error } = await supabase
      .from("shill_reward_tokens")
      .select("symbol,display_name,token_mint,enabled,points_per_verified_share")
      .eq("symbol", normalizeSymbol(symbol))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function tokenList() {
    const { data, error } = await supabase
      .from("shill_reward_tokens")
      .select("symbol,display_name,token_mint,points_per_verified_share")
      .eq("enabled", true)
      .order("symbol", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  bot.onText(/^\/shillpoints(?:@\w+)?$/i, async (msg) => {
    try {
      const [tokens, statusResult] = await Promise.all([
        tokenList(),
        supabase.rpc("get_activity_reward_automation_status", { p_telegram_id: Number(msg.from.id) })
      ]);
      if (statusResult.error) throw statusResult.error;
      const status = Array.isArray(statusResult.data) ? statusResult.data[0] : statusResult.data;
      const rows = tokens.map((item) => `• ${item.symbol} — ${item.points_per_verified_share} LP per eligible submitted share that passes the automatic safety checks`).join("\n");
      return send(msg.chat.id, [
        "📣💜 WORLDZ SHILLPOINTS",
        "",
        rows || "No reward tokens are enabled.",
        "",
        `⚡ Automation: ${status?.enabled && status?.auto_shill_points ? "ON" : "OFF"}`,
        `Today: ${Number(status?.shill_claims_today) || 0}/${Number(status?.shill_daily_claim_cap) || 0} Shills`,
        `Points today: ${Number(status?.points_today) || 0}/${Number(status?.user_daily_points_cap) || 0} LP`,
        `Points this week: ${Number(status?.points_this_week) || 0}/${Number(status?.user_weekly_points_cap) || 0} LP`,
        "",
        "Eligible proof platforms:",
        "𝕏 X • Facebook • YouTube • TikTok • Instagram • Reddit • Telegram • Discord • public websites",
        "",
        "Current Worldz campaign: /shillpack",
        "",
        "Submit: /shill TOKEN | https://your-proof-link",
        "Example: /shill WLDZ | https://x.com/yourname/status/123",
        "",
        "⚡ Eligible submissions that pass the automatic checks are awarded immediately.",
        "🛡 Caps, budget limits and anomalies are handled by automatic rules or automatic retry holds.",
        "🏦 Reward funding: Treasury → ring-fenced Reward Wallet → capped weekly member allocation.",
        "Spam, bots, duplicate links and fake engagement earn nothing."
      ].join("\n"));
    } catch {
      return send(msg.chat.id, "❌ ZED couldn't load the Shill Rewards list.");
    }
  });

  bot.onText(/^\/(?:shillpack|shillcampaign)(?:@\w+)?$/i, async (msg) => {
    if (!(await enabled(msg.chat.id))) return send(msg.chat.id, "⏸ Shill Rewards are switched off in /zedsettings.");
    return send(msg.chat.id, buildShillPackText(), {
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [[
          { text: "🌐 OPEN CREATE YOUR OWN MONEY", url: CURRENT_SHILL_CAMPAIGN.url }
        ]]
      }
    });
  });

  bot.onText(/^\/shill(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!(await enabled(msg.chat.id))) return send(msg.chat.id, "⏸ Shill Rewards are switched off in /zedsettings.");
    const parsed = parseShillProof(match && match[1]);
    if (!parsed.ok) {
      return send(msg.chat.id, "📣 Submit proof like this:\n/shill TOKEN | https://your-public-post-link\n\nUse /shillpoints to see eligible tokens and platforms.");
    }
    try {
      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ Register with /register before earning Shill Points.");
      const asset = await token(parsed.symbol);
      if (!asset || !asset.enabled) return send(msg.chat.id, `❌ $${parsed.symbol} is not enabled for Shill Rewards.`);

      const { data, error } = await supabase
        .from("social_shill_submissions")
        .insert({
          telegram_id: Number(msg.from.id),
          token_symbol: asset.symbol,
          platform: parsed.platform,
          proof_url: parsed.url,
          status: "pending"
        })
        .select("id,token_symbol,platform,proof_url,status")
        .single();

      if (error) {
        if (error.code === "23505") return send(msg.chat.id, "⚠️ That proof link has already been submitted.");
        throw error;
      }

      const { data: autoData, error: autoError } = await supabase.rpc("auto_award_social_shill_submission", {
        p_submission_id: Number(data.id)
      });
      if (autoError) throw autoError;
      const auto = Array.isArray(autoData) ? autoData[0] : autoData;

      const outcome = String(auto?.outcome || "deferred_auto");
      const decision = ["awarded","already_awarded"].includes(outcome)
        ? "approved" : outcome === "auto_rejected" ? "rejected" : "deferred";
      if (typeof repository.recordBotDecision === "function") {
        await repository.recordBotDecision({
          subjectType: "shill_submission",
          subjectKey: String(data.id),
          decision,
          reason: auto?.review_reason || outcome,
          rex: { checked: true, role: "public_link_security", decision },
          zed: { checked: true, role: "member_reward_rules", decision },
          auto: { checked: true, role: "caps_budget", decision, outcome },
          grace: { checked: true, role: "social_destination", decision },
          dipshit: { checked: true, role: "submission_usability", decision }
        });
      }

      if (["awarded","already_awarded"].includes(outcome)) {
        return send(msg.chat.id, [
          "⚡ SHILLPOINTS AUTO-AWARDED",
          "",
          `Submission #${data.id}`,
          `🪙 ${data.token_symbol}`,
          `🌐 ${data.platform}`,
          `⭐ +${Number(auto?.points_awarded) || 0} LP`,
          `🏆 New total: ${Number(auto?.total_points) || user.points || 0} LP`,
          "",
          "Validated by the Worldz bot stack. No Admin approval needed."
        ].join("\n"));
      }

      if (["budget_deferred","deferred_auto"].includes(outcome)) {
        return send(msg.chat.id, [
          "🛡 SHILLPOINTS AUTO HOLD",
          "",
          `Submission #${data.id}`,
          `Reason: ${auto?.review_reason || "automatic retry"}`,
          "",
          "ZED + AUTO retry this automatically. No routine Admin approval is required."
        ].join("\n"));
      }

      return send(msg.chat.id, [
        "⚠️ SHILLPOINTS CHECK COMPLETE",
        "",
        `Submission #${data.id}`,
        `Reason: ${auto?.review_reason || outcome}`,
        "",
        "The automatic rules did not award points for this proof."
      ].join("\n"));
    } catch (error) {
      console.error("Shill proof submission failed", { code: error?.code || error?.message || "unknown" });
      return send(msg.chat.id, "❌ ZED couldn't record that Shill Proof.");
    }
  });

  bot.onText(/^\/(?:shillholds|pendingshills)(?:@\w+)?$/i, async (msg) => {
    if (!(await permission(msg.from.id, "submission.view"))) return send(msg.chat.id, "⛔ Protected operations access required.");
    try {
      const { data, error } = await supabase
        .from("social_shill_submissions")
        .select("id,telegram_id,token_symbol,platform,proof_url,rejection_reason,created_at,status")
        .eq("status", "deferred_auto")
        .order("created_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      if (!data?.length) return send(msg.chat.id, "✅ No ShillPoints automation holds.");
      const blocks = data.map((row) => [
        `#${row.id} • $${row.token_symbol} • ${row.platform}`,
        `Legend: ${row.telegram_id}`,
        row.proof_url,
        `Reason: ${row.rejection_reason || "automatic retry"}`
      ].join("\n"));
      return send(msg.chat.id, `🛡 SHILLPOINTS AUTOMATION HOLDS\n\n${blocks.join("\n\n")}\n\nZED + AUTO retry these automatically. No routine Admin approval queue.`);
    } catch {
      return send(msg.chat.id, "❌ ZED couldn't load ShillPoints automation holds.");
    }
  });

  const reconcileShills = async () => {
    try {
      const { data, error } = await supabase.rpc("reconcile_pending_shill_rewards", { p_limit: 50 });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && Number(row.processed) > 0) {
        console.log("ShillPoints automatic reconciliation", {
          processed: Number(row.processed) || 0,
          awarded: Number(row.awarded) || 0,
          held: Number(row.held) || 0
        });
      }
    } catch (error) {
      console.warn("ShillPoints automatic reconciliation unavailable", { code: error?.code || error?.message || "unknown" });
    }
  };

  const shillBootstrapTimer = setTimeout(() => { void reconcileShills(); }, 7_000);
  const shillReconcileTimer = setInterval(() => { void reconcileShills(); }, 60_000);
  shillBootstrapTimer.unref?.();
  shillReconcileTimer.unref?.();

  return { tokenList };
}

module.exports = {
  CURRENT_SHILL_CAMPAIGN,
  buildShillPackText,
  normalizeSymbol,
  parseShillProof,
  platformFromUrl,
  registerShillRewards
};
