const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AUTO_PICK_PRESETS,
  formatAutoPicks,
  presetKeys,
  presetUpdate
} = require("../src/community-ai-presets");

test("Auto Picks include No.5, specialist presets and Custom Build", () => {
  assert.deepEqual(presetKeys(), ["no5","dipshit","alice","rex","grace","max","custom"]);
  assert.equal(AUTO_PICK_PRESETS.no5.displayName, "No.5");
  assert.equal(AUTO_PICK_PRESETS.custom.displayName, "Custom Build");
  assert.equal(AUTO_PICK_PRESETS.rex.displayName, "REXSECURE™");
  assert.equal(AUTO_PICK_PRESETS.rex.roleLabel, "Security for Your Community");
  assert.match(formatAutoPicks("no5"), /No\.5/);
  assert.match(formatAutoPicks("no5"), /Custom Build/);
});

test("ready-made presets define identity while Custom preserves customer identity", () => {
  const no5 = presetUpdate("no5");
  assert.equal(no5.preset_key, "no5");
  assert.equal(no5.display_name, "No.5");
  assert.match(no5.personality, /practical/i);

  const custom = presetUpdate("custom", { role_label: "My Own Role", display_name: "MINE" });
  assert.equal(custom.preset_key, "custom");
  assert.equal(custom.role_label, "My Own Role");
  assert.equal(custom.display_name, undefined);
});
