const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CONNECTING_WORLDZ,
  PRIMARY_WEBSITES,
  WEBSITE_COMMANDS,
  buildLiveDirectoryMessage,
  buildSolWorldzMessage,
  buildWebsiteDirectoryMessage,
  buildWebsiteMessage,
  registerWebsiteTelegramHandlers
} = require("../src/websites-telegram");

test("website command replaces the coming-soon wording", () => {
  const text = buildWebsiteMessage({ websiteUrl: "https://CryptoWorldz.xyz" });
  assert.match(text, /Check This Out/);
  assert.match(text, /https:\/\/CryptoWorldz\.xyz/);
  assert.doesNotMatch(text, /launching soon/i);
});

test("website directory lists primary and connecting Worldz", () => {
  const text = buildWebsiteDirectoryMessage();
  for (const site of PRIMARY_WEBSITES) assert.match(text, new RegExp(site.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const domain of CONNECTING_WORLDZ) assert.match(text, new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("verified live directory remains registered", () => {
  assert.match(buildLiveDirectoryMessage(), /18 verified browser routes/);
});

test("SolWorldz command opens the official domain", () => {
  assert.match(buildSolWorldzMessage(), /https:\/\/SolWorldz\.xyz/);
});

test("Telegram registration replaces website and adds all website commands", async () => {
  const listeners = [];
  const removed = [];
  const messages = [];
  const bot = {
    removeTextListener(pattern) { removed.push(pattern.toString()); },
    onText(pattern, handler) { listeners.push({ pattern, handler }); },
    on() {},
    sendMessage(chatId, text, options) {
      messages.push({ chatId, text, options });
      return Promise.resolve();
    }
  };

  registerWebsiteTelegramHandlers({ bot, config: { websiteUrl: "https://CryptoWorldz.xyz" } });
  assert.equal(removed.length, 1);
  assert.deepEqual(WEBSITE_COMMANDS.map((item) => item.command), ["websites", "worldzlive", "solworldz"]);

  const website = listeners.find((listener) => listener.pattern.test("/website"));
  const websites = listeners.find((listener) => listener.pattern.test("/websites"));
  const worldzlive = listeners.find((listener) => listener.pattern.test("/worldzlive"));
  const solworldz = listeners.find((listener) => listener.pattern.test("/solworldz"));
  assert.ok(website && websites && worldzlive && solworldz);

  await website.handler({ chat: { id: 77 } });
  assert.match(messages[0].text, /Check This Out/);
});
