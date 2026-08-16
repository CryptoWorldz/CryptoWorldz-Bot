const fs = require("fs");
const path = require("path");
const express = require("express");
const { registerHubCentralLive } = require("./hub-central/live-v1");
const { registerSecureRuntimeBootstrap } = require("./hub-central/secure-runtime-bootstrap");
const { registerOneWorldzGptGateway } = require("./hub-central/oneworldz-gpt-gateway");
const { registerCommunitySupportLive } = require("./community-support/live-v1");

const WORLDZ_HOSTS = Object.freeze({
  "purplediamondcrew.com": { slug: "purplediamondcrew", site: "pdc", previewPath: "/purple-diamond-crew" },
  "oneworldz.com": { slug: "oneworldz", mode: "mission", previewPath: "/worldz/oneworldz" },
  "cryptoworldz.xyz": { slug: "cryptoworldz", previewPath: "/worldz/cryptoworldz" },
  "solworldz.xyz": { slug: "solworldz", previewPath: "/worldz/solworldz" },
  "ethworldz.xyz": { slug: "ethworldz", mode: "coming-soon", previewPath: "/worldz/ethworldz" },
  "baseworldz.xyz": { slug: "baseworldz", mode: "coming-soon", previewPath: "/worldz/baseworldz" },
  "bnbworldz.xyz": { slug: "bnbworldz", mode: "coming-soon", previewPath: "/worldz/bnbworldz" },
  "xrpworldz.xyz": { slug: "xrpworldz", mode: "coming-soon", previewPath: "/worldz/xrpworldz" },
  "suiworldz.xyz": { slug: "suiworldz", mode: "coming-soon", previewPath: "/worldz/suiworldz" },
  "hyperworldz.xyz": { slug: "hyperworldz", mode: "coming-soon", previewPath: "/worldz/hyperworldz" },
  "robinworldz.xyz": { slug: "robinworldz", mode: "coming-soon", previewPath: "/worldz/robinworldz" },
  "bitcoinworldz.xyz": { slug: "bitcoinworldz", mode: "coming-soon", previewPath: "/worldz/bitcoinworldz" },
  "bitworldz.xyz": { slug: "bitcoinworldz", mode: "coming-soon", previewPath: "/worldz/bitworldz" },
  "hodlerworldz.xyz": { slug: "hodlerworldz", mode: "coming-soon", previewPath: "/worldz/hodlerworldz" },
  "impactbased.oneworldz.com": { slug: "impactbased", mode: "impact", previewPath: "/worldz/impactbased" },
  "impact.oneworldz.com": { slug: "impactbased", mode: "impact", previewPath: "/worldz/impact" },
  "law.oneworldz.com": { slug: "robinhoodlaw", mode: "law", previewPath: "/worldz/law" },
  "learn.oneworldz.com": { slug: "learnworldz", mode: "learn", previewPath: "/worldz/learn" }
});

function normalizeHost(req) {
  return String(req.hostname || req.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase();
}

function injectPreviewSelection(source, world) {
  const site = world.site || world.slug || "";
  const mode = world.mode || "";
  return source.replace(
    "<body>",
    `<body data-worldz-site=${JSON.stringify(site)} data-worldz-mode=${JSON.stringify(mode)}>`
  );
}

function allowPdcPreview(source) {
  const fallbackGuard = "if (hostname !== 'purplediamondcrew.com' && new URLSearchParams(location.search).get('site') !== 'pdc' && !location.pathname.startsWith('/purple-diamond-crew')) return;";
  return source
    .replace(
      "if (hostname !== 'purplediamondcrew.com' && previewSite !== 'purplediamondcrew') return;",
      "if (hostname !== 'purplediamondcrew.com' && previewSite !== 'purplediamondcrew' && previewSite !== 'pdc' && !location.pathname.startsWith('/purple-diamond-crew')) return;"
    )
    .replace(
      "if (hostname !== 'purplediamondcrew.com') return;",
      fallbackGuard
    );
}

function registerPdcHost(app) {
  // Protected OneWorldz services are part of the real Git-deployed CryptoBotz runtime.
  // Register the resilient GPT gateway first so moderation-only 429s can fall back to
  // the Responses API safety layer without weakening other moderation failures.
  registerOneWorldzGptGateway(app);
  registerHubCentralLive(app);
  registerSecureRuntimeBootstrap(app);
  registerCommunitySupportLive(app);

  const webRoot = path.join(__dirname, "..", "apps", "cryptoworldz-web-core");
  const indexPath = path.join(webRoot, "index.html");
  const pdcScriptPath = path.join(webRoot, "assets", "pdc-site.js");
  const pdcAssetPath = path.join(webRoot, "assets", "pdc-asset.js");

  if (!fs.existsSync(indexPath) || !fs.existsSync(pdcScriptPath) || !fs.existsSync(pdcAssetPath)) {
    console.warn("Worldz static package is unavailable");
    return;
  }

  const staticSite = express.static(webRoot, {
    index: false,
    etag: true,
    maxAge: "15m",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    }
  });

  const sendIndex = (world) => (req, res) => {
    const source = injectPreviewSelection(fs.readFileSync(indexPath, "utf8"), world);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.type("html").send(source);
  };

  const sendPreviewScript = (filePath) => (req, res) => {
    const source = allowPdcPreview(fs.readFileSync(filePath, "utf8"));
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.type("application/javascript").send(source);
  };

  for (const world of Object.values(WORLDZ_HOSTS)) {
    const previewPath = world.previewPath;
    const indexHandler = sendIndex(world);
    app.get([previewPath, `${previewPath}/`], indexHandler);
    if (world.site === "pdc") {
      app.get(`${previewPath}/assets/pdc-site.js`, sendPreviewScript(pdcScriptPath));
      app.get(`${previewPath}/assets/pdc-asset.js`, sendPreviewScript(pdcAssetPath));
    }
    app.use(previewPath, staticSite);
  }

  app.use((req, res, next) => {
    const world = WORLDZ_HOSTS[normalizeHost(req)];
    if (!world) return next();
    if (req.path === "/") return sendIndex(world)(req, res);
    return staticSite(req, res, next);
  });
}

module.exports = {
  WORLDZ_HOSTS,
  allowPdcPreview,
  injectPreviewSelection,
  normalizeHost,
  registerPdcHost
};
