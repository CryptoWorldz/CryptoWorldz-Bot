const TOP_EXECUTIVES = new Set(["8029135300", "7615025841", "8604306923", "5978625584"]);

function parseAutoPostInput(raw) {
  const parts = String(raw || "").split("|").map((part) => part.trim());
  if (parts.length !== 4) {
    return { ok: false, error: "Use: /autopost ISO_TIME | account_ids | Title | Caption" };
  }
  const [timeText, accountText, title, body] = parts;
  const scheduled = new Date(timeText);
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 60000) {
    return { ok: false, error: "Use a future ISO time with timezone, e.g. 2026-08-11T09:00+10:00." };
  }
  const accountIds = [...new Set(accountText.split(/[\s,]+/).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!accountIds.length) return { ok: false, error: "At least one account ID is required." };
  if (!title || title.length > 160) return { ok: false, error: "Title must be 1-160 characters." };
  if (!body || body.length > 4000) return { ok: false, error: "Caption must be 1-4000 characters." };
  return { ok: true, value: { scheduledFor: scheduled.toISOString(), accountIds, title, body } };
}

function parseGraceAdminInput(raw) {
  const parts = String(raw || "").trim().split(/\s+/).filter(Boolean);
  const action = String(parts.shift() || "list").toLowerCase();
  if (action === "list") return { ok: true, value: { action } };
  if (!["add", "grant", "remove"].includes(action)) return { ok: false, error: "Use: /graceadmin list | add ID [accounts] | grant ID accounts | remove ID" };
  const telegramId = String(parts.shift() || "");
  if (!/^\d{5,20}$/.test(telegramId)) return { ok: false, error: "A valid Telegram numeric ID is required." };
  const accountIds = [...new Set(parts.join(" ").split(/[\s,]+/).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (action === "grant" && !accountIds.length) return { ok: false, error: "Grant requires at least one account ID." };
  return { ok: true, value: { action, telegramId, accountIds: accountIds.length ? accountIds : [1] } };
}

function registerGraceBuild2Handlers({ bot, repository, graceRepository, supabase, config }) {
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);
  const ownerId = String(config.ownerTelegramId || "");
  const allowed = (msg, permission) => repository.hasPermission(msg.from.id, permission, config.adminTelegramIds, config.ownerTelegramId);

  async function requirePermission(msg, permission) {
    if (String(msg.from?.id || "") === ownerId) return true;
    if (await allowed(msg, permission)) return true;
    await send(msg, "⛔ Grace Build 2 permission required.");
    return false;
  }

  async function authorizedAccounts(telegramId, accountIds) {
    if (String(telegramId) === ownerId) return true;
    const workspace = await graceRepository.getWorkspace();
    const { data, error } = await supabase
      .from("grace_account_permissions")
      .select("account_id,can_schedule")
      .eq("workspace_id", workspace.id)
      .eq("telegram_id", telegramId)
      .in("account_id", accountIds);
    if (error) throw error;
    const allowedIds = new Set((data || []).filter((row) => row.can_schedule).map((row) => Number(row.account_id)));
    return accountIds.every((id) => allowedIds.has(id));
  }

  bot.onText(/^\/autopost(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await requirePermission(msg, "grace.schedule"))) return;
    const parsed = parseAutoPostInput(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}`);
    try {
      if (!(await authorizedAccounts(msg.from.id, parsed.value.accountIds))) {
        return send(msg, "⛔ You are not approved to schedule one or more selected Grace accounts. Ask Stepper or JayJayTeamDev to grant that account.");
      }
      const post = await graceRepository.createDraft({
        title: parsed.value.title,
        body: parsed.value.body,
        campaign: "Grace Auto Post™",
        actorTelegramId: msg.from.id
      });
      const scheduled = await graceRepository.schedulePost({
        postId: post.id,
        accountIds: parsed.value.accountIds,
        scheduledFor: parsed.value.scheduledFor,
        actorTelegramId: msg.from.id
      });
      if (scheduled.outcome !== "scheduled") return send(msg, `❌ Grace could not schedule this Auto Post: ${scheduled.outcome}.`);
      return send(msg, [
        "🚀 Grace Auto Post™ Scheduled",
        "",
        `Post ID: ${scheduled.post.id}`,
        `Targets: ${scheduled.targetCount}`,
        `Status: ${String(scheduled.post.status || "pending_approval").toUpperCase()}`,
        "",
        "The schedule cannot publish until an authorised Executive approves it.",
        `Executive approval: /approve ${scheduled.post.id}`
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 2 autopost failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not create that Auto Post schedule.");
    }
  });

  bot.onText(/^\/graceadmin(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await requirePermission(msg, "grace.admin.manage"))) return;
    const parsed = parseGraceAdminInput(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}`);
    const { action, telegramId, accountIds } = parsed.value;
    try {
      const workspace = await graceRepository.getWorkspace();
      if (action === "list") {
        const { data, error } = await supabase
          .from("grace_workspace_members")
          .select("telegram_id,role,status,permissions")
          .eq("workspace_id", workspace.id)
          .eq("status", "active")
          .order("role", { ascending: true });
        if (error) throw error;
        const lines = (data || []).map((row) => `${row.telegram_id} — ${row.role.toUpperCase()}`);
        return send(msg, `👥 Grace Auto Post™ Team\n\n${lines.join("\n") || "No active members."}`);
      }

      if (TOP_EXECUTIVES.has(telegramId)) {
        return send(msg, "⛔ Owner/Executive access cannot be changed through delegated Admin controls.");
      }

      if (action === "remove") {
        await repository.setAdmin(telegramId, "disabled", msg.from.id);
        await supabase.from("grace_workspace_members").update({ status: "disabled", updated_at: new Date().toISOString() })
          .eq("workspace_id", workspace.id).eq("telegram_id", telegramId);
        await supabase.from("grace_account_permissions").update({
          can_create: false, can_schedule: false, can_publish: false, can_approve: false, updated_at: new Date().toISOString()
        }).eq("workspace_id", workspace.id).eq("telegram_id", telegramId);
        return send(msg, `✅ Grace scheduling access disabled for Telegram ID ${telegramId}.`);
      }

      if (action === "add") {
        await repository.setAdmin(telegramId, "active", msg.from.id);
        for (const [permission, enabled] of [
          ["communication.broadcast", false], ["grace.view", true], ["grace.draft", true],
          ["grace.schedule", true], ["grace.results", true], ["grace.approve", false]
        ]) await repository.setAdminPermission(telegramId, permission, enabled, msg.from.id);
        const { error: memberError } = await supabase.from("grace_workspace_members").upsert({
          workspace_id: workspace.id,
          telegram_id: Number(telegramId),
          role: "admin",
          status: "active",
          permissions: ["grace.view", "grace.draft", "grace.schedule", "grace.results"],
          added_by: msg.from.id,
          updated_at: new Date().toISOString()
        }, { onConflict: "workspace_id,telegram_id" });
        if (memberError) throw memberError;
      }

      const { data: accounts, error: accountError } = await supabase.from("grace_social_accounts")
        .select("id").eq("workspace_id", workspace.id).in("id", accountIds).neq("status", "disabled");
      if (accountError) throw accountError;
      if ((accounts || []).length !== accountIds.length) return send(msg, "❌ One or more Grace account IDs are invalid.");
      const rows = accountIds.map((accountId) => ({
        workspace_id: workspace.id,
        account_id: accountId,
        telegram_id: Number(telegramId),
        can_create: true,
        can_schedule: true,
        can_publish: false,
        can_approve: false,
        created_by: msg.from.id,
        updated_at: new Date().toISOString()
      }));
      const { error: permissionError } = await supabase.from("grace_account_permissions")
        .upsert(rows, { onConflict: "account_id,telegram_id" });
      if (permissionError) throw permissionError;
      return send(msg, `✅ Telegram ID ${telegramId} can now create Grace Auto Schedules for account(s): ${accountIds.join(", ")}.\n\nTheir schedules still require Executive approval.`);
    } catch (error) {
      console.error("Grace Build 2 admin control failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not complete that Admin access change.");
    }
  });
}

module.exports = {
  TOP_EXECUTIVES,
  parseAutoPostInput,
  parseGraceAdminInput,
  registerGraceBuild2Handlers
};
