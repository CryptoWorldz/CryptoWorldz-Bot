const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");

const LEGEND_V8_COMMANDS = Object.freeze([
  { command: "boostshill", description: "Boost an active new Legend" },
  { command: "specialtiers", description: "View 20, 50 and 100 LP offers" },
  { command: "uniquelegend", description: "Apply for Unique Legend review" },
  { command: "legendstatus", description: "View Legend recognition status" }
]);

const BOOST_PATTERN = /^\/boostshill(?:@\w+)?(?:\s+(\d+))?$/i;
const UNIQUE_PATTERN = /^\/uniquelegend(?:@\w+)?(?:\s+([\s\S]+))?$/i;
const REVIEW_PATTERN = /^\/reviewlegend(?:@\w+)?(?:\s+(\d+)\s+(approve|reject)(?:\s*\|\s*([\s\S]+))?)?$/i;
const RESERVE_PATTERN = /^\/reserve(reward)?(on|off)(?:@\w+)?$/i;

function tierCap(status, points) {
  return Number(status && status[`special_tier_${points}_weekly_user_cap`]) || 0;
}

function buildSpecialTierText(status) {
  return [
    "🎁 CryptoWorldz Special Request Tiers",
    "",
    `⭐ 20 LP — smaller verified request • maximum ${tierCap(status, 20)} per Legend each week`,
    `⭐ 50 LP — substantial verified request • maximum ${tierCap(status, 50)} per Legend each week`,
    `⭐ 100 LP — major verified request • maximum ${tierCap(status, 100)} per Legend each week`,
    "",
    `🎯 Shared Special pool: ${Number(status.special_used) || 0}/${Number(status.special_cap) || 0} LP`,
    "Rewards are first verified, first served and require an owner-recorded reason.",
    "Buying tokens, holding a dollar value or donating money does not purchase Legend Points.",
    "",
    `🔗 Shill Boost: ${Number(status.shill_boost_points) || 20} LP to a qualified newcomer after their first verified Raaiiidd.`,
    `Maximum ${Number(status.shill_boost_weekly_inviter_cap) || 15} successful boosts per inviter each week.`
  ].join("\n");
}

function holdingRecognitionText(definitions) {
  const planned = (definitions || []).filter((item) => item.recognition_type === "holding_recognition");
  if (!planned.length) return "No holding-recognition definitions are currently listed.";
  return planned.map((item) => `• ${item.title} — ${item.description}`).join("\n");
}

