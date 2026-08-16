const { registerHubCentralLive } = require("./hub-central/live-v1");
const { registerSecureRuntimeBootstrap } = require("./hub-central/secure-runtime-bootstrap");
const { registerOneWorldzGptGateway } = require("./hub-central/oneworldz-gpt-gateway");
const { registerCommunitySupportLive } = require("./community-support/live-v1");

// Compatibility registrar retained because src/http.js already imports this module.
// It registers protected CryptoBotz services only. Public OneWorldz/Worldz hostname
// routing and static-site fallback hosting were deliberately removed during the
// canonical-route cleanup. Static websites are built only by
// apps/oneworldz-ecosystem-release and are never served from CryptoBotz.
function registerPdcHost(app) {
  registerOneWorldzGptGateway(app);
  registerHubCentralLive(app);
  registerSecureRuntimeBootstrap(app);
  registerCommunitySupportLive(app);
}

module.exports = { registerPdcHost };
