const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractPhoto,
  inferProject,
  normalizeProjectSlug,
  splitText,
  targetSendOptions
} = require("../src/worldzcast");

test("normalizes project slugs safely", () => {
  assert.equal(normalizeProjectSlug("  Global Impact Alliance  "), "global-impact-alliance");
  assert.equal(normalizeProjectSlug("CryptoWorldz!!!"), "cryptoworldz");
});

test("extracts the largest Telegram photo", () => {
  const photo = extractPhoto({ photo: [
    { file_id: "small", file_unique_id: "u1" },
    { file_id: "large", file_unique_id: "u2" }
  ] });
  assert.deepEqual(photo, { fileId: "large", uniqueId: "u2" });
  assert.equal(extractPhoto({}), null);
});

test("splits long text without losing content", () => {
  const text = `${"A".repeat(3000)}\n\n${"B".repeat(3000)}`;
  const chunks = splitText(text, 4096);
  assert.equal(chunks.length, 2);
  assert.equal(chunks.join("\n\n"), text);
  assert.deepEqual(splitText(""), []);
});

test("adds topic routing only when a topic is selected", () => {
  assert.deepEqual(targetSendOptions(0), {});
  assert.deepEqual(targetSendOptions(321), { message_thread_id: 321 });
});

test("infers a project from a destination title and falls back to CryptoWorldz", () => {
  const projects = [
    { slug: "cryptoworldz", display_name: "CryptoWorldz", match_terms: ["hq"] },
    { slug: "solworldz", display_name: "SolWorldz", match_terms: ["solworld elite"] }
  ];
  assert.equal(inferProject(projects, "SolWorld Elite Business Team").slug, "solworldz");
  assert.equal(inferProject(projects, "Unknown Community").slug, "cryptoworldz");
  assert.equal(inferProject(projects, "Anything", "solworldz").slug, "solworldz");
});
