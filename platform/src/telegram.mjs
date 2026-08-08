import { EXACT_GRACE_X_REDIRECT_URI, runtimeReadiness } from "./config.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function commandName(text) {
  return String(text || "")
    .trim()
    .split(/\s+/, 1)[0]
    .replace(/@[^\s]+$/, "")
    .toLowerCase();
}

function commandTail(text) {
  return String(text || "").trim().replace(/^\/[^\s]+\s*/i, "");
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

export function createTelegramController({
  config,
  repository,
  graceX,
  auto,
  fetchImpl = global.fetch,
  logger = console,
}) {
  if (!config || !repository || !graceX || !auto) {
    throw new Error("Zed Telegram dependencies are incomplete.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Zed requires Fetch API support.");

  const ownerAllowed = (message) =>
    String(message?.from?.id || "") === String(config.ownerTelegramId || "");

  async function telegram(method, payload) {
    if (!config.telegramBotToken) throw new Error("Zed Telegram is not configured.");
    const response = await fetchImpl(
      `https://api.telegram.org/bot${config.telegramBotToken}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      const error = new Error(`Telegram ${method} returned HTTP ${response.status}.`);
      error.code = "TELEGRAM_API_FAILED";
      throw error;
    }
    return result.result;
  }

  const send = (message, text, options = {}) =>
    telegram("sendMessage", {
      chat_id: message.chat.id,
      text,
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...options,
    });

  async function ownerOnly(message) {
    if (ownerAllowed(message)) return true;
    await send(message, "⛔ This Command Centre control is restricted to JayJayTeamDev.");
    return false;
  }

  async function handleStart(message) {
    return send(
      message,
      [
        "ZED",
        "OneWorldz 🌏 One Vision",
        "CryptoWorldz 🌏 One Mission",
        "",
        "Raaiiidd with purpose: lawful action, transparent audits and real help on the ground.",
        "",
        "Use /help for the Command Centre controls.",
      ].join("\n"),
    );
  }

  async function handleHelp(message) {
    return send(
      message,
      [
        "ZED — Command Centre",
        "",
        "/gracestatus — Grace, X and queue status",
        "/connectx 1 — fresh 10-minute X connection",
        "/gracequeue 1 | your post — create approval preview",
        "/graceapprove POST_ID — approve the preview",
        "/graceon — allow approved posts to publish",
        "/graceoff — stop publishing",
        "/gracepause — emergency stop",
        "/graceresume — clear emergency stop (publishing stays off)",
        "/autostatus — Auto’s buy-only safety state",
        "/websites — OneWorldz network and Action Spread Smiles",
        "",
        "Follow ✅ Like ✅ Comment ✅ Share ✅ — human-led and platform-compliant.",
        "Grace does not automate likes or bulk follows.",
      ].join("\n"),
    );
  }

  async function handleGraceStatus(message) {
    if (!(await ownerOnly(message))) return;
    const [status, xAccount] = await Promise.all([
      repository.getStatus(),
      repository.getXAccount(1),
    ]);
    const connection = xAccount ? await repository.getConnection(xAccount.id) : null;
    const readiness = runtimeReadiness(config);
    return send(
      message,
      [
        "GRACE — live control status",
        "",
        `Runtime configured: ${yesNo(readiness.grace.x_oauth_configured)}`,
        `Exact X callback: ${EXACT_GRACE_X_REDIRECT_URI}`,
        `X account: ${xAccount?.handle ? `@${String(xAccount.handle).replace(/^@/, "")}` : "NOT REGISTERED"}`,
        `X connected: ${yesNo(connection?.status === "active")}`,
        `Posting enabled: ${yesNo(status.settings.posting_enabled)}`,
        `Paused: ${yesNo(status.settings.paused)}`,
        `Emergency stop: ${yesNo(status.settings.emergency_stop)}`,
        `Approval required: ${yesNo(status.settings.approval_required)}`,
        `Pending approval: ${status.counts.pending}`,
        `Queued/publishing: ${status.counts.scheduled}`,
        `Failed/blocked: ${status.counts.failed}`,
      ].join("\n"),
    );
  }

  async function handleConnectX(message, tail) {
    if (!(await ownerOnly(message))) return;
    const accountId = Number(tail || 1);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(message, "❌ Use /connectx 1");
    }
    const connection = await graceX.beginConnection(accountId, message.from.id);
    const handle = String(connection.account.handle || "").replace(/^@/, "");
    return send(
      message,
      [
        "GRACE — fresh X connection",
        "",
        `Expected account: @${handle}`,
        "Press the button once and approve inside X.",
        "A different X account will be rejected.",
        "This one-use link expires in 10 minutes.",
      ].join("\n"),
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: `Connect @${handle}`, url: connection.authorizationUrl }],
          ],
        },
      },
    );
  }

  async function handleGraceQueue(message, tail) {
    if (!(await ownerOnly(message))) return;
    const separator = tail.indexOf("|");
    if (separator < 0) {
      return send(message, "❌ Use /gracequeue 1 | the exact post text");
    }
    const accountId = Number(tail.slice(0, separator).trim());
    const body = tail.slice(separator + 1).trim();
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(message, "❌ The Grace X account ID must be a positive whole number.");
    }
    const queued = await repository.queueApproval({
      accountId,
      body,
      actorTelegramId: message.from.id,
    });
    return send(
      message,
      [
        "GRACE — approval preview",
        "",
        queued.post.body,
        "",
        `Post ID: ${queued.post.id}`,
        `Account: @${String(queued.account.handle || "").replace(/^@/, "")}`,
        "Status: PENDING APPROVAL — nothing has published.",
        `Approve: /graceapprove ${queued.post.id}`,
      ].join("\n"),
    );
  }

  async function handleGraceApprove(message, tail) {
    if (!(await ownerOnly(message))) return;
    const postId = tail.trim();
    if (!UUID.test(postId)) {
      return send(message, "❌ Use /graceapprove followed by the exact Post ID.");
    }
    const post = await repository.approvePost(postId, message.from.id);
    if (!post) return send(message, "❌ That post is missing or no longer approvable.");
    return send(
      message,
      [
        "✅ GRACE APPROVAL RECORDED",
        `Post ID: ${post.id}`,
        "It can publish only while Grace is enabled, unpaused and connected to the approved X account.",
      ].join("\n"),
    );
  }

  async function handleAutoStatus(message) {
    if (!(await ownerOnly(message))) return;
    const state = await auto.status();
    const settings = state.settings || {};
    return send(
      message,
      [
        "AUTO — owner-controlled finance status",
        "",
        "Mode: BUY ONLY",
        `Enabled: ${yesNo(settings.enabled)}`,
        `Execution enabled: ${yesNo(settings.execution_enabled)}`,
        `Paused: ${yesNo(settings.paused)}`,
        `Emergency stop: ${yesNo(settings.emergency_stop)}`,
        `External wallet connected: ${yesNo(settings.wallet_connected)}`,
        `Active schedules: ${state.counts.active}`,
        "Selling: NO",
        "Private keys accepted here: NO",
        "Multi-wallet/artificial volume: NO",
        "External signer required: YES",
      ].join("\n"),
    );
  }

  async function handleWebsites(message) {
    return send(
      message,
      [
        "OneWorldz 🌏 One Vision",
        config.oneWorldzSiteUrl,
        "",
        "Action Spread Smiles Organisation",
        `${config.oneWorldzSiteUrl.replace(/\/$/, "")}/action-spread-smiles`,
        "",
        "Reagan Kauja — Mayuge District, Uganda",
        `${config.oneWorldzSiteUrl.replace(/\/$/, "")}/reagan-kauja`,
        "",
        "Donation and verified Facebook previews",
        `${config.oneWorldzSiteUrl.replace(/\/$/, "")}/donate`,
        `${config.oneWorldzSiteUrl.replace(/\/$/, "")}/facebook`,
      ].join("\n"),
      { disable_web_page_preview: false },
    );
  }

  async function handleUpdate(update) {
    const message = update?.message;
    if (!message?.chat?.id || typeof message.text !== "string") {
      return { ignored: "not_a_text_message" };
    }
    const name = commandName(message.text);
    const tail = commandTail(message.text);
    try {
      switch (name) {
        case "/start":
          await handleStart(message);
          break;
        case "/help":
          await handleHelp(message);
          break;
        case "/gracestatus":
          await handleGraceStatus(message);
          break;
        case "/connectx":
        case "/gracex":
          await handleConnectX(message, tail);
          break;
        case "/gracequeue":
          await handleGraceQueue(message, tail);
          break;
        case "/graceapprove":
          await handleGraceApprove(message, tail);
          break;
        case "/graceon":
          if (await ownerOnly(message)) {
            await repository.setPostingEnabled(true, message.from.id);
            await send(message, "✅ Grace publishing enabled. Only approved due posts can publish.");
          }
          break;
        case "/graceoff":
          if (await ownerOnly(message)) {
            await repository.setPostingEnabled(false, message.from.id);
            await send(message, "⏸ Grace publishing disabled. Queued approvals are preserved.");
          }
          break;
        case "/gracepause":
          if (await ownerOnly(message)) {
            await repository.pauseAll(message.from.id);
            await send(message, "🛑 Grace emergency-stopped. Publishing is disabled.");
          }
          break;
        case "/graceresume":
          if (await ownerOnly(message)) {
            await repository.resumeAll(message.from.id);
            await send(message, "✅ Grace emergency stop cleared. Publishing remains off until /graceon.");
          }
          break;
        case "/autostatus":
          await handleAutoStatus(message);
          break;
        case "/websites":
          await handleWebsites(message);
          break;
        default:
          if (name.startsWith("/")) await handleHelp(message);
          else return { ignored: "not_a_command" };
      }
      return { handled: name };
    } catch (error) {
      logger.error("Zed command failed", {
        command: name,
        code: error?.code || "UNKNOWN",
      });
      await send(message, `❌ ${error?.message || "The Command Centre could not complete that action."}`);
      return { handled: name, error: error?.code || "UNKNOWN" };
    }
  }

  async function registerCommands() {
    return telegram("setMyCommands", {
      commands: [
        { command: "start", description: "Open the OneWorldz Command Centre" },
        { command: "gracestatus", description: "Owner: Grace and X status" },
        { command: "connectx", description: "Owner: connect an approved X account" },
        { command: "gracequeue", description: "Owner: queue an X post for approval" },
        { command: "graceapprove", description: "Owner: approve a queued post" },
        { command: "gracepause", description: "Owner: emergency-stop Grace" },
        { command: "autostatus", description: "Owner: Auto buy-only status" },
        { command: "websites", description: "Open OneWorldz and Action Spread Smiles" },
        { command: "help", description: "Show all controls" },
      ],
    });
  }

  return { handleUpdate, registerCommands, sendMessage: telegram };
}
