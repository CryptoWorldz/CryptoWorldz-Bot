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

test("capability catalog covers the sale-facing Community Suite modules", () => {
  const keys = new Set(CAPABILITY_CATALOG.map((row) => row.key));
  for (const key of ["ronald_raider","shill_rewards","rex_secureguard","alice_support","custom_ai","worldzscan","market_alerts","wallet_watch","calendar","giveaways","votes","govern","inbox","worldzcast","social","launchpad","webhooks"]) {
    assert.ok(keys.has(key), key);
  }
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
