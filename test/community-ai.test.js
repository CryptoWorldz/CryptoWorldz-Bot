const test = require("node:test");
const assert = require("node:assert/strict");
const { callCommunityAI, stripCommunityAIAddressing } = require("../src/community-ai");

test("selected Community AI can be addressed by its configured name", () => {
  assert.equal(stripCommunityAIAddressing("No.5: do we have WorldPing?", { display_name:"No.5" }), "do we have WorldPing?");
  assert.equal(stripCommunityAIAddressing("AI: show capabilities", { display_name:"Rex" }), "show capabilities");
});

test("Community AI provider prompt receives the live capability map", async () => {
  let requestBody = null;
  const fetchImpl = async (url, options) => {
    if (String(url).includes("/moderations")) {
      return { ok:true, json:async () => ({ results:[{ flagged:false, categories:{} }] }) };
    }
    requestBody = JSON.parse(options.body);
    return {
      ok:true,
      json:async () => ({
        output:[{ type:"message", content:[{ type:"output_text", text:"Use /worldping alert | TITLE | MESSAGE" }] }]
      })
    };
  };

  const text = await callCommunityAI({
    apiKey:"test-key",
    model:"test-model",
    question:"Do we have WorldPing?",
    history:[],
    profile:{ display_name:"No.5", preset_key:"no5", role_label:"Smart Community Operator", personality:"Practical" },
    knowledge:[],
    context:{},
    capabilityContext:{ capabilities:[{ key:"worldping", label:"WorldPing™", state:"enabled", member_commands:["/worldping <message>"] }] },
    fetchImpl
  });
  assert.match(text, /worldping/i);
  assert.match(requestBody.instructions, /LIVE CAPABILITY MAP/);
  assert.match(requestBody.instructions, /WorldPing/);
  assert.match(requestBody.instructions, /do not say you cannot confirm it/i);
});
