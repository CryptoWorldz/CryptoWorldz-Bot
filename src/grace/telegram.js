const {
  formatMoney,
  parseAccountPayload,
  parseBudgetPayload,
  parseDraftPayload,
  parsePostActionPayload,
  parseSchedulePayload,
  shortId
} = require("./core");

const GRACE_COMMANDS = [
  { command: "secretary", description: "Open Grace Social Command Centre" },
  { command: "draft", description: "Create a Grace social post draft" },
  { command: "calendar", description: "View scheduled social posts" },
  { command: "approve", description: "Approve a Grace post" },
  { command: "reject", description: "Reject a Grace post" },
  { command: "schedule", description: "Schedule a post to social accounts" },
  { command: "accounts", description: "View or manage social accounts" },
  { command: "results", description: "View Grace publishing results" },
  { command: "growth", description: "View combined follower growth" },
  { command: "pauseall", description: "Emergency stop all Grace posting" }
];

function formatSydneyDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function registerGraceTelegramHandlers({ bot, repository, graceRepository, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");
  const adminAllowed = (msg) => repository.isManagedAdmin(
    msg.from.id,
    config.adminTelegramIds,
    config.ownerTelegramId
  );
  const editorAllowed = (msg) => repository.hasPermission(
    msg.from.id,
    "communication.broadcast",
    config.adminTelegramIds,
    config.ownerTelegramId
  );

  const denyAdmin = (msg) => send(msg, "⛔ Grace controls require Command Centre access.");
  const denyOwner = (msg) => send(msg, "⛔ This Grace safety control is restricted to the primary owner.");

  function approvalKeyboard(postId) {
    return {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `grace:approve:${postId}` },
          { text: "❌ Reject", callback_data: `grace:reject:${postId}` }
        ]]
      }
    };
  }

  function postCard(post, heading = "👩‍💼 Grace Post") {
    return [
      heading,
      "",
      `ID: ${post.id}`,
      `Title: ${post.title}`,
      `Status: ${String(post.status || "unknown").toUpperCase()}`,
      `Scheduled: ${formatSydneyDate(post.scheduled_for)}`,
      "",
      String(post.body || "").slice(0, 1200)
    ].join("\n");
  }

  bot.onText(/^\/secretary(?:@\w+)?$/, async (msg) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    try {
      const status = await graceRepository.getStatus();
      const spent = await graceRepository.getMonthlySpend();
      return send(msg, [
        "👩‍💼 GRACE — Global Relations, Automation, Communications & Engagement",
        "",
        "Zed-led CryptoWorldz Social Command Centre",
        "Auto Financial Management Partner",
        "",
        `Workspace: ${status.workspace.name}`,
        `Posting: ${status.settings.posting_enabled ? "ENABLED" : "LOCKED"}`,
        `Paused: ${status.settings.paused ? "YES" : "NO"}`,
        `Emergency stop: ${status.settings.emergency_stop ? "ACTIVE" : "CLEAR"}`,
        `Approval required: ${status.settings.approval_required ? "YES" : "NO"}`,
        `Monthly API budget: ${formatMoney(status.settings.monthly_api_budget_usd)}`,
        `Estimated month spend: ${formatMoney(spent)}`,
        "",
        `Accounts: ${status.counts.accounts}`,
        `Drafts: ${status.counts.drafts}`,
        `Waiting approval: ${status.counts.pending}`,
        `Queued targets: ${status.counts.scheduled}`,
        `Failed or blocked: ${status.counts.failed}`,
        "",
        "Commands: /draft /calendar /schedule /approve /reject /accounts /results /growth /pauseall"
      ].join("\n"));
    } catch (error) {
      console.error("Grace secretary command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not load the Social Command Centre status.");
    }
  });

  bot.onText(/^\/draft(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await editorAllowed(msg))) return denyAdmin(msg);
    const parsed = parseDraftPayload(match?.[1]);
    if (!parsed.ok) {
      return send(msg, [
        `❌ ${parsed.error}`,
        "",
        "Use:",
        "/draft Title | Full caption",
        "",
        "A draft never publishes until it is scheduled and approved."
      ].join("\n"));
    }
    try {
      const post = await graceRepository.createDraft({
        ...parsed.value,
        actorTelegramId: msg.from.id
      });
      return send(msg, postCard(post, "📝 Grace Draft Created"), approvalKeyboard(post.id));
    } catch (error) {
      console.error("Grace draft command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not save that draft.");
    }
  });

  bot.onText(/^\/calendar(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    try {
      const days = Math.max(1, Math.min(Number(match?.[1]) || 7, 31));
      const posts = await graceRepository.listCalendar(days);
      if (!posts.length) return send(msg, `📅 Grace Calendar\n\nNo posts are scheduled in the next ${days} days.`);
      const rows = posts.map((post) => [
        `• ${formatSydneyDate(post.scheduled_for)}`,
        `  ${post.title}`,
        `  ${String(post.status).toUpperCase()} — ${shortId(post.id)}`
      ].join("\n"));
      return send(msg, `📅 Grace Calendar — Next ${days} Days\n\n${rows.join("\n\n")}`);
    } catch (error) {
      console.error("Grace calendar command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not load the calendar.");
    }
  });

  bot.onText(/^\/schedule(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await editorAllowed(msg))) return denyAdmin(msg);
    const parsed = parseSchedulePayload(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}`);
    if (new Date(parsed.value.scheduledFor).getTime() < Date.now() - 60000) {
      return send(msg, "❌ The scheduled time must be in the future.");
    }
    try {
      const result = await graceRepository.schedulePost({
        ...parsed.value,
        actorTelegramId: msg.from.id
      });
      if (result.outcome === "not_found") return send(msg, "❌ Grace could not find that post UUID.");
      if (result.outcome === "invalid_accounts") return send(msg, "❌ One or more account IDs are invalid or disabled.");
      if (result.outcome === "closed") return send(msg, "❌ That post is already closed and cannot be scheduled.");
      return send(msg, [
        postCard(result.post, "📅 Grace Post Scheduled"),
        "",
        `Targets: ${result.targetCount}`,
        result.post.status === "pending_approval"
          ? "Publishing remains locked until approval."
          : "This post is approved and will enter the worker queue at the scheduled time."
      ].join("\n"), approvalKeyboard(result.post.id));
    } catch (error) {
      console.error("Grace schedule command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not schedule that post.");
    }
  });

  bot.onText(/^\/approve(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
    if (!(await editorAllowed(msg))) return denyAdmin(msg);
    const parsed = parsePostActionPayload(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}\nUse: /approve post_uuid`);
    try {
      const post = await graceRepository.approvePost(parsed.value.postId, msg.from.id);
      return post
        ? send(msg, postCard(post, "✅ Grace Post Approved"))
        : send(msg, "❌ That post was not found or cannot be approved.");
    } catch (error) {
      console.error("Grace approve command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not approve that post.");
    }
  });

  bot.onText(/^\/reject(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await editorAllowed(msg))) return denyAdmin(msg);
    const parsed = parsePostActionPayload(match?.[1], true);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}\nUse: /reject post_uuid reason`);
    try {
      const post = await graceRepository.rejectPost(parsed.value.postId, parsed.value.reason, msg.from.id);
      return post
        ? send(msg, postCard(post, "❌ Grace Post Rejected"))
        : send(msg, "❌ That post was not found or is already closed.");
    } catch (error) {
      console.error("Grace reject command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not reject that post.");
    }
  });

  bot.onText(/^\/accounts(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    const input = String(match?.[1] || "").trim();
    if (!input) {
      try {
        const accounts = await graceRepository.listAccounts();
        if (!accounts.length) {
          return send(msg, [
            "📱 Grace Social Accounts",
            "",
            "No accounts registered yet.",
            "",
            "Use:",
            "/accounts add x | solworldx | SolWorld | @Solworldx",
            "",
            "Never send an API token through Telegram. Grace will provide the required hosting secret name."
          ].join("\n"));
        }
        const rows = accounts.map((account) => [
          `#${account.id} ${account.display_name}`,
          `${account.platform.toUpperCase()} ${account.handle ? `@${account.handle}` : ""}`.trim(),
          `Status: ${account.status}`,
          `Secret: ${account.credential_secret_ref}`
        ].join(" — "));
        return send(msg, `📱 Grace Social Accounts\n\n${rows.join("\n\n")}`);
      } catch (error) {
        console.error("Grace accounts list failed", { name: error?.name || "Error" });
        return send(msg, "❌ Grace could not load the account register.");
      }
    }

    if (!ownerAllowed(msg)) return denyOwner(msg);
    const parsed = parseAccountPayload(input);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}`);
    try {
      if (parsed.value.action === "add") {
        const account = await graceRepository.addAccount({
          ...parsed.value,
          actorTelegramId: msg.from.id
        });
        return send(msg, [
          "✅ Grace Account Registered",
          "",
          `ID: ${account.id}`,
          `Platform: ${account.platform.toUpperCase()}`,
          `Name: ${account.display_name}`,
          `Handle: ${account.handle ? `@${account.handle}` : "Not supplied"}`,
          `Status: ${account.status}`,
          "",
          "Add this secret in Hostinger—never in Telegram or GitHub:",
          account.credential_secret_ref,
          "",
          `Then activate it with: /accounts enable ${account.id}`
        ].join("\n"));
      }

      const status = parsed.value.action === "enable" ? "active" : "disabled";
      const account = await graceRepository.setAccountStatus(parsed.value.accountId, status, msg.from.id);
      return account
        ? send(msg, `✅ Grace account #${account.id} is now ${status.toUpperCase()}.`)
        : send(msg, "❌ Grace could not find that account ID.");
    } catch (error) {
      console.error("Grace account action failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not complete that account action.");
    }
  });

  bot.onText(/^\/results(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    try {
      const days = Math.max(1, Math.min(Number(match?.[1]) || 7, 90));
      const result = await graceRepository.getResults(days);
      return send(msg, [
        `📊 Grace Results — Last ${days} Days`,
        "",
        `Targets: ${result.total}`,
        `Published: ${result.published}`,
        `Queued: ${result.queued}`,
        `Failed: ${result.failed}`,
        `Blocked: ${result.blocked}`,
        `Estimated API cost: ${formatMoney(result.cost)}`
      ].join("\n"));
    } catch (error) {
      console.error("Grace results command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not load publishing results.");
    }
  });

  bot.onText(/^\/growth(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    const input = String(match?.[1] || "").trim();
    if (input.toLowerCase().startsWith("record ")) {
      if (!(await editorAllowed(msg))) return denyAdmin(msg);
      const [accountId, followers, views = 0, engagements = 0] = input.slice(7).trim().split(/\s+/).map(Number);
      if (![accountId, followers, views, engagements].every((value) => Number.isSafeInteger(value) && value >= 0) || accountId < 1) {
        return send(msg, "❌ Use: /growth record account_id followers views engagements");
      }
      try {
        await graceRepository.recordGrowthSnapshot({
          accountId,
          followers,
          views,
          engagements,
          actorTelegramId: msg.from.id
        });
        return send(msg, `✅ Grace recorded ${followers.toLocaleString("en-AU")} followers for account #${accountId}.`);
      } catch (error) {
        console.error("Grace growth record failed", { name: error?.name || "Error" });
        return send(msg, "❌ Grace could not record that growth snapshot.");
      }
    }

    try {
      const growth = await graceRepository.getGrowthSummary();
      return send(msg, [
        "📈 Grace Growth Command",
        "",
        `Accounts tracked: ${growth.accountsTracked}`,
        `Combined followers: ${growth.followers.toLocaleString("en-AU")}`,
        `Recorded change: ${growth.followerChange >= 0 ? "+" : ""}${growth.followerChange.toLocaleString("en-AU")}`,
        `Latest views: ${growth.views.toLocaleString("en-AU")}`,
        `Latest engagements: ${growth.engagements.toLocaleString("en-AU")}`,
        "",
        "Target: 200,000 combined genuine followers."
      ].join("\n"));
    } catch (error) {
      console.error("Grace growth command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not load the growth summary.");
    }
  });

  bot.onText(/^\/pauseall(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return denyOwner(msg);
    try {
      await graceRepository.pauseAll(msg.from.id);
      return send(msg, "🛑 Zed emergency stop confirmed. Grace posting is paused and disabled across every account.");
    } catch {
      return send(msg, "❌ Grace could not confirm the database pause. Disable the Hostinger app if an immediate hard stop is required.");
    }
  });

  bot.onText(/^\/resumeall(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return denyOwner(msg);
    try {
      await graceRepository.resumeAll(msg.from.id);
      return send(msg, "▶️ Grace emergency stop cleared. Posting remains disabled until /graceenable is used.");
    } catch {
      return send(msg, "❌ Grace could not clear the emergency stop.");
    }
  });

  bot.onText(/^\/graceenable(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return denyOwner(msg);
    try {
      const settings = await graceRepository.getSettings();
      if (settings.emergency_stop || settings.paused) {
        return send(msg, "⚠️ Use /resumeall before enabling the Grace posting worker.");
      }
      await graceRepository.setPostingEnabled(true, msg.from.id);
      return send(msg, "✅ Grace posting worker enabled. Only approved, due posts can publish.");
    } catch {
      return send(msg, "❌ Grace could not enable the posting worker.");
    }
  });

  bot.onText(/^\/gracedisable(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return denyOwner(msg);
    try {
      await graceRepository.setPostingEnabled(false, msg.from.id);
      return send(msg, "🔒 Grace posting worker disabled. Drafting, scheduling and approvals remain available.");
    } catch {
      return send(msg, "❌ Grace could not disable the posting worker.");
    }
  });

  bot.onText(/^\/gracebudget(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return denyOwner(msg);
    const parsed = parseBudgetPayload(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}\nUse: /gracebudget 25`);
    try {
      await graceRepository.setMonthlyBudget(parsed.value, msg.from.id);
      return send(msg, `💎 Auto cost control updated Grace's monthly API budget to ${formatMoney(parsed.value)}.`);
    } catch {
      return send(msg, "❌ Auto cost control could not update the Grace budget.");
    }
  });

  bot.on("callback_query", async (query) => {
    const data = String(query.data || "");
    const match = data.match(/^grace:(approve|reject):([0-9a-f-]{36})$/i);
    if (!match || !query.message || !query.from) return;
    const msg = { chat: query.message.chat, from: query.from };
    try {
      if (!(await editorAllowed(msg))) {
        await bot.answerCallbackQuery(query.id, { text: "Command Centre access required.", show_alert: true });
        return;
      }
      const action = match[1].toLowerCase();
      const postId = match[2];
      const post = action === "approve"
        ? await graceRepository.approvePost(postId, query.from.id)
        : await graceRepository.rejectPost(postId, "Rejected from Telegram approval card", query.from.id);
      await bot.answerCallbackQuery(query.id, { text: post ? `Grace post ${action}d.` : "Post not available." });
      if (post) await bot.sendMessage(query.message.chat.id, postCard(post, action === "approve" ? "✅ Grace Post Approved" : "❌ Grace Post Rejected"));
    } catch (error) {
      console.error("Grace callback failed", { name: error?.name || "Error" });
      await bot.answerCallbackQuery(query.id, { text: "Grace could not complete that action.", show_alert: true }).catch(() => {});
    }
  });
}

module.exports = { GRACE_COMMANDS, formatSydneyDate, registerGraceTelegramHandlers };
