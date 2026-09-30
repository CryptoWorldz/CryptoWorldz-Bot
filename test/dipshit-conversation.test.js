const test = require("node:test");
const assert = require("node:assert/strict");
const { moderationRequiresHardBlock } = require("../src/dipshit-conversation");

test("DipShit does not turn ordinary non-threatening banter into a hard block", () => {
  assert.equal(moderationRequiresHardBlock({ categories: { harassment: true } }), false);
});

test("DipShit still hard-blocks severe safety categories", () => {
  assert.equal(moderationRequiresHardBlock({ categories: { "harassment/threatening": true } }), true);
  assert.equal(moderationRequiresHardBlock({ categories: { "self-harm/instructions": true } }), true);
  assert.equal(moderationRequiresHardBlock({ categories: { "sexual/minors": true } }), true);
});
