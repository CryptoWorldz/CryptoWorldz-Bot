const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

test("DIPSHIT Worldz Dude profile is wired into the Mini App with no financial authority", () => {
  const html = fs.readFileSync(path.join(ROOT, "public/miniapp/index.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "public/miniapp/dipshit.js"), "utf8");
  const avatar = fs.readFileSync(path.join(ROOT, "public/miniapp/assets/dipshit-worldz-dude.svg"), "utf8");
  assert.match(html, /id="dipshit-worldz-dude"/);
  assert.match(html, /\/miniapp\/dipshit\.js/);
  assert.match(js, /DIPSHIT™/);
  assert.match(js, /WORLDZ DUDE/);
  assert.match(js, /walletSigning:\s*false/);
  assert.match(js, /treasury:\s*false/);
  assert.match(js, /mainnetBroadcast:\s*false/);
  assert.match(js, /LOST\? START HERE/);
  assert.match(js, /ASK DIPSHIT/);
  assert.match(js, /guide_command/);
  assert.match(js, /Run System Check/);
  assert.match(avatar, /WORLDZ DUDE/);
  assert.match(avatar, /#168dff/);
});


const { registerTelegramHandlers, PUBLIC_COMMANDS } = require("../src/telegram");
const { allRegisteredCommandNames } = require("../src/command-registry");

test("DIPSHIT public profile and Telegram command use the blue Worldz Dude with no financial authority", async () => {
  const sourceImage = path.join(ROOT, "assets-source/dipshit/blue-worldz-dude.png");
  const image = path.join(ROOT, "public/miniapp/assets/dipshit-worldz-dude.png");
  const publicImage = path.join(ROOT, "cryptoworldz.xyz/dipshit/blue-worldz-dude.png");
  const page = fs.readFileSync(path.join(ROOT, "cryptoworldz.xyz/dipshit/index.html"), "utf8");

  assert.ok(fs.statSync(sourceImage).size > 1000);
  assert.ok(fs.statSync(image).size > 1000);
  assert.ok(fs.statSync(publicImage).size > 1000);
  assert.match(page, /DIPSHIT™/);
  assert.match(page, /WORLDZ DUDE/);
  assert.match(page, /no wallet-signing authority/i);
  assert.doesNotMatch(page, /OneWorldz|oneworldz\.com/);

  assert.ok(PUBLIC_COMMANDS.some((row) => row.command === "dipshit"));
  assert.ok(allRegisteredCommandNames().includes("dipshit"));

  const handlers = [];
  const photos = [];
  const bot = {
    onText(regex, handler) { handlers.push([regex, handler]); },
    on() {},
    async sendPhoto(...args) { photos.push(args); return { message_id: 1 }; },
    async sendMessage() { return { message_id: 1 }; }
  };
  registerTelegramHandlers({ bot, repository: {}, config: {} });
  const route = handlers.find(([regex]) => regex.test("/dipshit"));
  assert.ok(route);
  await route[1]({ chat: { id: 42 } });
  assert.equal(photos[0][0], 42);
  assert.equal(photos[0][1], image);
  assert.match(photos[0][2].caption, /No wallet signing/);
});
