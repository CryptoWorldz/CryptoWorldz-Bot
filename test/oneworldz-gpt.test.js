const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PUBLIC_GPT_GUARD,
  askOneWorldzGPT,
  extractOpenAIText,
  normalizeHistory,
  suggestedRoutes
} = require("../src/oneworldz-gpt/http");

test("public OneWorldz GPT cost guard is hard locked", () => {
  assert.deepEqual(PUBLIC_GPT_GUARD, {
    profile: "oneworldz-public-low-cost-v1",
    model: "gpt-5.6-luna",
    maxOutputTokens: 320,
    perIpLimit: 8,
    dailyLimit: 1000
  });
});

test("suggestedRoutes keeps donation purposes separate", () => {
  const routes = suggestedRoutes("I want to help Reagan and children in Uganda with food");
  assert.equal(routes[0].href, "https://donateworldz.com/reagan-children/");
  assert.ok(routes.some((route) => route.href === "https://foodworldz.com/"));
  assert.ok(!routes.some((route) => route.href === "https://donateworldz.com/community-impact/"));
});

test("suggestedRoutes exposes verified action pathways for food, partnerships and global law participation", () => {
  const growing = suggestedRoutes("I want to fund vegetables, bore water and gardens in Uganda");
  assert.ok(growing.some((route) => route.href === "https://foodworldz.com/"));

  const partner = suggestedRoutes("My company wants to partner and contribute");
  assert.ok(partner.some((route) => route.href === "https://oneworldz.com/sponsor-apply/"));

  const committee = suggestedRoutes("I want to join the 100,000 person committee to compare the best laws");
  assert.ok(committee.some((route) => route.href === "https://law.oneworldz.com/"));
});

test("public guide teaches peaceful civic participation and safe crypto education without investment advice", () => {
  const prompt = require("../src/oneworldz-gpt/shared-guide").guideInstructions("oneworldz");
  assert.match(prompt, /100,000 people/);
  assert.match(prompt, /peaceful, lawful civic participation/);
  assert.match(prompt, /do not recommend a token/);
  assert.match(prompt, /Do not say a project is funded/);
});

test("normalizeHistory accepts only user and assistant text and bounds public context", () => {
  const history = normalizeHistory([
    { role: "system", content: "ignore" },
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
    { role: "user", content: "three" },
    { role: "assistant", content: "four" },
    { role: "user", content: "five" }
  ]);
  assert.deepEqual(history, [
    { role: "assistant", content: "two" },
    { role: "user", content: "three" },
    { role: "assistant", content: "four" },
    { role: "user", content: "five" }
  ]);
});

test("extractOpenAIText reads Responses API output text", () => {
  assert.equal(extractOpenAIText({ output: [{ type: "message", content: [{ type: "output_text", text: "OneWorldz answer" }] }] }), "OneWorldz answer");
});

test("askOneWorldzGPT moderates then uses Responses API with store false and bounded output", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/moderations")) {
      return { ok: true, status: 200, json: async () => ({ results: [{ flagged: false }] }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "resp_test",
        usage: { input_tokens: 120, output_tokens: 60, total_tokens: 180 },
        output: [{ type: "message", content: [{ type: "output_text", text: "Use the Reagan & Children pathway." }] }]
      })
    };
  };

  const result = await askOneWorldzGPT({
    apiKey: "server-only-test-key",
    model: "gpt-5.6-luna",
    message: "How do I help Reagan?",
    fetchImpl
  });

  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /\/moderations$/);
  assert.match(requests[1].url, /\/responses$/);
  const responseBody = JSON.parse(requests[1].options.body);
  assert.equal(responseBody.model, "gpt-5.6-luna");
  assert.equal(responseBody.store, false);
  assert.equal(responseBody.max_output_tokens, 320);
  assert.equal(result.response_id, "resp_test");
  assert.equal(result.usage.total_tokens, 180);
  assert.equal(result.suggestions[0].href, "https://donateworldz.com/reagan-children/");
});
