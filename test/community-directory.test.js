const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTelegramMessage,
  buildXMessage,
  chooseProject,
  normalizeHandle,
  parseIdentifyArgs,
  slugify,
  splitText,
  telegramUrl,
  topicUrl
} = require("../src/community-directory");

test("normalizes handles and project slugs", () => {
  assert.equal(normalizeHandle("@CryptoWorldzX"), "CryptoWorldzX");
  assert.equal(slugify("Recover Your Debt $DEBT"), "recover-your-debt-debt");
});

test("builds public Telegram and topic links safely", () => {
  assert.equal(telegramUrl({ username: "CryptoWorldzHQ" }), "https://t.me/CryptoWorldzHQ");
  assert.equal(topicUrl("https://t.me/CryptoWorldzHQ", 42), "https://t.me/CryptoWorldzHQ/42");
  assert.equal(topicUrl("https://t.me/+privateInvite", 42), "https://t.me/+privateInvite");
});

test("matches known projects from group titles", () => {
  const projects = [
    { slug: "uganda-unite", display_name: "Uganda Unite", match_terms: ["uganda unite"] },
    { slug: "solworldz", display_name: "SolWorldz", match_terms: ["solworld", "sol world"] }
  ];
  assert.equal(chooseProject(projects, { title: "SolWorld Elite Business Team" }).slug, "solworldz");
  assert.equal(chooseProject(projects, { title: "Uganda Unite Community" }).slug, "uganda-unite");
});

test("parses project and topic labels", () => {
  assert.deepEqual(parseIdentifyArgs("SolWorldz | Elite Business Team"), {
    projectLabel: "SolWorldz",
    topicLabel: "Elite Business Team"
  });
  assert.deepEqual(parseIdentifyArgs(""), { projectLabel: "", topicLabel: "" });
});

test("formats local Telegram and X messages", () => {
  const telegram = buildTelegramMessage({
    title: "CryptoWorldz HQ",
    topic_label: "Executive Team",
    public_url: "https://t.me/CryptoWorldzHQ/5",
    linked_title: "CryptoWorldz Announcements",
    linked_public_url: "https://t.me/CryptoWorldzNews"
  }, {
    handle: "CryptoWorldzX",
    url: "https://x.com/CryptoWorldzX"
  });
  assert.match(telegram, /Executive Team/);
  assert.match(telegram, /CryptoWorldz Announcements/);
  assert.match(telegram, /@CryptoWorldzX/);

  const x = buildXMessage({
    display_name: "SolWorldz",
    handle: "Solworldx",
    url: "https://x.com/Solworldx"
  }, "SolWorldz");
  assert.match(x, /@Solworldx/);
});

test("splits long directory messages within Telegram limits", () => {
  const chunks = splitText(`${"A".repeat(2500)}\n\n${"B".repeat(2500)}`);
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((chunk) => chunk.length <= 4096));
});
