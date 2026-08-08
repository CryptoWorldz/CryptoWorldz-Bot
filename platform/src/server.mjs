import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import {
  assertProductionReady,
  loadConfig,
  runtimeReadiness,
} from "./config.mjs";
import { createRepository } from "./repository.mjs";
import { createGraceX } from "./grace-x.mjs";
import { createGraceWorker } from "./grace-worker.mjs";
import { createAutoController } from "./auto.mjs";
import { createTelegramController } from "./telegram.mjs";

function digest(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest();
}

export function secretMatches(received, expected) {
  if (!expected || !received) return false;
  return crypto.timingSafeEqual(digest(received), digest(expected));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function callbackPage({ ok, title, message, username = "" }) {
  const accent = ok ? "#c9ff47" : "#ff8a88";
  const eyebrow = ok ? "CONNECTED" : "NOT CONNECTED";
  const account = username
    ? `<p class="account">Approved X account: <strong>@${escapeHtml(username)}</strong></p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(title)} · Grace</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#08131d;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}.card{width:min(680px,100%);padding:clamp(28px,7vw,64px);border:1px solid #35424e;border-radius:28px;background:linear-gradient(145deg,#101f2b,#0a1620);box-shadow:0 28px 90px #0008}.eyebrow{margin:0 0 14px;color:${accent};font-size:.8rem;font-weight:900;letter-spacing:.16em}.brand{margin:0 0 40px;color:#cbd5dc;font-size:.9rem}.brand strong{color:#fff}.card h1{max-width:12ch;margin:0;font-size:clamp(2.4rem,9vw,5.8rem);line-height:.92;letter-spacing:-.055em}.message{margin:28px 0 0;color:#cbd5dc;font-size:clamp(1.05rem,3vw,1.35rem);line-height:1.65}.account{margin:22px 0 0}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}.actions a{display:inline-flex;min-height:48px;align-items:center;justify-content:center;padding:0 20px;border-radius:999px;background:${accent};color:#08131d;font-weight:900;text-decoration:none}.actions a.secondary{border:1px solid #53616d;background:transparent;color:#fff}
  </style>
</head>
<body>
  <main class="card">
    <p class="brand"><strong>GRACE</strong> · OneWorldz Command Centre</p>
    <p class="eyebrow">${eyebrow}</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="message">${escapeHtml(message)}</p>
    ${account}
    <div class="actions">
      <a href="https://t.me/CryptoWorldzBot">Return to Zed</a>
      <a class="secondary" href="https://oneworldz-rebuild.oneworldz.chatgpt.site/command-centre">Command Centre</a>
    </div>
  </main>
</body>
</html>`;
}

export function createApp({
  config,
  repository,
  graceX,
  telegram,
  auto,
  logger = console,
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb", strict: true }));
  app.use((_request, response, next) => {
    response.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });

  app.get(["/health", "/grace/health"], (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json({ status: "ok", ...runtimeReadiness(config) });
  });

  app.get("/grace/oauth/x/callback", async (request, response) => {
    response.set("Cache-Control", "no-store");
    try {
      const result = await graceX.completeConnection({
        state: request.query.state,
        code: request.query.code,
        error: request.query.error,
        errorDescription: request.query.error_description,
      });
      response
        .status(200)
        .type("html")
        .send(
          callbackPage({
            ok: true,
            title: "Grace is connected.",
            message:
              "The approved X account is verified and its encrypted connection is ready. Return to Zed and run /gracestatus.",
            username: result.user.username,
          }),
        );
    } catch (error) {
      logger.warn("Grace X callback rejected", { code: error?.code || "UNKNOWN" });
      response
        .status(400)
        .type("html")
        .send(
          callbackPage({
            ok: false,
            title: "Grace did not connect.",
            message:
              error?.message ||
              "The X connection could not be verified. Return to Zed and create one fresh link.",
          }),
        );
    }
  });

  app.post("/telegram-webhook", async (request, response) => {
    const received = request.get("x-telegram-bot-api-secret-token");
    if (!secretMatches(received, config.telegramWebhookSecret)) {
      return response.status(401).json({ ok: false });
    }
    response.status(200).json({ ok: true });
    telegram.handleUpdate(request.body).catch((error) =>
      logger.error("Zed webhook update failed", { code: error?.code || "UNKNOWN" }),
    );
  });

  app.get("/api/owner/status", async (request, response, next) => {
    const bearer = String(request.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const received = request.get("x-owner-secret") || bearer;
    if (!secretMatches(received, config.ownerApiSecret)) {
      return response.status(401).json({ ok: false });
    }
    try {
      const [grace, autoStatus] = await Promise.all([
        repository.getStatus(),
        auto.status(),
      ]);
      return response.json({
        ok: true,
        grace: {
          workspace: grace.workspace.slug,
          posting_enabled: grace.settings.posting_enabled,
          paused: grace.settings.paused,
          emergency_stop: grace.settings.emergency_stop,
          approval_required: grace.settings.approval_required,
          counts: grace.counts,
        },
        auto: autoStatus,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((_request, response) => response.status(404).json({ ok: false, error: "not_found" }));
  app.use((error, _request, response, _next) => {
    logger.error("Command Centre request failed", { code: error?.code || "UNKNOWN" });
    response.status(500).json({ ok: false, error: "internal_error" });
  });
  return app;
}

export function buildRuntime(config, options = {}) {
  const supabase =
    options.supabase ||
    createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "oneworldz-command-centre/4.0.0" } },
    });
  const repository =
    options.repository ||
    createRepository(supabase, { workspaceSlug: config.graceWorkspaceSlug });
  const graceX = options.graceX || createGraceX({ config, repository });
  const auto = options.auto || createAutoController({ repository });
  const telegram =
    options.telegram || createTelegramController({ config, repository, graceX, auto });
  const worker =
    options.worker ||
    createGraceWorker({
      repository,
      graceX,
      intervalMs: config.graceWorkerIntervalMs,
    });
  const app = createApp({ config, repository, graceX, telegram, auto });
  return { app, repository, graceX, telegram, auto, worker };
}

export async function startServer(env = process.env) {
  dotenv.config();
  const config = loadConfig(env);
  assertProductionReady(config);
  const runtime = buildRuntime(config);
  if (config.runWorkers) runtime.worker.start();
  const server = runtime.app.listen(config.port, () => {
    console.log(`OneWorldz Command Centre 4.0.0 listening on port ${config.port}.`);
  });
  runtime.telegram.registerCommands().catch((error) =>
    console.error("Zed command registration failed", {
      code: error?.code || "TELEGRAM_API_FAILED",
    }),
  );
  const stop = () => {
    runtime.worker.stop();
    server.close();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  return { ...runtime, server };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().catch((error) => {
    console.error("Command Centre could not start", { code: error?.code || "CONFIGURATION_ERROR" });
    process.exitCode = 1;
  });
}
