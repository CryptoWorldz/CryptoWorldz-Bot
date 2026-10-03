const test = require("node:test");
const assert = require("node:assert/strict");
const { BOT_MENU_COMMANDS, MENUS, WEB_ROUTES } = require("../src/command-centre");

test("gateway commands put simple onboarding before advanced controls", () => {
  assert.deepEqual(
    BOT_MENU_COMMANDS.map((item) => item.command),
    ["howtojoin", "about", "zedstart", "max", "fullscope", "zed", "auto", "grace", "admin", "admingrace", "zedsettings", "help"]
  );
});

test("each command centre section exposes exactly five core actions", () => {
  for (const key of ["zed", "fullscope", "votes", "auto", "grace", "admin", "admingrace", "settings"]) {
    assert.equal(MENUS[key].rows.length, 5, `${key} must expose five core actions`);
  }
  assert.equal(Boolean(MENUS.govern), false);
});

test("safety-critical emergency commands remain visible", () => {
  assert.ok(MENUS.auto.rows.some((row) => row[1] === "/autoemergency"));
  assert.ok(MENUS.admingrace.rows.some((row) => row[1] === "/pauseall"));
});

test("Worldz Votes Centre exposes the hourly favourite-token vote", () => {
  assert.match(MENUS.votes.title, /1 VOTE \/ HOUR/);
  assert.ok(MENUS.votes.rows.some((row) => row[1] === "/vote"));
  assert.equal(MENUS.votes.rows.some((row) => /govern/i.test(row[1])), false);
});

test("WorldzFullBuild has a first-party Command Centre route", () => {
  assert.equal(WEB_ROUTES.fullBuild, "https://launchpad.cryptoworldz.xyz/fullbuild/");
});

test("public Command Centre links resolve to active Worldz destinations", () => {
  assert.equal(WEB_ROUTES.publicCommands, "https://cryptoworldz.xyz/command-centre-max/");
  assert.equal(WEB_ROUTES.acknowledgements, "https://donateworldz.com/acknowledgements/");
  assert.equal(WEB_ROUTES.directory, "https://cryptoworldz.xyz/");
});
