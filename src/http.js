const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const { getRank, parseSimpleRaid, shortenWallet } = require("./core");
const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");
const { solanaPayUri, verifySolanaContribution } = require("./solana");

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

  app.use("/miniapp", express.static(miniAppPath, {
    index: "index.html",
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store, max-age=0")
  }));
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
        repository.listGovernanceProposals(20, telegramId),
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

  app.post("/api/mini/missions/:id/submit", authenticateMiniApp, async (req, res) => {
    try {
      const missionId = Number(req.params.id);
      const proofUrl = String(req.body && req.body.proof_url || "").trim();
      if (!Number.isSafeInteger(missionId) || missionId < 1) return res.status(400).json({ ok: false, error: "invalid_mission" });
      if (proofUrl) { try { if (new URL(proofUrl).protocol !== "https:") throw new Error(); } catch { return res.status(400).json({ ok: false, error: "invalid_proof_url" }); } }
      if (!await repository.getUser(req.telegramUser.id)) return res.status(403).json({ ok: false, error: "registration_required" });
      const mission = await repository.getMission(missionId);
      if (!mission || !["active", "open"].includes(mission.status) || mission.expires_at && Date.parse(mission.expires_at) <= Date.now()) return res.status(409).json({ ok: false, error: "mission_not_active" });
      const result = await repository.submitMissionClaim({ missionId, telegramId: req.telegramUser.id, completionText: proofUrl ? "Proof submitted in Command Centre" : "DONE submitted in Command Centre", proofUrl });
      if (result.duplicate) return res.status(409).json({ ok: false, error: "duplicate_submission" });
      return res.status(201).json({ ok: true, submission: result.submission });
    } catch (error) { console.error("Mini App mission submission failed", { name: error && error.name || "Error" }); return res.status(500).json({ ok: false, error: "submission_failed" }); }
  });

  app.post("/api/mini/governance/:id/vote", authenticateMiniApp, async (req, res) => {
    try {
      const proposalId = Number(req.params.id);
      const selectedOption = String(req.body && req.body.selected_option || "");
      if (!Number.isSafeInteger(proposalId) || proposalId < 1 || !/^\d+$/.test(selectedOption)) return res.status(400).json({ ok: false, error: "invalid_vote" });
      const result = await repository.castGovernanceVote(proposalId, req.telegramUser.id, selectedOption);
      const status = { unregistered: 403, not_found: 404, closed: 409, invalid_option: 400, duplicate: 409 }[result.outcome];
      if (status) return res.status(status).json({ ok: false, error: result.outcome === "duplicate" ? "already_voted" : result.outcome });
      return res.status(201).json({ ok: true, result });
    } catch (error) {
      console.error("Governance vote failed", { name: error && error.name || "Error" });
      return res.status(500).json({ ok: false, error: "vote_failed" });
    }
  });

  app.get("/api/mini/kitty/qr", authenticateMiniApp, async (req, res) => {
    try {
      const asset = String(req.query.asset || "").toUpperCase();
      const amount = req.query.amount === undefined || req.query.amount === "" ? null : Number(req.query.amount);
      if (!['SOL','USDC'].includes(asset) || amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1000000)) return res.status(400).json({ ok: false, error: "invalid_payment" });
      const account = (await repository.listTreasuryAccounts()).find((item) => item.asset === asset);
      if (!account) return res.status(404).json({ ok: false, error: "kitty_not_configured" });
      const uri = solanaPayUri({ recipient: account.public_address, asset, amount, usdcMint: config.solanaUsdcMint });
      const png = await QRCode.toBuffer(uri, { type: "png", width: 420, margin: 2, color: { dark: "#180526", light: "#ffffff" } });
      res.set("Cache-Control", "no-store"); return res.type("png").send(png);
    } catch { return res.status(500).json({ ok: false, error: "qr_failed" }); }
  });

  app.post("/api/mini/kitty/claim", authenticateMiniApp, async (req, res) => {
    try {
      const asset = String(req.body && req.body.asset || "").toUpperCase();
      const signature = String(req.body && req.body.signature || "").trim();
      const account = (await repository.listTreasuryAccounts()).find((item) => item.asset === asset);
      if (!account) return res.status(404).json({ ok: false, error: "kitty_not_configured" });
      const verified = await verifySolanaContribution({ signature, asset, recipient: account.public_address, rpcUrl: config.solanaRpcUrl, usdcMint: config.solanaUsdcMint });
      const rule = await repository.getContributionRule(asset);
      const ruleConfig = rule && rule.config || {};
      const minimum = Number(ruleConfig.minimum_amount) || 0;
      let points = rule && rule.enabled && verified.amount >= minimum ? Math.floor(verified.amount * (Number(ruleConfig.points_per_unit) || 0)) : 0;
      if (rule && rule.max_points !== null) points = Math.min(points, Number(rule.max_points) || 0);
      const result = await repository.recordVerifiedContribution({ accountId: account.id, telegramId: req.telegramUser.id, ...verified, points });
      if (result.outcome === "duplicate") return res.status(409).json({ ok: false, error: "transaction_already_claimed" });
      if (result.outcome === "unregistered") return res.status(403).json({ ok: false, error: "registration_required" });
      return res.status(201).json({ ok: true, contribution: result, verified_amount: verified.amount, asset });
    } catch (error) { const safe = ["invalid_signature","invalid_asset","transaction_not_confirmed","wrong_recipient","no_matching_transfer"].includes(error.message) ? error.message : "verification_failed"; return res.status(400).json({ ok: false, error: safe }); }
  });

  app.post("/api/mini/admin/submissions/:id/approve", authenticateMiniApp, async (req, res) => {
    try { if (!await repository.hasPermission(req.telegramUser.id, "submission.approve", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" }); const result = await repository.approveSubmission(Number(req.params.id), req.telegramUser.id); if (!result.already_awarded) bot.sendMessage(result.telegram_id, `✅ Raaiiidd Complete!\n\n🎯 ${result.mission_title}\n⭐ ${result.awarded_points} Legend Points awarded\n🏆 New total: ${result.total_points}\n🎖 Rank: ${getRank(result.total_points)}\n\nYour contribution has been recorded.`).catch(() => undefined); return res.json({ ok: true, result }); }
    catch { return res.status(409).json({ ok: false, error: "approval_failed" }); }
  });

  app.post("/api/mini/admin/submissions/:id/reject", authenticateMiniApp, async (req, res) => {
    try { if (!await repository.hasPermission(req.telegramUser.id, "submission.reject", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" }); const reason = String(req.body && req.body.reason || "").trim(); if (reason.length < 2 || reason.length > 500) return res.status(400).json({ ok: false, error: "reason_required" }); const result = await repository.rejectSubmission(Number(req.params.id), req.telegramUser.id, reason); if (result.outcome === "rejected") bot.sendMessage(result.submission.telegram_id, `❌ Submission Not Approved\n\n🎯 Mission #${result.submission.mission_id}\n📝 Reason: ${reason}\n\nYou may contact the Admin Team if you believe this needs review.`).catch(() => undefined); return res.json({ ok: true, result }); }
    catch { return res.status(409).json({ ok: false, error: "rejection_failed" }); }
  });

  app.get("/api/mini/admin/operations", authenticateMiniApp, async (req, res) => {
    try { if (!await repository.hasPermission(req.telegramUser.id, "report.view", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" }); const [stats, activity, admins, partners] = await Promise.all([repository.getStats(), repository.listActivity(15), repository.listAdmins(), repository.listPartners()]); return res.json({ ok: true, stats, activity, admins, partners }); }
    catch { return res.status(500).json({ ok: false, error: "operations_failed" }); }
  });

  app.post("/api/mini/owner/contribution-rules", authenticateMiniApp, async (req, res) => {
    if (String(req.telegramUser.id) !== String(config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "owner_required" });
    const asset = String(req.body && req.body.asset || "").toUpperCase(); const enabled = Boolean(req.body && req.body.enabled); const pointsPerUnit = Number(req.body && req.body.points_per_unit); const minimumAmount = Number(req.body && req.body.minimum_amount); const maxPoints = Number(req.body && req.body.max_points);
    if (!['SOL','USDC'].includes(asset) || ![pointsPerUnit,minimumAmount,maxPoints].every(Number.isFinite) || pointsPerUnit < 0 || minimumAmount < 0 || maxPoints < 0 || maxPoints > 10000) return res.status(400).json({ ok: false, error: "invalid_rule" });
    try { return res.json({ ok: true, rule: await repository.setContributionRule({ asset, enabled, pointsPerUnit, minimumAmount, maxPoints }, req.telegramUser.id) }); } catch { return res.status(500).json({ ok: false, error: "rule_update_failed" }); }
  });

  app.post("/api/mini/owner/admins", authenticateMiniApp, async (req, res) => {
    if (String(req.telegramUser.id) !== String(config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "owner_required" });
    const telegramId = Number(req.body && req.body.telegram_id); const role = String(req.body && req.body.role || ""); const status = String(req.body && req.body.status || "active");
    if (!Number.isSafeInteger(telegramId) || telegramId < 1 || String(telegramId) === String(config.ownerTelegramId) || !["admin","moderator","recap_manager","partner_manager","treasury_manager"].includes(role) || !["active","disabled"].includes(status)) return res.status(400).json({ ok: false, error: "invalid_admin_update" });
    try { const admin = status === "active" ? await repository.setAdminRole(telegramId, role, req.telegramUser.id) : await repository.setAdmin(telegramId, "disabled", req.telegramUser.id); return res.json({ ok: true, admin }); } catch { return res.status(500).json({ ok: false, error: "admin_update_failed" }); }
  });

  app.post("/api/mini/owner/permissions", authenticateMiniApp, async (req, res) => {
    if (String(req.telegramUser.id) !== String(config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "owner_required" });
    const telegramId = Number(req.body && req.body.telegram_id); const permission = String(req.body && req.body.permission || ""); const enabled = Boolean(req.body && req.body.enabled);
    if (!Number.isSafeInteger(telegramId) || telegramId < 1 || String(telegramId) === String(config.ownerTelegramId) || !/^[a-z]+\.[a-z]+$/.test(permission) || permission.length > 80) return res.status(400).json({ ok: false, error: "invalid_permission_update" });
    try { return res.json({ ok: true, permission: await repository.setAdminPermission(telegramId, permission, enabled, req.telegramUser.id) }); } catch { return res.status(500).json({ ok: false, error: "permission_update_failed" }); }
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
