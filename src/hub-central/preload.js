const path = require("node:path");
const dotenv = require("dotenv");

const protectedEnvPath = path.join(__dirname, "..", "..", ".env");
const protectedEnv = dotenv.config({ path: protectedEnvPath }).parsed || {};
if (!String(process.env.OPENAI_API_KEY || "").trim()) {
  const protectedOpenAI = String(protectedEnv.OPENAI_API_KEY || "").trim();
  if (protectedOpenAI) process.env.OPENAI_API_KEY = protectedOpenAI;
}

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
