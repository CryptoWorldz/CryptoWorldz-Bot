const httpModule = require("../http");
const { registerHubCentralRoutes } = require("./http");
const { registerOneWorldzGptRoutes } = require("../oneworldz-gpt/http");

if (!String(process.env.HUB_API_SECRET || "").trim() && String(process.env.ADMIN_API_TOKEN || "").trim()) {
  process.env.HUB_API_SECRET = process.env.ADMIN_API_TOKEN;
}

const originalCreateHttpApp = httpModule.createHttpApp;

if (typeof originalCreateHttpApp !== "function") throw new Error("hub_central_http_hook_unavailable");

httpModule.createHttpApp = function createHttpAppWithOneWorldzAI(args) {
  const app = originalCreateHttpApp(args);
  registerHubCentralRoutes({ app, config: args.config });
  registerOneWorldzGptRoutes({ app });
  return app;
};
