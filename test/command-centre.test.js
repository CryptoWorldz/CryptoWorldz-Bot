const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { BOT_MENU_COMMANDS, MENUS, WEB_ROUTES, registerCommandCentreHandlers } = require("../src/command-centre");

test("gateway commands stay simple and ordered", () => {
  assert.deepEqual(
    BOT_MENU_COMMANDS.map((item) => item.command),
    ["zedstart", "max", "dipshit", "fullscope", "zed", "auto", "grace", "admin", "admingrace", "zedsettings", "help"]
  );
});

test("each command centre section exposes exactly five core actions", () => {
  for (const key of ["zed", "fullscope", "votes", "govern", "auto", "grace", "admin", "admingrace", "settings"]) {
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


test("WorldzFullBuild has a first-party Command Centre route", () => {
  assert.equal(WEB_ROUTES.fullBuild, "https://launchpad.cryptoworldz.xyz/fullbuild/");
  assert.equal(WEB_ROUTES.dipshit, "https://cryptoworldz.xyz/dipshit/");
});

test("public Command Centre links resolve to active Worldz destinations", () => {
  assert.equal(WEB_ROUTES.publicCommands, "https://cryptoworldz.xyz/command-centre-max/");
  assert.equal(WEB_ROUTES.acknowledgements, "https://donateworldz.com/acknowledgements/");
  assert.equal(WEB_ROUTES.directory, "https://cryptoworldz.xyz/");
});

test("DIPSHIT command opens its public profile without privileged access", async () => {
  const handlers = [];
  const sent = [];
  const bot = {
    onText(pattern, handler) { handlers.push({ pattern, handler }); },
    on() {},
    sendMessage(chatId, message, options) { sent.push({ chatId, message, options }); return Promise.resolve(); }
  };
  registerCommandCentreHandlers({ bot, repository: {}, config: {} });
  const command = handlers.find(({ pattern }) => pattern.test("/dipshit"));
  assert.ok(command);
  await command.handler({ chat: { id: 17 }, from: { id: 19 } });
  assert.equal(sent[0].chatId, 17);
  assert.match(sent[0].message, /proof-first guide/);
  assert.equal(sent[0].options.reply_markup.inline_keyboard[0][0].url, WEB_ROUTES.dipshit);
});

test("DIPSHIT avatar and Mini App assets are connected without literal HTML escapes", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "public/miniapp/index.html"), "utf8");
  const profile = fs.readFileSync(path.join(root, "cryptoworldz.xyz/dipshit/index.html"), "utf8");
  assert.match(html, /id="dipshit"/);
  assert.match(html, /data-screen="dipshit"/);
  assert.doesNotMatch(html, /\\n\s*<(?:link|script|section)/);
  assert.match(profile, /\/dipshit\/avatar\.png/);
  for (const asset of ["public/miniapp/dipshit-worldz-dude.png", "cryptoworldz.xyz/dipshit/avatar.png"]) {
    assert.ok(fs.statSync(path.join(root, asset)).size > 1000);
  }
});
