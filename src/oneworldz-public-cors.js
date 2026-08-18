const ALLOWED_ONEWORLDZ_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com"
]);

function registerOneWorldzPublicCors(app) {
  app.use("/api/public/heroes", (req, res, next) => {
    const origin = String(req.get("origin") || "").trim();
    if (origin && ALLOWED_ONEWORLDZ_ORIGINS.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  });
}

module.exports = { ALLOWED_ONEWORLDZ_ORIGINS, registerOneWorldzPublicCors };
