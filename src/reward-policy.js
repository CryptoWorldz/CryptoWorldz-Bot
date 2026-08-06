const { parseSimpleRaid } = require("./core");

const RAID_CREATE_PATTERN = /^\/raid(?:@\w+)?\s+([\s\S]+)$/;
const REWARD_PLAN_PATTERN = /^\/rewardplan(?:@\w+)?$/i;
const SPECIAL_REWARD_PATTERN = /^\/specialreward(?:@\w+)?(?:\s+(\d+)\s*\|\s*([\s\S]+))?$/i;

function formatAud(cents) {
  return `AUD $${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function remaining(cap, used) {
  return Math.max(0, (Number(cap) || 0) - (Number(used) || 0));
}

function parseStandardRaid(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (!parts[0] || parts.length > 3) return { ok: false, error: "invalid_format" };

  let duration = "";
  if (parts[2]) duration = parts[2];
  else if (parts[1] && /^\d+(?:h|d)$/i.test(parts[1])) duration = parts[1];

  const normalized = duration
    ? `${parts[0]} | 20 | ${duration}`
    : `${parts[0]} | 20`;
  return parseSimpleRaid(normalized);
}

function buildLaunchRewardPlan(status) {
  const missionCap = Number(status.mission_cap) || 0;
  const referralCap = Number(status.referral_cap) || 0;
  const bufferCap = Number(status.reserve_cap) || 0;
  const activeCap = missionCap + referralCap;
  const hardCap = Number(status.effective_weekly_points_cap) || activeCap + bufferCap;
  const missionUsed = Number(status.mission_used) || 0;
  const referralUsed = Number(status.referral_used) || 0;
  const bufferUsed = Number(status.reserve_used) || 0;
  const activeUsed = missionUsed + referralUsed;
  const totalUsed = Number(status.total_used) || activeUsed + bufferUsed;
  const referralTotal =
    (Number(status.referral_inviter_points) || 0) +
    (Number(status.referral_newcomer_points) || 0);

  return [
    "💜 CryptoWorldz Weekly Reward System",
    "",
    `💰 Maximum planning budget: ${formatAud(status.weekly_budget_cents)}`,
    `📊 Active weekly pool: ${activeCap} LP`,
    `🛡 Protected buffer: ${bufferCap} LP`,
    `🚨 Absolute hard ceiling: ${hardCap} LP`,
    `✅ Awarded this week: ${totalUsed} LP`,
    `⭐ Hard-ceiling remainder: ${remaining(hardCap, totalUsed)} LP`,
    "",
    "🔗 Referral Pool — first qualified, first served",
    `• Weekly pool: ${referralUsed}/${referralCap} LP`,
    `• Referrer: ${status.referral_inviter_points} LP`,
    `• New Legend: ${status.referral_newcomer_points} LP`,
    `• Total per qualified referral: ${referralTotal} LP`,
    `• Maximum per referrer: ${status.inviter_weekly_qualified_cap} qualified referrals each week`,
    `• Qualification: registered and still joined after ${status.referral_retention_days} days`,
    "",
    "🚀 Raaiiidd Pool",
    `• Weekly pool: ${missionUsed}/${missionCap} LP`,
    "• Every verified Raaiiidd: 20 LP",
    `• Remaining Raaiiidd capacity: ${remaining(missionCap, missionUsed)} LP`,
    "",
    "🎁 Special Offer Buffer",
    `• Weekly buffer: ${bufferUsed}/${bufferCap} LP`,
    "• Completed owner-approved request: 50 LP",
    "• Special rewards stop when the protected buffer is exhausted",
    "",
    `Active-pool usage: ${activeUsed}/${activeCap} LP`,
    "No automatic Kitty transfers or guaranteed cash redemptions are enabled."
  ].join("\n");
}

function registerRewardPolicyHandlers({ bot, repository, supabase, config }) {
  const send = (chatId, text) => bot.sendMessage(chatId, text);
  const ownerAllowed = (msg) =>
    String(msg && msg.from && msg.from.id) === String(config.ownerTelegramId);
  const permissionAllowed = (msg, permission) =>
    repository.hasPermission(
      msg.from.id,
      permission,
      config.adminTelegramIds,
      config.ownerTelegramId
    );

  async function getBudgetStatus() {
    const { data, error } = await supabase.rpc("get_reward_budget_status");
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  if (typeof bot.removeTextListener === "function") {
    bot.removeTextListener(RAID_CREATE_PATTERN);
    bot.removeTextListener(REWARD_PLAN_PATTERN);
  }

  bot.onText(RAID_CREATE_PATTERN, async (msg, match) => {
    if (!(await permissionAllowed(msg, "mission.create"))) {
      return send(msg.chat.id, "⛔ Admin access required.");
    }

    const parsed = parseStandardRaid(match && match[1]);
    if (!parsed.ok) {
      return send(msg.chat.id, "❌ Use: /raid <safe HTTPS link> | 24h\nEvery verified Raaiiidd is fixed at 20 LP.");
    }

    try {
      if (await repository.findMissionByUrl(parsed.mission.target_url)) {
        return send(msg.chat.id, "⚠️ A mission already exists for this link.");
      }
      const mission = await repository.createMission(parsed.mission, msg.from.id);
      return send(
        msg.chat.id,
        `✅ New Raaiiidd Created!\n\n🎯 ${mission.title}\n🌐 ${mission.platform}\n⭐ 20 Legend Points\n🔗 ${mission.link}\n\nMission #${mission.id} is active. Rewards stop automatically when the 1,500 LP weekly Raaiiidd pool is full.`
      );
    } catch (error) {
      console.error("Fixed reward Raaiiidd creation failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't create that Raaiiidd.");
    }
  });

  bot.onText(REWARD_PLAN_PATTERN, async (msg) => {
    try {
      return send(msg.chat.id, buildLaunchRewardPlan(await getBudgetStatus()));
    } catch (error) {
      console.error("Launch reward plan failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't load the weekly reward plan.");
    }
  });

  bot.onText(SPECIAL_REWARD_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");

    const telegramId = Number(match && match[1]);
    const reason = String((match && match[2]) || "").trim();
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0 || reason.length < 3) {
      return send(
        msg.chat.id,
        "❌ Use: /specialreward telegram_id | completed request\nExample: /specialreward 123456789 | Completed launch support request"
      );
    }

    try {
      const { data, error } = await supabase.rpc("award_special_offer", {
        p_telegram_id: telegramId,
        p_reason: reason,
        p_awarded_by: Number(msg.from.id)
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;

      if (!result || result.outcome === "user_not_registered") {
        return send(msg.chat.id, "❌ That Telegram member is not registered with Zed.");
      }
      if (result.outcome === "invalid_reason") {
        return send(msg.chat.id, "❌ Add a clear reason between 3 and 240 characters.");
      }
      if (result.outcome === "budget_exhausted") {
        return send(msg.chat.id, "🛑 The 500 LP Special Offer buffer is exhausted for this week.");
      }
      if (result.outcome !== "awarded") {
        return send(msg.chat.id, "❌ The Special Offer reward could not be completed.");
      }

      await Promise.allSettled([
        send(
          telegramId,
          `🎁 CryptoWorldz Special Offer Completed!\n\n⭐ ${result.awarded_points} Legend Points awarded.\n📋 ${reason}\n🏆 New total: ${result.total_points} LP`
        ),
        send(
          msg.chat.id,
          `✅ Special Offer reward approved.\n\n👤 ${telegramId}\n⭐ +${result.awarded_points} LP\n📋 ${reason}\n🏆 New total: ${result.total_points} LP`
        )
      ]);
      return undefined;
    } catch (error) {
      console.error("Special Offer reward failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't award that Special Offer.");
    }
  });
}

module.exports = {
  RAID_CREATE_PATTERN,
  REWARD_PLAN_PATTERN,
  SPECIAL_REWARD_PATTERN,
  buildLaunchRewardPlan,
  parseStandardRaid,
  registerRewardPolicyHandlers
};
