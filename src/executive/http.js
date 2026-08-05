const { createRequestLimiter, validateTelegramInitData } = require("../miniapp-auth");
const {
  EXECUTIVE_PERMISSIONS,
  SCOPED_ADMIN_ROLES,
  cleanText,
  normalizeRole,
  parseTelegramId
} = require("./core");

function registerExecutiveRoutes({ app, repository, supabase, config }) {
  const allowRequest = createRequestLimiter({ maxEvents: 90, intervalMs: 60000 });

  const authenticate = (req, res, next) => {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowRequest(`${result.user.id}:${req.ip}`)) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }
    req.telegramUser = result.user;
    return next();
  };

  async function getExecutive(telegramId) {
    const { data, error } = await supabase
      .from("executive_admins")
      .select("telegram_id,display_name,executive_title,responsibility,status,appointed_by,created_at,updated_at")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error && error.code !== "42P01") throw error;
    return data || null;
  }

  async function authorityFor(telegramId) {
    const owner = String(telegramId) === String(config.ownerTelegramId);
    const executive = owner ? null : await getExecutive(telegramId);
    const access = await repository.getAdminAccess(
      telegramId,
      config.adminTelegramIds,
      config.ownerTelegramId
    );
    return {
      owner,
      executive: Boolean(executive && executive.status === "active"),
      executiveRecord: executive,
      access
    };
  }

  async function requireExecutive(req, res, next) {
    try {
      const authority = await authorityFor(req.telegramUser.id);
      if (!authority.owner && !authority.executive) {
        return res.status(403).json({ ok: false, error: "executive_required" });
      }
      if (!authority.owner && !authority.access.permissions.includes("admin.manage_scoped")) {
        return res.status(403).json({ ok: false, error: "admin_management_not_enabled" });
      }
      req.executiveAuthority = authority;
      return next();
    } catch (error) {
      console.error("Executive access check failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "executive_access_failed" });
    }
  }

  async function listExecutiveStructure() {
    const [adminsResult, executivesResult] = await Promise.all([
      supabase
        .from("bot_admins")
        .select("telegram_id,role,status,added_by,created_at,updated_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("executive_admins")
        .select("telegram_id,display_name,executive_title,responsibility,status,appointed_by,created_at,updated_at")
        .order("created_at", { ascending: true })
    ]);
    if (adminsResult.error) throw adminsResult.error;
    if (executivesResult.error && executivesResult.error.code !== "42P01") throw executivesResult.error;
    const executiveMap = new Map(
      (executivesResult.data || []).map((item) => [String(item.telegram_id), item])
    );
    return (adminsResult.data || []).map((admin) => ({
      ...admin,
      executive: executiveMap.get(String(admin.telegram_id)) || null,
      permanent_owner: String(admin.telegram_id) === String(config.ownerTelegramId)
    }));
  }

  app.get("/api/mini/executive/status", authenticate, requireExecutive, async (req, res) => {
    try {
      return res.json({
        ok: true,
        authority: {
          owner: req.executiveAuthority.owner,
          executive: req.executiveAuthority.executive,
          profile: req.executiveAuthority.executiveRecord,
          role: req.executiveAuthority.access.role,
          permissions: req.executiveAuthority.access.permissions
        },
        owner_telegram_id: String(config.ownerTelegramId || ""),
        allowed_scoped_roles: SCOPED_ADMIN_ROLES,
        team: await listExecutiveStructure()
      });
    } catch (error) {
      console.error("Executive status failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "executive_status_failed" });
    }
  });

  app.post("/api/mini/executive/scoped-admin", authenticate, requireExecutive, async (req, res) => {
    const telegramId = parseTelegramId(req.body?.telegram_id);
    const role = normalizeRole(req.body?.role);
    const status = String(req.body?.status || "active").trim().toLowerCase();
    if (!telegramId || !role || !["active", "disabled"].includes(status)) {
      return res.status(400).json({ ok: false, error: "invalid_scoped_admin" });
    }
    if (String(telegramId) === String(config.ownerTelegramId)) {
      return res.status(409).json({ ok: false, error: "owner_is_immutable" });
    }

    try {
      const targetExecutive = await getExecutive(telegramId);
      if (targetExecutive && targetExecutive.status === "active") {
        return res.status(409).json({ ok: false, error: "executive_owner_action_required" });
      }

      const result = status === "active"
        ? await repository.setAdminRole(telegramId, role, req.telegramUser.id)
        : await repository.setAdmin(telegramId, "disabled", req.telegramUser.id);

      await repository.recordHistory({
        missionId: null,
        action: status === "active" ? "scoped_admin_assigned" : "scoped_admin_disabled",
        actorTelegramId: req.telegramUser.id,
        details: { telegram_id: telegramId, role, delegated_by_executive: true }
      });
      return res.json({ ok: true, admin: result });
    } catch (error) {
      console.error("Scoped admin update failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "scoped_admin_update_failed" });
    }
  });

  app.post("/api/mini/executive/appoint", authenticate, requireExecutive, async (req, res) => {
    if (!req.executiveAuthority.owner) {
      return res.status(403).json({ ok: false, error: "owner_required" });
    }
    const telegramId = parseTelegramId(req.body?.telegram_id);
    const displayName = cleanText(req.body?.display_name, 60);
    const responsibility = cleanText(req.body?.responsibility, 100);
    if (!telegramId || !displayName || !responsibility) {
      return res.status(400).json({ ok: false, error: "invalid_executive" });
    }
    if (String(telegramId) === String(config.ownerTelegramId)) {
      return res.status(409).json({ ok: false, error: "owner_is_already_permanent" });
    }

    try {
      const { data, error } = await supabase
        .from("executive_admins")
        .upsert({
          telegram_id: telegramId,
          display_name: displayName,
          executive_title: "Executive Leader",
          responsibility,
          status: "active",
          appointed_by: req.telegramUser.id,
          updated_at: new Date().toISOString()
        }, { onConflict: "telegram_id" })
        .select("*")
        .single();
      if (error) throw error;

      await repository.setAdminRole(telegramId, "admin", req.telegramUser.id);
      for (const permission of EXECUTIVE_PERMISSIONS) {
        await repository.setAdminPermission(telegramId, permission, true, req.telegramUser.id);
      }
      await repository.recordHistory({
        missionId: null,
        action: "executive_admin_appointed",
        actorTelegramId: req.telegramUser.id,
        details: { telegram_id: telegramId, display_name: displayName, responsibility }
      });
      return res.json({ ok: true, executive: data });
    } catch (error) {
      console.error("Executive appointment failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "executive_appointment_failed" });
    }
  });

  app.post("/api/mini/executive/remove", authenticate, requireExecutive, async (req, res) => {
    if (!req.executiveAuthority.owner) {
      return res.status(403).json({ ok: false, error: "owner_required" });
    }
    const telegramId = parseTelegramId(req.body?.telegram_id);
    if (!telegramId) return res.status(400).json({ ok: false, error: "invalid_telegram_id" });
    if (String(telegramId) === String(config.ownerTelegramId)) {
      return res.status(409).json({ ok: false, error: "owner_is_immutable" });
    }

    try {
      const { error } = await supabase
        .from("executive_admins")
        .update({ status: "disabled", updated_at: new Date().toISOString() })
        .eq("telegram_id", telegramId);
      if (error) throw error;
      await repository.setAdmin(telegramId, "disabled", req.telegramUser.id);
      await repository.recordHistory({
        missionId: null,
        action: "executive_admin_disabled",
        actorTelegramId: req.telegramUser.id,
        details: { telegram_id: telegramId }
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error("Executive removal failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "executive_removal_failed" });
    }
  });
}

module.exports = { registerExecutiveRoutes };
