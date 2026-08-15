const httpModule = require("../http");
const { registerHubCentralRoutes } = require("./http");

const originalCreateHttpApp = httpModule.createHttpApp;

if (typeof originalCreateHttpApp !== "function") throw new Error("hub_central_http_hook_unavailable");

httpModule.createHttpApp = function createHttpAppWithHubCentral(args) {
  const app = originalCreateHttpApp(args);
  registerHubCentralRoutes({ app, config: args.config });
  return app;
};
