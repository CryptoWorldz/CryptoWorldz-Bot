const test = require("node:test");
const assert = require("node:assert/strict");
const { ALLOWED_ORIGINS, extractText, normalizeDesign } = require("../src/worldz-token-designer");

test("Worldz token designer allows LaunchPad origin only from approved public surfaces", () => {
  assert.equal(ALLOWED_ORIGINS.has("https://launchpad.cryptoworldz.xyz"), true);
  assert.equal(ALLOWED_ORIGINS.has("https://evil.example"), false);
});

test("Worldz token designer normalizes public creator brief", () => {
  const d = normalizeDesign({
    creator_mode: "Advanced",
    token_name: " Miracle ",
    symbol: " mrcl ",
    primary_chain: "Solana",
    supply: "348000000",
    budget_aud: "100",
    purpose: "Community utility",
    cross_chain_targets: ["XRPL / XRP", "Base", ""]
  });
  assert.equal(d.creator_mode, "Advanced");
  assert.equal(d.token_name, "Miracle");
  assert.equal(d.symbol, "MRCL");
  assert.equal(d.supply, 348000000);
  assert.equal(d.budget_aud, 100);
  assert.deepEqual(d.cross_chain_targets, ["XRPL / XRP", "Base"]);
});

test("Worldz token designer extracts Responses API text", () => {
  assert.equal(extractText({
    output: [{ type: "message", content: [{ type: "output_text", text: "TOKEN IDENTITY\nMRCL" }] }]
  }), "TOKEN IDENTITY\nMRCL");
});
