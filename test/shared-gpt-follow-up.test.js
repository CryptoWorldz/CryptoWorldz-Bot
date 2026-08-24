const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  ALLOWED_ORIGINS,
  guideInstructions,
  suggestedRoutes
} = require("../src/oneworldz-gpt/shared-guide");
const { registerOneWorldzGptGateway } = require("../src/hub-central/oneworldz-gpt-gateway");

test("shared GPT allowlist includes both CryptoWorldz browser origins", () => {
  assert.ok(ALLOWED_ORIGINS.has("https://cryptoworldz.xyz"));
  assert.ok(ALLOWED_ORIGINS.has("https://www.cryptoworldz.xyz"));
  assert.ok(ALLOWED_ORIGINS.has("https://oneworldz.com"));
});

test("shared prompt identifies OneWorldz and CryptoWorldz and keeps four support pathways separate", () => {
  const prompt = guideInstructions("cryptoworldz");
  assert.match(prompt, /CryptoWorldz GTP surface/);
  assert.match(prompt, /Reagan & Children/);
  assert.match(prompt, /Community Impact/);
  assert.match(prompt, /Davis Family/);
  assert.match(prompt, /Support JayJayTeamDev/);
  assert.match(prompt, /Current website surface: cryptoworldz/);
});

test("Davis Family routes positively without matching unrelated Davis references", () => {
  const positive = suggestedRoutes("I want to support the Davis Family");
  assert.ok(positive.some((route) => route.href === "https://donateworldz.com/davis-family/"));

  for (const text of ["Tell me about Miles Davis", "Who won the Davis Cup?"]) {
    const routes = suggestedRoutes(text);
    assert.ok(!routes.some((route) => route.href === "https://donateworldz.com/davis-family/"));
  }
});

test("first registered full-runtime gateway sets CORS for both CryptoWorldz origins", () => {
  const handlers = {};
  const app = {
    options(route, handler) { handlers[`OPTIONS ${route}`] = handler; },
    post(route, handler) { handlers[`POST ${route}`] = handler; }
  };
  registerOneWorldzGptGateway(app);
  const preflight = handlers["OPTIONS /api/oneworldz-gpt/chat"];
  assert.equal(typeof preflight, "function");

  for (const origin of ["https://cryptoworldz.xyz", "https://www.cryptoworldz.xyz"]) {
    const headers = {};
    const req = { get(name) { return name === "origin" ? origin : ""; } };
    const res = {
      set(name, value) { headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      end() { this.ended = true; return this; }
    };
    preflight(req, res);
    assert.equal(res.statusCode, 204);
    assert.equal(headers["Access-Control-Allow-Origin"], origin);
  }
});

test("fallback gateway consumes the same shared allowlist and prompt configuration", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  assert.match(source, /oneworldz-gpt\/shared-guide/);
  assert.match(source, /ALLOWED_ORIGINS\.has\(origin\)/);
  assert.match(source, /instructions: guideInstructions\(page\)/);
});

test("full runtime registers the shared GPT gateway before Hub Central duplicate routes", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "pdc-host.js"), "utf8");
  assert.ok(source.indexOf("registerOneWorldzGptGateway(app)") < source.indexOf("registerHubCentralLive(app)"));
});
