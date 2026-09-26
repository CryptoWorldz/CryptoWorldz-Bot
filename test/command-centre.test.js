const test = require("node:test");
const assert = require("node:assert/strict");
const { BOT_MENU_COMMANDS, MENUS } = require("../src/command-centre");

test("gateway commands stay simple and ordered", () => {
  assert.deepEqual(
    BOT_MENU_COMMANDS.map((item) => item.command),
    ["zedstart", "max", "worldzfullbuild", "fullscope", "zed", "auto", "grace", "admin", "admingrace", "zedsettings", "help"]
  );
});

test("each command centre section exposes exactly five core actions", () => {
  for (const key of ["zed", "fullbuild", "fullscope", "votes", "govern", "auto", "grace", "admin", "admingrace", "settings"]) {
    assert.equal(MENUS[key].rows.length, 5, `${key} must expose five core actions`);
  }
});

test("safety-critical emergency commands remain visible", () => {
  assert.ok(MENUS.auto.rows.some((row) => row[1] === "/autoemergency"));
  assert.ok(MENUS.admingrace.rows.some((row) => row[1] === "/pauseall"));
});


test("popularity and governance are unmistakably separated in Command Centre", () => {
  assert.ok(MENUS.votes.title.includes("POPULARITY"));
  assert.ok(MENUS.govern.title.includes("GOVERNANCE"));
  assert.ok(MENUS.votes.rows.some((row) => row[1] === "/tokenvote"));
  assert.ok(MENUS.govern.rows.some((row) => row[1] === "/governvote"));
  assert.equal(MENUS.votes.rows.some((row) => row[1] === "/governvote"), false);
  assert.equal(MENUS.govern.rows.some((row) => row[1] === "/tokenvote"), false);
});
