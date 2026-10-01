const test = require("node:test");
const assert = require("node:assert/strict");
const { localDipshitFallback, moderationRequiresHardBlock } = require("../src/dipshit-conversation");

test("DipShit does not turn ordinary non-threatening banter into a hard block", () => {
  assert.equal(moderationRequiresHardBlock({ categories: { harassment: true } }), false);
});

test("DipShit still hard-blocks severe safety categories", () => {
  assert.equal(moderationRequiresHardBlock({ categories: { "harassment/threatening": true } }), true);
  assert.equal(moderationRequiresHardBlock({ categories: { "self-harm/instructions": true } }), true);
  assert.equal(moderationRequiresHardBlock({ categories: { "sexual/minors": true } }), true);
});


test("DipShit gives deterministic onboarding help when the AI provider is unavailable", () => {
  const reply = localDipshitFallback("How do people join and become Legends?");
  assert.match(reply, /\/register/);
  assert.match(reply, /\/wallet/);
  assert.match(reply, /\/profile/);
  assert.match(reply, /\/raid/);
});

test("DipShit fallback keeps Raid controls usable", () => {
  const reply = localDipshitFallback("show me the next raid");
  assert.match(reply, /\/raid/);
  assert.match(reply, /\/next/);
});
