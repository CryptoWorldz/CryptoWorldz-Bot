const fs = require("fs");
const path = require("path");
const express = require("express");

function normalizeHost(req) {
  return String(req.hostname || req.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase();
}

function registerPdcHost(app) {
  const webRoot = path.join(__dirname, "..", "apps", "cryptoworldz-web-core");
  const indexPath = path.join(webRoot, "index.html");
  const pdcScriptPath = path.join(webRoot, "assets", "pdc-site.js");

  if (!fs.existsSync(indexPath) || !fs.existsSync(pdcScriptPath)) {
    console.warn("Purple Diamond Crew static package is unavailable");
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

  const sendIndex = (req, res) => {
    const source = fs.readFileSync(indexPath, "utf8").replace(
      "const requestedSite = params.get('site');",
      "const requestedSite = 'pdc';"
    );
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.type("html").send(source);
  };

  const sendPdcScript = (req, res) => {
    const source = fs.readFileSync(pdcScriptPath, "utf8").replace(
      "if (hostname !== 'purplediamondcrew.com') return;",
      "if (hostname !== 'purplediamondcrew.com' && new URLSearchParams(location.search).get('site') !== 'pdc' && !location.pathname.startsWith('/purple-diamond-crew')) return;"
    );
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.type("application/javascript").send(source);
  };

  app.get(["/purple-diamond-crew", "/purple-diamond-crew/"], sendIndex);
  app.get("/purple-diamond-crew/assets/pdc-site.js", sendPdcScript);
  app.use("/purple-diamond-crew", staticSite);

  app.use((req, res, next) => {
    if (normalizeHost(req) !== "purplediamondcrew.com") return next();
    if (req.path === "/") return sendIndex(req, res);
    if (req.path === "/assets/pdc-site.js") return sendPdcScript(req, res);
    return staticSite(req, res, next);
  });
}

module.exports = { normalizeHost, registerPdcHost };
