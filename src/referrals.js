const { getRank, shortenWallet } = require("./core");

const REFERRAL_COMMANDS = Object.freeze([
  { command: "shilllink", description: "Create your unique community link" },
  { command: "referrals", description: "View your referral progress" },
  { command: "rewardplan", description: "View the fair weekly reward plan" }
]);

const PROFILE_PATTERN = /^\/profile(?:@\w+)?$/;
const ACTIVE_MEMBER_STATUSES = new Set(["member", "administrator", "creator"]);

function isActiveMember(chatMember) {
  if (!chatMember) return false;
  if (ACTIVE_MEMBER_STATUSES.has(chatMember.status)) return true;
  return chatMember.status === "restricted" && chatMember.is_member !== false;
}

function isJoinTransition(update) {
  return Boolean(
    update &&
    update.new_chat_member &&
    !isActiveMember(update.old_chat_member) &&
    isActiveMember(update.new_chat_member)
  );
}

function safeInviteName(telegramId) {
  const suffix = String(telegramId || "").replace(/\D/g, "").slice(-18) || "legend";
  return `CW-${suffix}`.slice(0, 32);
}

function formatAud(cents) {
  return `AUD $${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function budgetRemaining(cap, used) {
  return Math.max(0, (Number(cap) || 0) - (Number(used) || 0));
}

function buildRewardPlan(status, options = {}) {
  const ownerView = Boolean(options.ownerView);
  const lines = [
    "💜 CryptoWorldz Fair Reward Plan",
    "",
    `📊 Weekly Legend Points cap: ${status.effective_weekly_points_cap} LP`,
    `✅ Awarded this week: ${status.total_used} LP`,
    `🛡 Remaining: ${budgetRemaining(status.effective_weekly_points_cap, status.total_used)} LP`,
    "",
    `🚀 Missions: ${status.mission_used}/${status.mission_cap} LP`,
    `🔗 Referrals: ${status.referral_used}/${status.referral_cap} LP`,
    `🏦 Safety reserve: ${status.reserve_used}/${status.reserve_cap} LP`,
    "",
    "Recommended task rewards:",
    "• Quick verified action — 5 LP",
    "• Standard Raaiiidd — 10 LP",
    "• High-effort proof task — 20 LP",
    "• Exceptional owner-approved task — 30 LP maximum",
    "",
    `Qualified referral — ${status.referral_inviter_points} LP to the inviter`,
    `New Legend welcome — ${status.referral_newcomer_points} LP`,
    `Qualification — registered and still joined after ${status.referral_retention_days} days`,
    `Inviter safety cap — ${status.inviter_weekly_qualified_cap} qualified referrals each week`,
    "",
    "Clicks and unverified shares earn no points. Duplicate, self, bot, existing-member and leave/rejoin referrals do not qualify.",
    "",
    "Legend Points are tracked against the weekly plan. Kitty redemptions remain owner-approved and are never automatic."
  ];

  if (ownerView) {
    lines.splice(
      3,
      0,
      `💰 Weekly kitty planning amount: ${
        Number(status.weekly_budget_cents) > 0
          ? formatAud(status.weekly_budget_cents)
          : "Not set — using the 1,000 LP pilot cap"
      }`
    );
  }

  return lines.join("\n");
}

function parseReferralRules(value) {
  const parts = String(value || "")
    .split("|")
    .map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return { ok: false };
  }
  const [inviterPoints, newcomerPoints, retentionDays, weeklyCap] = parts;
  if (
    inviterPoints < 1 || inviterPoints > 100 ||
    newcomerPoints < 0 || newcomerPoints > 50 ||
    retentionDays < 1 || retentionDays > 30 ||
    weeklyCap < 1 || weeklyCap > 25
  ) {
    return { ok: false };
  }
  return { ok: true, inviterPoints, newcomerPoints, retentionDays, weeklyCap };
}

function registerReferralTelegramHandlers({ bot, repository, supabase, config }) {
  const ownerAllowed = (msg) =>
    String(msg && msg.from && msg.from.id) === String(config.ownerTelegramId);

  const isCommunityChat = (msg) =>
    Boolean(msg && msg.chat && ["group", "supergroup", "channel"].includes(msg.chat.type));

  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);

  async function getBudgetStatus() {
    const { data, error } = await supabase.rpc("get_reward_budget_status");
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function getReferralTarget(chatId) {
    const { data, error } = await supabase
      .from("community_referral_targets")
      .select("chat_id,project_slug,title,enabled")
      .eq("chat_id", Number(chatId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listMemberLinks(telegramId) {
    const { data: links, error } = await supabase
      .from("member_referral_links")
      .select("id,telegram_id,chat_id,invite_link,status,joins_recorded,qualified_joins,created_at")
      .eq("telegram_id", Number(telegramId))
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!links || links.length === 0) return [];

    const chatIds = [...new Set(links.map((link) => link.chat_id))];
    const { data: targets, error: targetError } = await supabase
      .from("community_referral_targets")
      .select("chat_id,title,enabled")
      .in("chat_id", chatIds);
    if (targetError) throw targetError;
    const targetByChat = new Map((targets || []).map((target) => [String(target.chat_id), target]));
    return links.map((link) => ({
      ...link,
      target: targetByChat.get(String(link.chat_id)) || null
    }));
  }

  async function referralStats(telegramId) {
    const [{ data: referrals, error: referralError }, links] = await Promise.all([
      supabase
        .from("member_referrals")
        .select("status,inviter_points_awarded,newcomer_points_awarded,joined_at,qualified_at")
        .eq("inviter_telegram_id", Number(telegramId)),
      listMemberLinks(telegramId)
    ]);
    if (referralError) throw referralError;
    const rows = referrals || [];
    return {
      links,
      joins: rows.length,
      pending: rows.filter((row) => row.status === "pending").length,
      qualified: rows.filter((row) => row.status === "qualified").length,
      rejected: rows.filter((row) => row.status === "rejected").length,
      points: rows.reduce((total, row) => total + (Number(row.inviter_points_awarded) || 0), 0)
    };
  }

  if (typeof bot.removeTextListener === "function") {
    bot.removeTextListener(PROFILE_PATTERN);
  }

  bot.onText(PROFILE_PATTERN, async (msg) => {
    try {
      const [profile, stats] = await Promise.all([
        repository.getMemberDetails(msg.from.id),
        referralStats(msg.from.id)
      ]);
      if (!profile) return send(msg.chat.id, "❌ You are not registered. Use /register first.");

      const { user, rewardsEarned } = profile;
      const points = Number(user.points) || 0;
      const completed = Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0);
      const displayName = user.username ? `@${user.username}` : user.first_name || "Legend";

      return send(
        msg.chat.id,
        `🏆 CryptoWorldz Legend Profile

👤 Username: ${displayName}
🆔 Telegram ID: ${user.telegram_id}
🎖 Rank: ${getRank(points)}
⭐ Legend Points: ${points}
🚀 Raaiiidds Completed: ${completed}
📥 Pending Submissions: ${profile.pending}
👛 Wallet Connected: ${user.wallet ? `Yes ✅\n${shortenWallet(user.wallet)}` : "No"}
🎁 Rewards Earned: ${rewardsEarned} Legend Points

🔗 Unique Shill Links: ${stats.links.length}
👥 Recorded Joins: ${stats.joins}
✅ Qualified Referrals: ${stats.qualified}
⏳ Pending Referrals: ${stats.pending}
💜 Referral Points: ${stats.points} LP

📅 Member Since: ${user.registered_at || user.created_at}

Use /shilllink inside an eligible CryptoWorldz group to create your unique link.`
      );
    } catch (error) {
      console.error("Enhanced profile command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ I couldn't load your Legend Profile.");
    }
  });

  bot.onText(/^\/shilllink(?:@\w+)?$/i, async (msg) => {
    try {
      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ Register with /register before creating a Shill Link.");

      if (!isCommunityChat(msg)) {
        const links = await listMemberLinks(msg.from.id);
        if (!links.length) {
          return send(
            msg.chat.id,
            "🔗 You do not have a Shill Link yet.\n\nRun /shilllink inside a referral-enabled CryptoWorldz group."
          );
        }
        const rows = links.map((link) => {
          const title = link.target ? link.target.title : `Chat ${link.chat_id}`;
          return `🔗 ${title}\n${link.invite_link}\n👥 ${link.joins_recorded} joins • ✅ ${link.qualified_joins} qualified`;
        });
        return send(msg.chat.id, `🔗 Your CryptoWorldz Shill Links\n\n${rows.join("\n\n")}`);
      }

      const target = await getReferralTarget(msg.chat.id);
      if (!target || !target.enabled) {
        return send(
          msg.chat.id,
          "🚧 Referral Links are not enabled in this group yet.\n\nThe Owner can activate them here with /referralon."
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("member_referral_links")
        .select("invite_link,joins_recorded,qualified_joins")
        .eq("telegram_id", Number(msg.from.id))
        .eq("chat_id", Number(msg.chat.id))
        .eq("status", "active")
        .maybeSingle();
      if (existingError) throw existingError;

      let link = existing;
      if (!link) {
        let invite;
        try {
          invite = await bot.createChatInviteLink(msg.chat.id, {
            name: safeInviteName(msg.from.id)
          });
        } catch (error) {
          console.error("Create referral invite link failed", {
            name: error && error.name ? error.name : "Error"
          });
          return send(
            msg.chat.id,
            "❌ Zed needs Telegram Admin permission to invite users before unique Shill Links can be created."
          );
        }

        const { data, error } = await supabase
          .from("member_referral_links")
          .insert({
            telegram_id: Number(msg.from.id),
            chat_id: Number(msg.chat.id),
            invite_link: invite.invite_link,
            invite_name: safeInviteName(msg.from.id),
            status: "active"
          })
          .select("invite_link,joins_recorded,qualified_joins")
          .single();
        if (error) throw error;
        link = data;
      }

      const status = await getBudgetStatus();
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link.invite_link)}&text=${encodeURIComponent(
        `Join ${target.title} through my official CryptoWorldz Legend Link 💜`
      )}`;

      return send(
        msg.chat.id,
        `🔗 Your Unique CryptoWorldz Shill Link

📍 ${target.title}
${link.invite_link}

👥 Recorded joins: ${link.joins_recorded}
✅ Qualified referrals: ${link.qualified_joins}

🏆 ${status.referral_inviter_points} LP is awarded after a genuinely new member registers with Zed and remains joined for ${status.referral_retention_days} days.
🎁 The new Legend receives ${status.referral_newcomer_points} LP.

No points are awarded for clicks alone. Self-referrals, bots, existing members, duplicates and leave/rejoin attempts do not qualify.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📣 Share My Link", url: shareUrl }],
              [{ text: "🏆 My Referral Progress", callback_data: "zed_referral_stats" }]
            ]
          }
        }
      );
    } catch (error) {
      console.error("Shill link command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't create or load your Shill Link.");
    }
  });

  bot.onText(/^\/referrals(?:@\w+)?$/i, async (msg) => {
    try {
      const [stats, status] = await Promise.all([
        referralStats(msg.from.id),
        getBudgetStatus()
      ]);
      return send(
        msg.chat.id,
        `🔗 CryptoWorldz Referral Progress

🔗 Active Shill Links: ${stats.links.length}
👥 Recorded Joins: ${stats.joins}
✅ Qualified: ${stats.qualified}
⏳ Pending: ${stats.pending}
🚫 Rejected/Ineligible: ${stats.rejected}
💜 Referral Points Earned: ${stats.points} LP

Current reward: ${status.referral_inviter_points} LP per qualified referral.
Qualification: registered with Zed and still joined after ${status.referral_retention_days} days.
Weekly safety cap: ${status.inviter_weekly_qualified_cap} qualified referrals per inviter.

Use /shilllink inside an eligible group to get your unique link.`
      );
    } catch (error) {
      console.error("Referral stats command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't load your referral progress.");
    }
  });

  bot.onText(/^\/rewardplan(?:@\w+)?$/i, async (msg) => {
    try {
      const status = await getBudgetStatus();
      return send(msg.chat.id, buildRewardPlan(status, { ownerView: ownerAllowed(msg) }));
    } catch (error) {
      console.error("Reward plan command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't load the weekly reward plan.");
    }
  });

  bot.onText(/^\/rewardbudget(?:@\w+)?(?:\s+([0-9]+(?:\.[0-9]{1,2})?|off))?$/i, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const value = String((match && match[1]) || "").trim().toLowerCase();
    try {
      if (!value) {
        const status = await getBudgetStatus();
        return send(
          msg.chat.id,
          `${buildRewardPlan(status, { ownerView: true })}

Set the planning amount with:
/rewardbudget 50

Use /rewardbudget off to return to the safe 1,000 LP pilot cap.`
        );
      }

      const cents = value === "off" ? 0 : Math.round(Number(value) * 100);
      if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1000000) {
        return send(msg.chat.id, "❌ Use an amount from AUD $1 to AUD $10,000, or /rewardbudget off.");
      }

      const { error } = await supabase
        .from("reward_budget_settings")
        .update({
          weekly_budget_cents: cents,
          updated_by: Number(msg.from.id),
          updated_at: new Date().toISOString()
        })
        .eq("id", "global");
      if (error) throw error;

      const status = await getBudgetStatus();
      return send(
        msg.chat.id,
        `✅ Weekly reward planning limit updated.

${value === "off" ? "Safe pilot mode restored." : `Planning amount: ${formatAud(cents)}`}
Effective weekly cap: ${status.effective_weekly_points_cap} LP
Safety reserve remains protected.

This does not transfer money from the Kitty and does not promise automatic cash redemption.`
      );
    } catch (error) {
      console.error("Reward budget command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't update the weekly reward plan.");
    }
  });

  bot.onText(/^\/referralrules(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const parsed = parseReferralRules(match && match[1]);
    if (!parsed.ok) {
      return send(
        msg.chat.id,
        "❌ Use: /referralrules inviterLP | newcomerLP | retentionDays | weeklyCap\nExample: /referralrules 20 | 5 | 7 | 5"
      );
    }
    try {
      const { error } = await supabase
        .from("reward_budget_settings")
        .update({
          referral_inviter_points: parsed.inviterPoints,
          referral_newcomer_points: parsed.newcomerPoints,
          referral_retention_days: parsed.retentionDays,
          inviter_weekly_qualified_cap: parsed.weeklyCap,
          updated_by: Number(msg.from.id),
          updated_at: new Date().toISOString()
        })
        .eq("id", "global");
      if (error) throw error;
      return send(
        msg.chat.id,
        `✅ Referral rules updated.

🏆 Inviter: ${parsed.inviterPoints} LP
🎁 New Legend: ${parsed.newcomerPoints} LP
🛡 Retention: ${parsed.retentionDays} days
📊 Weekly inviter cap: ${parsed.weeklyCap}`
      );
    } catch (error) {
      console.error("Referral rules command failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't update the referral rules.");
    }
  });

  bot.onText(/^\/referralon(?:@\w+)?$/i, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    if (!isCommunityChat(msg)) {
      return send(msg.chat.id, "❌ Run /referralon inside the Telegram group or channel being enabled.");
    }
    try {
      const chat = await bot.getChat(msg.chat.id).catch(() => msg.chat);
      const { data: destination, error: destinationError } = await supabase
        .from("community_telegram_destinations")
        .select("project_slug")
        .eq("chat_id", Number(msg.chat.id))
        .order("thread_id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (destinationError) throw destinationError;

      const { error } = await supabase
        .from("community_referral_targets")
        .upsert({
          chat_id: Number(msg.chat.id),
          project_slug: destination ? destination.project_slug : null,
          title: chat.title || chat.username || "CryptoWorldz Community",
          enabled: true,
          created_by: Number(msg.from.id),
          updated_at: new Date().toISOString()
        }, { onConflict: "chat_id" });
      if (error) throw error;

      return send(
        msg.chat.id,
        "✅ Unique CryptoWorldz Shill Links are enabled here.\n\nLegends can now use /shilllink."
      );
    } catch (error) {
      console.error("Referral target enable failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't enable referral links in this chat.");
    }
  });

  bot.onText(/^\/referraloff(?:@\w+)?$/i, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    if (!isCommunityChat(msg)) {
      return send(msg.chat.id, "❌ Run /referraloff inside the Telegram group or channel being disabled.");
    }
    try {
      const { error } = await supabase
        .from("community_referral_targets")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("chat_id", Number(msg.chat.id));
      if (error) throw error;
      return send(msg.chat.id, "✅ New Shill Links are disabled in this chat.");
    } catch (error) {
      console.error("Referral target disable failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't disable referral links in this chat.");
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query || query.data !== "zed_referral_stats" || !query.from || !query.message) return;
    try {
      await bot.answerCallbackQuery(query.id);
      const stats = await referralStats(query.from.id);
      await send(
        query.message.chat.id,
        `🏆 Your Referral Progress

👥 Recorded: ${stats.joins}
✅ Qualified: ${stats.qualified}
⏳ Pending: ${stats.pending}
💜 Earned: ${stats.points} LP`
      );
    } catch (error) {
      console.error("Referral callback failed", {
        name: error && error.name ? error.name : "Error"
      });
    }
  });

  bot.on("chat_member", async (update) => {
    if (!isJoinTransition(update)) return;
    const user = update.new_chat_member && update.new_chat_member.user;
    const inviteLink = update.invite_link && update.invite_link.invite_link;
    if (!user || user.is_bot || !inviteLink) return;

    try {
      const { data, error } = await supabase.rpc("record_referral_join", {
        p_invite_link: inviteLink,
        p_referred_telegram_id: Number(user.id),
        p_referred_username: user.username || "",
        p_referred_first_name: user.first_name || "",
        p_joined_at: new Date(Number(update.date || Math.floor(Date.now() / 1000)) * 1000).toISOString()
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result && result.outcome === "recorded") {
        await send(
          Number(result.inviter_telegram_id),
          `🔗 A new member joined through your CryptoWorldz Shill Link.

Their referral is pending. They must register with Zed and remain joined until the qualification date before points are awarded.`
        ).catch(() => undefined);
      }
    } catch (error) {
      console.error("Referral join tracking failed", {
        name: error && error.name ? error.name : "Error"
      });
    }
  });

  let workerBusy = false;
  const workerTimer = setInterval(async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      const { data: referrals, error } = await supabase
        .from("member_referrals")
        .select("id,chat_id,referred_telegram_id,inviter_telegram_id,expires_at")
        .eq("status", "pending")
        .lte("qualifies_at", new Date().toISOString())
        .order("qualifies_at", { ascending: true })
        .limit(50);
      if (error) throw error;

      for (const referral of referrals || []) {
        let member;
        try {
          member = await bot.getChatMember(referral.chat_id, referral.referred_telegram_id);
        } catch {
          continue;
        }

        if (!isActiveMember(member)) {
          await supabase
            .from("member_referrals")
            .update({
              status: "rejected",
              rejection_reason: "left_before_qualification",
              updated_at: new Date().toISOString()
            })
            .eq("id", referral.id)
            .eq("status", "pending");
          continue;
        }

        const { data: qualified, error: qualifyError } = await supabase.rpc("qualify_referral", {
          p_referral_id: referral.id
        });
        if (qualifyError) throw qualifyError;
        const result = Array.isArray(qualified) ? qualified[0] : qualified;

        if (result && result.outcome === "qualified") {
          await Promise.allSettled([
            send(
              Number(result.inviter_telegram_id),
              `🏆 Referral Qualified!

✅ ${result.inviter_points} Legend Points awarded for bringing a genuine new member into CryptoWorldz.`
            ),
            send(
              Number(result.referred_telegram_id),
              `🎁 Welcome Reward!

✅ ${result.newcomer_points} Legend Points awarded for joining, registering and remaining active in CryptoWorldz.`
            )
          ]);
        }
      }
    } catch (error) {
      console.error("Referral qualification worker failed", {
        name: error && error.name ? error.name : "Error"
      });
    } finally {
      workerBusy = false;
    }
  }, 15 * 60 * 1000);

  if (typeof workerTimer.unref === "function") workerTimer.unref();

  return {
    stop() {
      clearInterval(workerTimer);
    }
  };
}

module.exports = {
  REFERRAL_COMMANDS,
  buildRewardPlan,
  isActiveMember,
  isJoinTransition,
  parseReferralRules,
  registerReferralTelegramHandlers,
  safeInviteName
};
