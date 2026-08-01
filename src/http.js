const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");

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

function createHttpApp({ bot, config }) {
  const app = express();
  const openApiPath = path.join(__dirname, "..", ".well-known", "openapi.yaml");
  const openApiDocument = fs.readFileSync(openApiPath, "utf8");

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
