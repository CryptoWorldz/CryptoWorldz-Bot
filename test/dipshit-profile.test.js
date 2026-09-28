const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { registerTelegramHandlers, PUBLIC_COMMANDS } = require("../src/telegram");
const { allRegisteredCommandNames } = require("../src/command-registry");

test("DIPSHIT has a local blue profile image, public page and reachable Telegram command", async () => {
  const root = path.join(__dirname, "..");
  const image = path.join(root, "assets-source/dipshit/blue-worldz-dude.png");
  const page = fs.readFileSync(path.join(root, "cryptoworldz.xyz/dipshit/index.html"), "utf8");
  assert.ok(fs.statSync(image).size > 1000);
  assert.ok(fs.existsSync(path.join(root, "cryptoworldz.xyz/dipshit/blue-worldz-dude.png")));
  assert.match(page, /blue-worldz-dude\.png/);
  assert.ok(PUBLIC_COMMANDS.some((row) => row.command === "dipshit"));
  assert.ok(allRegisteredCommandNames().includes("dipshit"));

  const handlers = [];
  const photos = [];
  const bot = { onText(regex, handler) { handlers.push([regex, handler]); }, on() {}, async sendPhoto(...args) { photos.push(args); }, async sendMessage() {} };
  registerTelegramHandlers({ bot, repository: {}, config: {} });
  const route = handlers.find(([regex]) => regex.test("/dipshit"));
  assert.ok(route);
  await route[1]({ chat: { id: 42 } });
  assert.equal(photos[0][0], 42);
  assert.equal(photos[0][1], image);
});
