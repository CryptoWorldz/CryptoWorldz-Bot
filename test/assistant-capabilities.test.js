const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CAPABILITY_CATALOG,
  buildAssistantCapabilityContext,
  deterministicCapabilityAnswer,
  formatCapabilitySummary
} = require("../src/assistant-capabilities");

test("shared AI capability registry always knows WorldPing and its exact command", async () => {
  const context = await buildAssistantCapabilityContext({ supabase: null, chatId: -100123 });
  const worldPing = context.capabilities.find((row) => row.key === "worldping");
  assert.ok(worldPing);
  assert.equal(worldPing.label, "WorldPing™");
  assert.ok(worldPing.member_commands.includes("/worldping <message>"));
  assert.equal(worldPing.state, "runtime_available_group_state_unknown");
  assert.match(formatCapabilitySummary(context), /WorldPing/);
});

test("capability catalog covers sale-facing Community Suite modules without governance", () => {
  const keys = new Set(CAPABILITY_CATALOG.map((row) => row.key));
  for (const key of ["ronald_raider","shill_rewards","rex_secureguard","alice_support","custom_ai","worldzscan","market_alerts","wallet_watch","calendar","giveaways","votes","inbox","worldzcast","social","launchpad","webhooks"]) {
    assert.ok(keys.has(key), key);
  }
  assert.equal(keys.has("govern"), false);
});

test("Worldz Votes capability exposes hourly favourite-token voting", async () => {
  const context = await buildAssistantCapabilityContext({ supabase: null, chatId: -100123 });
  const votes = context.capabilities.find((row) => row.key === "votes");
  assert.ok(votes.member_commands.some((command) => command.startsWith("/vote ")));
  assert.match(votes.summary, /rolling hour/i);
});

test("WorldPing existence questions bypass model guessing and return the exact command", async () => {
  const context = await buildAssistantCapabilityContext({ supabase: null, chatId: -100123 });
  const answer = deterministicCapabilityAnswer("Do We have a WorldPing??", context);
  assert.ok(answer);
  assert.equal(answer.key, "worldping");
  assert.match(answer.text, /WorldPing™ exists/);
  assert.match(answer.text, /\/worldping alert \| TITLE \| MESSAGE/);
  assert.doesNotMatch(answer.text, /can.?t confirm/i);
});

test("deterministic capability lookup does not hijack unrelated conversation", async () => {
  const context = await buildAssistantCapabilityContext({ supabase: null, chatId: -100123 });
  assert.equal(deterministicCapabilityAnswer("Good morning team", context), null);
});

test("REXSECURE ULTIMATE capability exposes threat intelligence controls", async () => {
  const context = await buildAssistantCapabilityContext({ supabase: null, chatId: -100123 });
  const rex = context.capabilities.find((row) => row.key === "rex_secureguard");
  assert.equal(rex.label, "REXSECURE ULTIMATE™");
  assert.ok(rex.admin_commands.some((command) => command.startsWith("/rexintel")));
  assert.match(rex.summary, /Network Shield/i);
});
