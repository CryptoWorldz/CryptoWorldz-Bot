const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { getRank, parseSimpleRaid, shortenWallet } = require("./core");
const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");

function safeTokenMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function audit(event, details = {}) {
  console.log(
    JSON.stringify({
      type: "zed_audit",
      event,
      timestamp: new Date().toISOString(),
      ...details
    })
  );
}

function createHttpApp({ bot, config, repository }) {
  const app = express();
  const openApiPath = path.join(__dirname, "..", ".well-known", "openapi.yaml");
  const openApiDocument = fs.readFileSync(openApiPath, "utf8");
  const miniAppPath = path.join(__dirname, "..", "public", "miniapp");
  const allowMiniRequest = createRequestLimiter({ maxEvents: 60, intervalMs: 60000 });
  const allowMiniAuthAttempt = createRequestLimiter({ maxEvents: 120, intervalMs: 60000 });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb", type: "application/json" }));

  app.get("/", (req, res) => {
    res.json({ ok: true, service: "CryptoWorldz Zed Bot" });
  });

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  const serveOpenApi = (req, res) => {
    res.type("application/yaml").send(openApiDocument);
  };
  app.get("/.well-known/openapi.yaml", serveOpenApi);
  app.get("/openapi.yaml", serveOpenApi);

  app.use("/miniapp", express.static(miniAppPath, { index: "index.html", maxAge: "1h" }));
  app.get("/api/public/mini-config", (req, res) => res.json({
    ok: true,
    community: {
      telegram: config.communityTelegramUrl || null,
      x: config.communityXUrl || null,
      announcements: config.communityAnnouncementsUrl || null,
      support: config.communitySupportUrl || null,
      website: config.communityWebsiteUrl || config.websiteUrl
    }
  }));

  const authenticateMiniApp = (req, res, next) => {
    if (!allowMiniAuthAttempt(req.ip)) return res.status(429).json({ ok: false, error: "rate_limited" });
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    const rateKey = `${result.user.id}:${req.ip}`;
    if (!allowMiniRequest(rateKey)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    return next();
  };

  app.get("/api/mini/bootstrap", authenticateMiniApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser.id;
      const [profile, missions, leaderboard, rewards, history, governance, adminAccess, treasury] = await Promise.all([
        repository.getMemberDetails(telegramId),
        repository.listActiveMissions(),
        repository.getLeaderboard(),
        repository.getRewards(telegramId, 10),
        repository.getMissionHistory(telegramId, 25),
        repository.listGovernanceProposals(20),
        repository.getAdminAccess(telegramId, config.adminTelegramIds, config.ownerTelegramId),
        repository.listTreasuryAccounts()
      ]);
      const user = profile && profile.user;
      const points = Number(user && user.points) || 0;
      return res.json({
        ok: true,
        telegram_user: req.telegramUser,
        registered: Boolean(profile),
        profile: profile ? {
          telegram_id: user.telegram_id,
          username: user.username || "",
          first_name: user.first_name || req.telegramUser.first_name || "Legend",
          points,
          rank: getRank(points),
          missions_completed: Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0),
          pending_submissions: profile.pending,
          rewards_earned: profile.rewardsEarned,
          member_since: user.registered_at || user.created_at,
          wallet_connected: Boolean(user.wallet),
          wallet: shortenWallet(user.wallet)
        } : null,
        missions,
        leaderboard,
        rewards,
        mission_history: history,
        governance,
        admin: adminAccess.authorized,
        admin_access: adminAccess,
        treasury
      });
    } catch (error) {
      console.error("Mini App bootstrap failed", { name: error && error.name ? error.name : "Error" });
      return res.status(500).json({ ok: false, error: "mini_app_load_failed" });
    }
  });

  app.get("/api/mini/admin/submissions", authenticateMiniApp, async (req, res) => {
    try {
      const allowed = await repository.hasPermission(req.telegramUser.id, "submission.view", config.adminTelegramIds, config.ownerTelegramId);
      if (!allowed) return res.status(403).json({ ok: false, error: "admin_required" });
      return res.json({ ok: true, submissions: await repository.listPending(50) });
    } catch (error) {
      console.error("Mini App admin submissions failed", { name: error && error.name ? error.name : "Error" });
      return res.status(500).json({ ok: false, error: "admin_submissions_failed" });
    }
  });

  app.post("/api/mini/admin/missions", authenticateMiniApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser.id;
      const allowed = await repository.hasPermission(telegramId, "mission.create", config.adminTelegramIds, config.ownerTelegramId);
      if (!allowed) return res.status(403).json({ ok: false, error: "admin_required" });
      const url = req.body && req.body.url;
      const reward = req.body && req.body.reward;
      const duration = req.body && req.body.duration;
      const missionInput = duration
        ? `${url || ""} | ${reward === undefined || reward === "" ? 10 : reward} | ${duration}`
        : reward !== undefined && reward !== "" ? `${url || ""} | ${reward}` : String(url || "");
      const parsed = parseSimpleRaid(missionInput);
      if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });
      if (await repository.findMissionByUrl(parsed.mission.target_url)) {
        return res.status(409).json({ ok: false, error: "duplicate_mission" });
      }
      const mission = await repository.createMission(parsed.mission, telegramId);
      return res.status(201).json({ ok: true, mission });
    } catch (error) {
      console.error("Mini App mission creation failed", { name: error && error.name ? error.name : "Error" });
      return res.status(500).json({ ok: false, error: "mission_creation_failed" });
    }
  });

  app.post("/api/command", async (req, res) => {
    const requestId = crypto.randomUUID();
    const authHeader = req.get("authorization") || "";
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const suppliedToken = bearerMatch ? bearerMatch[1].trim() : "";

    if (!config.adminApiToken || !safeTokenMatch(suppliedToken, config.adminApiToken)) {
      audit("admin_api_auth_failed", { request_id: requestId });
      return res.status(401).json({ ok: false, error: "unauthorized", request_id: requestId });
    }

    const { action, chat_id: chatId, text } = req.body || {};
    if (action !== "send_message") {
      audit("admin_api_action_rejected", {
        request_id: requestId,
        action: String(action || "")
      });
      return res
        .status(400)
        .json({ ok: false, error: "unsupported_action", request_id: requestId });
    }

    const normalizedChatId = String(chatId || "").trim();
    if (!normalizedChatId || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        ok: false,
        error: "chat_id_and_text_required",
        request_id: requestId
      });
    }
    if (text.length > 4096) {
      return res.status(400).json({ ok: false, error: "text_too_long", request_id: requestId });
    }
    if (!config.allowedChatIds.has(normalizedChatId)) {
      audit("admin_api_chat_rejected", {
        request_id: requestId,
        chat_id: normalizedChatId
      });
      return res.status(403).json({ ok: false, error: "chat_not_allowed", request_id: requestId });
    }

    try {
      await bot.sendMessage(normalizedChatId, text.trim());
      audit("admin_api_message_sent", {
        request_id: requestId,
        chat_id: normalizedChatId
      });
      return res.json({ ok: true, request_id: requestId });
    } catch (error) {
      console.error("Admin API Telegram send failed", {
        request_id: requestId,
        name: error && error.name ? error.name : "Error"
      });
      audit("admin_api_message_failed", {
        request_id: requestId,
        chat_id: normalizedChatId
      });
      return res
        .status(502)
        .json({ ok: false, error: "telegram_send_failed", request_id: requestId });
    }
  });

  app.post("/telegram-webhook", (req, res) => {
    const suppliedSecret = req.get("x-telegram-bot-api-secret-token") || "";
    if (!safeTokenMatch(suppliedSecret, config.webhookSecret)) {
      audit("telegram_webhook_rejected");
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    res.sendStatus(200);
    Promise.resolve(bot.processUpdate(req.body)).catch((error) => {
      console.error("Telegram update processing failed", {
        name: error && error.name ? error.name : "Error"
      });
    });
    return undefined;
  });

  app.use((error, req, res, next) => {
    if (!error) return next();
    if (error.type === "entity.too.large") {
      return res.status(413).json({ ok: false, error: "payload_too_large" });
    }
    if (error instanceof SyntaxError) {
      return res.status(400).json({ ok: false, error: "invalid_json" });
    }
    console.error("HTTP request failed", { name: error.name || "Error" });
    return res.status(500).json({ ok: false, error: "internal_error" });
  });

  return app;
}

module.exports = { audit, createHttpApp, safeTokenMatch };
