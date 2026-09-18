const { SCOPED_ADMIN_ROLES, cleanText, normalizeRole, parseTelegramId } = require("./core");

const EXECUTIVE_COMMANDS = [
  { command: "executives", description: "View the CryptoWorldz executive structure" },
  { command: "addscopedadmin", description: "Assign a scoped Admin role" },
  { command: "disableadmin", description: "Disable a scoped Admin" },
  { command: "appointexecutive", description: "Owner: appoint an Executive Leader" }
];

function registerExecutiveTelegramHandlers({ bot, repository, supabase, config }) {
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  async function getExecutive(telegramId) {
    const { data, error } = await supabase
      .from("executive_admins")
      .select("telegram_id,display_name,executive_title,responsibility,status")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error && error.code !== "42P01") throw error;
    return data || null;
  }

  async function executiveAllowed(msg) {
    if (ownerAllowed(msg)) return true;
    const executive = await getExecutive(msg.from?.id);
    if (!executive || executive.status !== "active") return false;
    return repository.hasPermission(
      msg.from.id,
      "admin.manage_scoped",
      config.adminTelegramIds,
      config.ownerTelegramId
    );
  }

  bot.onText(/^\/executives(?:@\w+)?$/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from("executive_admins")
        .select("telegram_id,display_name,executive_title,responsibility,status")
        .eq("status", "active")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = [
        "👑 JayJayTeamDev — Permanent Owner",
        "Every permission • final override • cannot be removed or downgraded"
      ];
      for (const executive of data || []) {
        rows.push(
          `🛡️ ${executive.display_name} — ${executive.executive_title}`,
          `${executive.responsibility} • full operational administration • delegated scoped-Admin authority`
        );
      }
      rows.push(
        "",
        "Scoped roles:",
        SCOPED_ADMIN_ROLES.join(" • "),
        "",
        "Only the permanent owner can appoint or remove Executive Leaders."
      );
      return send(msg, `🛡️ CryptoWorldz Executive Structure\n\n${rows.join("\n")}`);
    } catch (error) {
      console.error("Executives command failed", { name: error?.name || "Error" });
      return send(msg, "❌ I couldn't load the Executive Team.");
    }
  });

  bot.onText(/^\/addscopedadmin(?:@\w+)?(?:\s+(\d+)\s+([a-z_]+))?$/, async (msg, match) => {
    try {
      if (!(await executiveAllowed(msg))) return send(msg, "⛔ Executive Leader access required.");
      const telegramId = parseTelegramId(match?.[1]);
      const role = normalizeRole(match?.[2]);
      if (!telegramId || !role) {
        return send(msg, `❌ Use: /addscopedadmin telegram_id role\nRoles: ${SCOPED_ADMIN_ROLES.join(", ")}`);
      }
      if (String(telegramId) === String(config.ownerTelegramId)) {
        return send(msg, "⛔ The permanent owner cannot be changed.");
      }
      const targetExecutive = await getExecutive(telegramId);
      if (targetExecutive && targetExecutive.status === "active") {
        return send(msg, "⛔ Executive Leader changes require the permanent owner.");
      }
      await repository.setAdminRole(telegramId, role, msg.from.id);
      await repository.recordHistory({
        missionId: null,
        action: "scoped_admin_assigned",
        actorTelegramId: msg.from.id,
        details: { telegram_id: telegramId, role, delegated_by_executive: true }
      });
      return send(msg, `✅ Scoped Admin assigned.\n\nTelegram ID: ${telegramId}\nRole: ${role}`);
    } catch (error) {
      console.error("Add scoped admin failed", { name: error?.name || "Error" });
      return send(msg, "❌ I couldn't assign that scoped Admin role.");
    }
  });

  bot.onText(/^\/disableadmin(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    try {
      if (!(await executiveAllowed(msg))) return send(msg, "⛔ Executive Leader access required.");
      const telegramId = parseTelegramId(match?.[1]);
      if (!telegramId) return send(msg, "❌ Use: /disableadmin telegram_id");
      if (String(telegramId) === String(config.ownerTelegramId)) {
        return send(msg, "⛔ The permanent owner cannot be disabled.");
      }
      const targetExecutive = await getExecutive(telegramId);
      if (targetExecutive && targetExecutive.status === "active") {
        return send(msg, "⛔ Executive Leader changes require the permanent owner.");
      }
      await repository.setAdmin(telegramId, "disabled", msg.from.id);
      await repository.recordHistory({
        missionId: null,
        action: "scoped_admin_disabled",
        actorTelegramId: msg.from.id,
        details: { telegram_id: telegramId, delegated_by_executive: true }
      });
      return send(msg, `✅ Scoped Admin disabled: ${telegramId}`);
    } catch (error) {
      console.error("Disable scoped admin failed", { name: error?.name || "Error" });
      return send(msg, "❌ I couldn't disable that scoped Admin.");
    }
  });

  bot.onText(/^\/appointexecutive(?:@\w+)?(?:\s+(\d+)\s+([^|]+)\|\s*(.+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ Permanent Owner access required.");
    const telegramId = parseTelegramId(match?.[1]);
    const displayName = cleanText(match?.[2], 60);
    const responsibility = cleanText(match?.[3], 100);
    if (!telegramId || !displayName || !responsibility) {
      return send(msg, "❌ Use: /appointexecutive telegram_id Name | Responsibility\nExample: /appointexecutive 123456789 Remedy | Treasury Lead");
    }
    if (String(telegramId) === String(config.ownerTelegramId)) {
      return send(msg, "⛔ You are already the permanent owner.");
    }

    try {
      const { EXECUTIVE_PERMISSIONS } = require("./core");
      const { error } = await supabase
        .from("executive_admins")
        .upsert({
          telegram_id: telegramId,
          display_name: displayName,
          executive_title: "Executive Leader",
          responsibility,
          status: "active",
          appointed_by: msg.from.id,
          updated_at: new Date().toISOString()
        }, { onConflict: "telegram_id" });
      if (error) throw error;
      await repository.setAdminRole(telegramId, "admin", msg.from.id);
      for (const permission of EXECUTIVE_PERMISSIONS) {
        await repository.setAdminPermission(telegramId, permission, true, msg.from.id);
      }
      await repository.recordHistory({
        missionId: null,
        action: "executive_admin_appointed",
        actorTelegramId: msg.from.id,
        details: { telegram_id: telegramId, display_name: displayName, responsibility }
      });
      return send(msg, `✅ Executive Leader appointed.\n\n${displayName}\n${responsibility}\nTelegram ID: ${telegramId}`);
    } catch (error) {
      console.error("Appoint executive failed", { name: error?.name || "Error" });
      return send(msg, "❌ I couldn't appoint that Executive Leader.");
    }
  });
}

module.exports = { EXECUTIVE_COMMANDS, registerExecutiveTelegramHandlers };
