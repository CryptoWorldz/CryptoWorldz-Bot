const { getRank, shortenWallet } = require("./core");

const PROFILE_PATTERN = /^\/profile(?:@\w+)?$/;

const ROLE_LABELS = Object.freeze({
  admin: "Admin",
  moderator: "Moderator",
  recap_manager: "Recap Manager",
  partner_manager: "Partner Manager",
  treasury_manager: "Treasury Manager",
  grace_manager: "Grace Controller"
});

async function resolveTeamRole({ telegramId, repository, config, supabase }) {
  const access = await repository.getAdminAccess(
    telegramId,
    config.adminTelegramIds,
    config.ownerTelegramId
  );
  if (!access.authorized) return null;
  if (access.role === "owner") {
    return { title: "Permanent Owner", responsibility: "Final authority and protected override" };
  }

  if (access.permissions.includes("admin.manage_scoped") && supabase) {
    const { data, error } = await supabase
      .from("executive_admins")
      .select("executive_title,responsibility,status")
      .eq("telegram_id", telegramId)
      .eq("status", "active")
      .maybeSingle();
    if (error && error.code !== "42P01") throw error;
    if (data) {
      return {
        title: data.executive_title || "Executive Leader",
        responsibility: data.responsibility || "Executive Operations"
      };
    }
    return { title: "Executive Leader", responsibility: "Executive Operations" };
  }

  return {
    title: ROLE_LABELS[access.role] || String(access.role || "Admin").replaceAll("_", " "),
    responsibility: access.role === "grace_manager" ? "Social Communications & Engagement" : null
  };
}

function registerRoleProfileHandler({ bot, repository, config, supabase }) {
  bot.removeTextListener(PROFILE_PATTERN);
  bot.onText(PROFILE_PATTERN, async (msg) => {
    try {
      const [profile, teamRole] = await Promise.all([
        repository.getMemberDetails(msg.from.id),
        resolveTeamRole({ telegramId: msg.from.id, repository, config, supabase })
      ]);
      if (!profile) return bot.sendMessage(msg.chat.id, "❌ You are not registered. Use /register first.");

      const { user, rewardsEarned } = profile;
      const points = Number(user.points) || 0;
      const completed = Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0);
      const displayName = user.username ? `@${user.username}` : user.first_name || "Legend";
      const roleLines = teamRole
        ? `\n🛡 Team Role: ${teamRole.title}${teamRole.responsibility ? `\n🎯 Responsibility: ${teamRole.responsibility}` : ""}`
        : "";

      return bot.sendMessage(
        msg.chat.id,
        `🏆 CryptoWorldz Legend Profile\n\n👤 Username: ${displayName}\n🆔 Telegram ID: ${user.telegram_id}${roleLines}\n🎖 Legend Rank: ${getRank(points)}\n⭐ Legend Points: ${points}\n🚀 Raaiiidds Completed: ${completed}\n📥 Pending Submissions: ${profile.pending}\n👛 Wallet Connected: ${user.wallet ? `Yes ✅\n${shortenWallet(user.wallet)}` : "No"}\n🎁 Rewards Earned: ${rewardsEarned} Legend Points\n📅 Member Since: ${user.registered_at || user.created_at}`
      );
    } catch (error) {
      console.error("Role profile command failed", { name: error?.name || "Error" });
      return bot.sendMessage(msg.chat.id, "❌ I couldn't load your profile.");
    }
  });
}

module.exports = { PROFILE_PATTERN, ROLE_LABELS, registerRoleProfileHandler, resolveTeamRole };