function registerLegendV8System({ app, bot, config, repository, supabase }) {
  const allowRequest = createRequestLimiter({ maxEvents: 40, intervalMs: 60000 });
  const ownerAllowed = (id) => String(id || "") === String(config.ownerTelegramId || "");
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);

  async function authenticateMini(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowRequest(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    return next();
  }

  async function budgetStatus() {
    const { data, error } = await supabase.rpc("get_reward_budget_status");
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function definitions() {
    const { data, error } = await supabase
      .from("legend_status_definitions")
      .select("code,title,description,recognition_type,points_awarded,minimum_days,minimum_usd,holding_scope,reward_enabled,verification_mode,status")
      .in("status", ["active", "planned"])
      .order("points_awarded", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function memberStatus(telegramId) {
    const [{ data: awards, error: awardError }, { data: applications, error: appError }] = await Promise.all([
      supabase
        .from("member_legend_statuses")
        .select("id,status_code,awarded_points,evidence_note,awarded_at,expires_at,status,legend_status_definitions(title,description)")
        .eq("telegram_id", Number(telegramId))
        .order("awarded_at", { ascending: false }),
      supabase
        .from("legend_status_applications")
        .select("id,status_code,evidence_note,status,review_note,created_at,reviewed_at,legend_status_definitions(title)")
        .eq("telegram_id", Number(telegramId))
        .order("created_at", { ascending: false })
        .limit(10)
    ]);
    if (awardError) throw awardError;
    if (appError) throw appError;
    return { awards: awards || [], applications: applications || [] };
  }

  async function claimBoost(chatId, requesterId, referralId) {
    const { data, error } = await supabase.rpc("claim_shill_boost", {
      p_referral_id: Number(referralId),
      p_requester_telegram_id: Number(requesterId)
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    const messages = {
      not_found: "❌ That referral could not be found.",
      not_inviter: "⛔ Only the Legend who created that referral may request its boost.",
      referral_not_qualified: "⏳ The referral must complete its 7-day qualification first.",
      already_boosted: "✅ That newcomer has already received their Shill Boost.",
      first_mission_required: "🚀 The newcomer needs to complete their first verified Raaiiidd before the boost unlocks.",
      weekly_boost_cap_reached: "🛑 Your 15 successful Shill Boosts for this week have been used.",
      budget_exhausted: "🛑 The shared Special Request pool is currently exhausted."
    };
    if (!result || result.outcome !== "awarded") {
      return send(chatId, messages[result && result.outcome] || "❌ The Shill Boost could not be completed.");
    }
    await Promise.allSettled([
      send(
        result.newcomer_telegram_id,
        `🚀 New Legend Shill Boost!\n\nYou completed your first verified Raaiiidd after joining through a Legend link.\n⭐ +${result.awarded_points} LP\n🏆 New total: ${result.newcomer_total_points} LP`
      ),
      send(
        chatId,
        `✅ Shill Boost completed.\n\n👤 New Legend: ${result.newcomer_telegram_id}\n⭐ +${result.awarded_points} LP awarded to the newcomer.\n\nThis boost is additional to the existing 20 LP referrer and 10 LP newcomer qualification reward.`
      )
    ]);
    return undefined;
  }

  bot.onText(/^\/specialtiers(?:@\w+)?$/i, async (msg) => {
    try { return send(msg.chat.id, buildSpecialTierText(await budgetStatus())); }
    catch { return send(msg.chat.id, "❌ Zed couldn't load the Special Request tiers."); }
  });

  bot.onText(BOOST_PATTERN, async (msg, match) => {
    const referralId = Number(match && match[1]);
    if (Number.isSafeInteger(referralId) && referralId > 0) {
      try { return await claimBoost(msg.chat.id, msg.from.id, referralId); }
      catch { return send(msg.chat.id, "❌ Zed couldn't process that Shill Boost."); }
    }

    try {
      const { data, error } = await supabase
        .from("member_referrals")
        .select("id,referred_telegram_id,referred_username,referred_first_name,status,qualified_at")
        .eq("inviter_telegram_id", Number(msg.from.id))
        .eq("status", "qualified")
        .order("qualified_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      const referralIds = (data || []).map((item) => item.id);
      let boosted = new Set();
      if (referralIds.length) {
        const { data: rows, error: boostError } = await supabase
          .from("shill_boosts")
          .select("referral_id")
          .in("referral_id", referralIds);
        if (boostError) throw boostError;
        boosted = new Set((rows || []).map((item) => String(item.referral_id)));
      }
      const eligible = (data || []).filter((item) => !boosted.has(String(item.id)));
      if (!eligible.length) {
        return send(msg.chat.id, "🚀 No unboosted qualified referrals are available yet. Newcomers must qualify and complete their first verified Raaiiidd.");
      }
      const buttons = eligible.slice(0, 10).map((item) => [{
        text: `🚀 Boost ${item.referred_username ? `@${item.referred_username}` : item.referred_first_name || item.referred_telegram_id}`,
        callback_data: `zed_boost_shill:${item.id}`
      }]);
      return send(
        msg.chat.id,
        "🚀 Choose a qualified newcomer to check for a 20 LP Shill Boost.\n\nThe boost unlocks only after their first verified Raaiiidd and is awarded to the newcomer.",
        { reply_markup: { inline_keyboard: buttons } }
      );
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't load your eligible Shill Boosts.");
    }
  });

  bot.on("callback_query", async (query) => {
    const match = /^zed_boost_shill:(\d+)$/.exec(String(query.data || ""));
    if (!match) return;
    await bot.answerCallbackQuery(query.id, { text: "Checking Shill Boost…" }).catch(() => undefined);
    try {
      const chatId = query.message ? query.message.chat.id : query.from.id;
      await claimBoost(chatId, query.from.id, Number(match[1]));
    } catch {
      const chatId = query.message ? query.message.chat.id : query.from.id;
      await send(chatId, "❌ Zed couldn't process that Shill Boost.");
    }
  });

  bot.onText(UNIQUE_PATTERN, async (msg, match) => {
    const note = String((match && match[1]) || "").trim();
    try {
      const { data, error } = await supabase.rpc("apply_unique_legend", {
        p_telegram_id: Number(msg.from.id),
        p_evidence_note: note
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result.outcome === "user_not_registered") return send(msg.chat.id, "❌ Register with /register before applying.");
      if (result.outcome === "already_pending") return send(msg.chat.id, `⏳ Your Unique Legend application #${result.application_id} is already awaiting review.`);
      if (result.outcome === "cooldown_active") return send(msg.chat.id, "🏆 You already received a Unique Legend award within the current 90-day period.");
      if (result.outcome === "not_yet_eligible") {
        return send(
          msg.chat.id,
          `🌟 Unique Legend Progress\n\nMembership: ${result.membership_days}/30 days\nVerified Raaiiidds: ${result.mission_count}/10\nQualified referrals: ${result.referral_count}/5\n\nThis award recognises sustained leadership, real work and community impact. Token purchases and donations are not eligibility shortcuts.`
        );
      }
      if (result.outcome !== "submitted") return send(msg.chat.id, "❌ The Unique Legend application could not be submitted.");
      return send(
        msg.chat.id,
        `🌟 Unique Legend Application Submitted\n\nApplication #${result.application_id}\nMembership: ${result.membership_days} days\nVerified Raaiiidds: ${result.mission_count}\nQualified referrals: ${result.referral_count}\n\nThe 250 LP award requires owner review and the protected reserve must be deliberately opened. It cannot be purchased through token holdings or donations.`
      );
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't submit the Unique Legend application.");
    }
  });

  bot.onText(/^\/legendstatus(?:@\w+)?$/i, async (msg) => {
    try {
      const [status, defs] = await Promise.all([memberStatus(msg.from.id), definitions()]);
      const awards = status.awards.length
        ? status.awards.map((item) => `🏆 ${item.legend_status_definitions && item.legend_status_definitions.title || item.status_code} • ${item.awarded_points} LP • ${item.status}`).join("\n")
        : "No earned Legend statuses yet.";
      const applications = status.applications.length
        ? status.applications.map((item) => `📋 #${item.id} ${item.legend_status_definitions && item.legend_status_definitions.title || item.status_code} • ${item.status}`).join("\n")
        : "No applications yet.";
      return send(
        msg.chat.id,
        `🌍 CryptoWorldz Legend Status\n\n${awards}\n\nApplications:\n${applications}\n\nPlanned opt-in recognition only — no points or payouts:\n${holdingRecognitionText(defs)}\n\nHolding recognitions remain inactive until official-token pricing, legal review and a fair public-wallet verifier are complete.`
      );
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't load your Legend status.");
    }
  });

  bot.onText(REVIEW_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    const applicationId = Number(match && match[1]);
    const action = String((match && match[2]) || "").toLowerCase();
    const note = String((match && match[3]) || "").trim();
    if (!Number.isSafeInteger(applicationId) || !["approve", "reject"].includes(action)) {
      return send(msg.chat.id, "❌ Use: /reviewlegend APPLICATION_ID approve|reject | review note");
    }
    try {
      const { data, error } = await supabase.rpc("review_unique_legend", {
        p_application_id: applicationId,
        p_approve: action === "approve",
        p_reviewed_by: Number(msg.from.id),
        p_review_note: note
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result.outcome === "reserve_locked") return send(msg.chat.id, "🛡 The 1,500 LP owner reserve is locked for first-week testing. Use /reserverewardon only after deliberately reviewing the active 3,500 LP results.");
      if (result.outcome === "budget_exhausted") return send(msg.chat.id, "🛑 The owner reserve or 5,000 LP hard ceiling cannot support this award.");
      if (result.outcome === "not_found") return send(msg.chat.id, "❌ Application not found.");
      if (result.outcome === "already_reviewed") return send(msg.chat.id, "⚠️ That application was already reviewed.");
      if (result.outcome === "rejected") return send(msg.chat.id, `✅ Unique Legend application #${applicationId} rejected and recorded.`);
      if (result.outcome !== "approved") return send(msg.chat.id, "❌ The Unique Legend review could not be completed.");
      await Promise.allSettled([
        send(result.telegram_id, `🌟 UNIQUE LEGEND AWARDED\n\n⭐ +${result.awarded_points} LP\n🏆 New total: ${result.total_points} LP\n\nThis recognises sustained leadership, verified work and real community impact.`),
        send(msg.chat.id, `✅ Unique Legend approved.\n\n👤 ${result.telegram_id}\n⭐ +${result.awarded_points} LP\n🏆 New total: ${result.total_points} LP`)
      ]);
      return undefined;
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't complete that Unique Legend review.");
    }
  });

  bot.onText(RESERVE_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    const enabled = String(match && match[2] || "").toLowerCase() === "on";
    try {
      const { error } = await supabase
        .from("reward_budget_settings")
        .update({ reserve_enabled: enabled, updated_by: Number(msg.from.id), updated_at: new Date().toISOString() })
        .eq("id", "global");
      if (error) throw error;
      return send(msg.chat.id, enabled
        ? "⚠️ Owner reserve ENABLED. Up to 1,500 protected LP may now be used, while the absolute weekly ceiling remains 5,000 LP."
        : "🛡 Owner reserve locked. Active weekly rewards remain capped at 3,500 LP.");
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't update the reserve lock.");
    }
  });

  app.get("/api/mini/legend-v8/status", authenticateMini, async (req, res) => {
    try {
      const [member, defs, budget] = await Promise.all([
        memberStatus(req.telegramUser.id),
        definitions(),
        budgetStatus()
      ]);
      return res.json({ ok: true, member, definitions: defs, budget });
    } catch {
      return res.status(500).json({ ok: false, error: "legend_status_failed" });
    }
  });
}

module.exports = {
  BOOST_PATTERN,
  LEGEND_V8_COMMANDS,
  REVIEW_PATTERN,
  UNIQUE_PATTERN,
  buildSpecialTierText,
  registerLegendV8System,
  tierCap
};
