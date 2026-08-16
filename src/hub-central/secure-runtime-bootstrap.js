const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const TARGET_DOMAIN = "cryptobotz.cryptoworldz.xyz";
const CONFIRMATION = "APPROVE SECURE RUNTIME";
const buckets = new Map();

function allowAttempt(req) {
  const now = Date.now();
  const key = String(req.ip || req.socket?.remoteAddress || "unknown");
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}

function websiteItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

async function verifyHostingerAccess(token) {
  const response = await fetch("https://developers.hostinger.com/api/hosting/v1/websites", {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(20000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return false;
  return websiteItems(payload).some((item) => String(item?.domain || "").toLowerCase() === TARGET_DOMAIN);
}

function verifyRuntimeRoot() {
  const packagePath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (pkg.name !== "cryptoworldz-bot" || pkg.scripts?.start !== "node index.js") {
    throw new Error("unexpected_runtime_root");
  }
}

function mergeProtectedEnv(values) {
  verifyRuntimeRoot();
  const envPath = path.join(process.cwd(), ".env");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(values));
  const kept = existing.filter((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    return !match || !keys.has(match[1]);
  });
  while (kept.length && kept[kept.length - 1] === "") kept.pop();
  kept.push("", "# OneWorldz protected runtime values — server only");
  for (const [key, value] of Object.entries(values)) kept.push(`${key}=${value}`);
  kept.push("");

  const tempPath = `${envPath}.oneworldz-${process.pid}.tmp`;
  fs.writeFileSync(tempPath, kept.join("\n"), { mode: 0o600 });
  fs.renameSync(tempPath, envPath);
  try { fs.chmodSync(envPath, 0o600); } catch {}
  return envPath;
}

function registerSecureRuntimeBootstrap(app) {
  if (!app || typeof app.post !== "function") throw new Error("express_app_required");

  app.post(
    "/api/hub-central/secure-runtime-bootstrap",
    express.json({ limit: "24kb" }),
    async (req, res) => {
      res.set("Cache-Control", "no-store, max-age=0");
      if (!allowAttempt(req)) return res.status(429).json({ ok: false, error: "rate_limited" });

      const confirmation = String(req.body?.confirmation || "");
      const hostingerToken = String(req.body?.hostinger_api_token || "").trim();
      const openaiKey = String(req.body?.openai_api_key || "").trim();
      if (confirmation !== CONFIRMATION) return res.status(400).json({ ok: false, error: "confirmation_required" });
      if (hostingerToken.length < 20 || openaiKey.length < 20) {
        return res.status(400).json({ ok: false, error: "protected_values_required" });
      }

      try {
        const verified = await verifyHostingerAccess(hostingerToken);
        if (!verified) return res.status(403).json({ ok: false, error: "hostinger_access_not_verified" });

        mergeProtectedEnv({
          OPENAI_API_KEY: openaiKey,
          HOSTINGER_API_TOKEN: hostingerToken,
          ONEWORLDZ_OPENAI_MODEL: "gpt-5.6"
        });
        process.env.OPENAI_API_KEY = openaiKey;
        process.env.HOSTINGER_API_TOKEN = hostingerToken;
        process.env.ONEWORLDZ_OPENAI_MODEL = "gpt-5.6";

        return res.json({
          ok: true,
          persisted: true,
          hostinger_access_verified: true,
          openai_configured: true,
          target: TARGET_DOMAIN
        });
      } catch (error) {
        console.error("Secure runtime bootstrap failed", error?.message || error);
        return res.status(500).json({ ok: false, error: "secure_runtime_bootstrap_failed" });
      }
    }
  );
}

module.exports = { registerSecureRuntimeBootstrap, verifyHostingerAccess };
