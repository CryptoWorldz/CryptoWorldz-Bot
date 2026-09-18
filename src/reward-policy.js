const { parseSimpleRaid } = require("./core");

const RAID_CREATE_PATTERN = /^\/raid(?:@\w+)?\s+([\s\S]+)$/;
const REWARD_PLAN_PATTERN = /^\/rewardplan(?:@\w+)?$/i;
const REWARD_BUDGET_PATTERN = /^\/rewardbudget(?:@\w+)?(?:\s+([0-9]+(?:\.[0-9]{1,2})?|off))?$/i;
const SPECIAL_REWARD_PATTERN = /^\/specialreward(?:@\w+)?(?:\s+(?:(20|50|100)\s*\|\s*)?(\d+)\s*\|\s*([\s\S]+))?$/i;

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
  const specialCap = Number(status.special_cap) || 0;
  const reserveCap = Number(status.reserve_cap) || 0;
  const activeCap = Number(status.active_weekly_points_cap) || missionCap + referralCap + specialCap;
  const hardCap = Number(status.effective_weekly_points_cap) || activeCap + reserveCap;
  const missionUsed = Number(status.mission_used) || 0;
  const referralUsed = Number(status.referral_used) || 0;
  const specialUsed = Number(status.special_used) || 0;
  const reserveUsed = Number(status.reserve_used) || 0;
  const activeUsed = Number(status.active_used) || missionUsed + referralUsed + specialUsed;
  const totalUsed = Number(status.total_used) || activeUsed + reserveUsed;
  const referralTotal =
    (Number(status.referral_inviter_points) || 0) +
    (Number(status.referral_newcomer_points) || 0);

  return [
    "💜 CryptoWorldz Weekly Reward System — Model-348 V8",
    "",
    `💰 Owner planning budget: ${formatAud(status.weekly_budget_cents)}`,
    `📊 First-week active pool: ${activeCap} LP`,
    `🛡 Protected owner reserve: ${reserveCap} LP — ${status.reserve_enabled ? "OPEN" : "LOCKED"}`,
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
    `• Newcomer Shill Boost: ${status.shill_boost_points} LP after their first verified Raaiiidd`,
    "",
    "🚀 Raaiiidd Pool",
    `• Weekly pool: ${missionUsed}/${missionCap} LP`,
    "• Every verified Raaiiidd: 20 LP",
    `• Remaining capacity: ${remaining(missionCap, missionUsed)} LP`,
    "",
    "🎁 Special Request Pool",
    `• Weekly pool: ${specialUsed}/${specialCap} LP`,
    `• 20 LP tier — maximum ${status.special_tier_20_weekly_user_cap} per Legend weekly`,
    `• 50 LP tier — maximum ${status.special_tier_50_weekly_user_cap} per Legend weekly`,
    `• 100 LP tier — maximum ${status.special_tier_100_weekly_user_cap} per Legend weekly`,
    "• Owner approval and a clear verified reason are required",
    "",
    "🌟 Unique Legend",
    `• ${status.unique_legend_points} LP owner-reviewed leadership and community-impact award`,
    `• Maximum once per ${status.unique_legend_cooldown_days} days`,
    "• Uses the protected reserve only after the owner deliberately unlocks it",
    "",
    `Active-pool usage: ${activeUsed}/${activeCap} LP`,
    "Token purchases, holdings and donation amounts do not buy Legend Points.",
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
    bot.removeTextListener(REWARD_BUDGET_PATTERN);
    bot.removeTextListener(SPECIAL_REWARD_PATTERN);
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

  bot.onText(REWARD_BUDGET_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");

    const supplied = String((match && match[1]) || "").trim().toLowerCase();
    if (!supplied) {
      try {
        const status = await getBudgetStatus();
        return send(
          msg.chat.id,
          `${buildLaunchRewardPlan(status)}\n\nThe owner planning budget is protected at a maximum of AUD $100.00. The wallet funding ledger may record up to AUD $200, but that extra capacity is not a recommendation to spend it.`
        );
      } catch {
        return send(msg.chat.id, "❌ Zed couldn't load the weekly reward budget.");
      }
    }

    if (supplied === "off") {
      return send(msg.chat.id, "🛡 The reward plan cannot be switched off accidentally. Set a smaller amount from AUD $1.00 to AUD $100.00 instead.");
    }

    const cents = Math.round(Number(supplied) * 100);
    if (!Number.isSafeInteger(cents) || cents < 100 || cents > 10000) {
      return send(msg.chat.id, "❌ Set a weekly planning budget from AUD $1.00 to the protected maximum of AUD $100.00.");
    }

    try {
      const { error } = await supabase
        .from("reward_budget_settings")
        .update({
          weekly_budget_cents: cents,
          updated_by: Number(msg.from.id),
          updated_at: new Date().toISOString()
        })
        .eq("id", "global");
      if (error) throw error;
      return send(
        msg.chat.id,
        `✅ Weekly planning budget updated to ${formatAud(cents)}.\n\nProtected point pools remain fixed:\n🔗 Referrals: 1,000 LP\n🚀 Raaiiidds: 1,500 LP\n🎁 Special Requests: 1,000 LP\n📊 First-week active cap: 3,500 LP\n🛡 Locked reserve: 1,500 LP\n🚨 Hard ceiling: 5,000 LP`
      );
    } catch (error) {
      console.error("Protected reward budget update failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't update the weekly reward budget.");
    }
  });

  bot.onText(SPECIAL_REWARD_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");

    const points = Number((match && match[1]) || 50);
    const telegramId = Number(match && match[2]);
    const reason = String((match && match[3]) || "").trim();
    if (![20, 50, 100].includes(points) || !Number.isSafeInteger(telegramId) || telegramId <= 0 || reason.length < 3) {
      return send(
        msg.chat.id,
        "❌ Use: /specialreward 20|50|100 | telegram_id | completed request\nExample: /specialreward 50 | 123456789 | Completed verified launch support request\n\nLegacy format /specialreward telegram_id | reason still defaults to 50 LP."
      );
    }

    try {
      const { data, error } = await supabase.rpc("award_special_tier", {
        p_telegram_id: telegramId,
        p_points: points,
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
      if (result.outcome === "invalid_tier") {
        return send(msg.chat.id, "❌ Special rewards must use the 20, 50 or 100 LP tier.");
      }
      if (result.outcome === "user_tier_cap_reached") {
        return send(msg.chat.id, `🛑 That Legend has reached their weekly ${points} LP tier limit.`);
      }
      if (result.outcome === "budget_exhausted") {
        return send(msg.chat.id, "🛑 The 1,000 LP Special Request pool or 3,500 LP active cap is exhausted for this week.");
      }
      if (result.outcome !== "awarded") {
        return send(msg.chat.id, "❌ The Special Request reward could not be completed.");
      }

      await Promise.allSettled([
        send(
          telegramId,
          `🎁 CryptoWorldz Special Request Completed!\n\n⭐ ${result.awarded_points} Legend Points awarded.\n📋 ${reason}\n🏆 New total: ${result.total_points} LP`
        ),
        send(
          msg.chat.id,
          `✅ Special Request reward approved.\n\n👤 ${telegramId}\n⭐ +${result.awarded_points} LP\n📋 ${reason}\n📊 Weekly tier use: ${result.weekly_user_count}\n🏆 New total: ${result.total_points} LP`
        )
      ]);
      return undefined;
    } catch (error) {
      console.error("Special Request reward failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't award that Special Request.");
    }
  });
}

module.exports = {
  RAID_CREATE_PATTERN,
  REWARD_BUDGET_PATTERN,
  REWARD_PLAN_PATTERN,
  SPECIAL_REWARD_PATTERN,
  buildLaunchRewardPlan,
  parseStandardRaid,
  registerRewardPolicyHandlers
};
