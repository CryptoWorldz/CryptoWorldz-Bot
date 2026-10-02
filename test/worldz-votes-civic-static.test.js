const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

test("Command Centre exposes a separate civic public voice surface", () => {
  const html = fs.readFileSync(path.join(ROOT, "public/miniapp/index.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "public/miniapp/worldz-votes-civic.js"), "utf8");
  assert.match(html, /id="worldz-civic-votes"/);
  assert.match(html, /Open Civic Public Voice/);
  assert.match(html, /worldz-votes-civic[.]js/);
  assert.match(js, /No paid ballot advantage/);
  assert.match(js, /NON-BINDING|non-binding/i);
  assert.match(js, /Worldwide by default/i);
  assert.match(js, /Uganda/i);
  assert.match(js, /Food & hunger/i);
  assert.match(js, /Worldz does not endorse/i);
});

test("Civic runtime registers moderated concern intake while keeping vote casting locked", () => {
  const runtime = fs.readFileSync(path.join(ROOT, "src/full-runtime-entry.js"), "utf8");
  const telegram = fs.readFileSync(path.join(ROOT, "src/votes-centre/telegram.js"), "utf8");
  const http = fs.readFileSync(path.join(ROOT, "src/votes-centre/http.js"), "utf8");
  assert.match(runtime, /registerCivicVotesHandlers/);
  assert.match(runtime, /registerCivicVotesRoutes/);
  assert.match(telegram, /worldzvoice/);
  assert.match(telegram, /worldzballots/);
  assert.doesNotMatch(telegram, /\/civicvote/);
  assert.match(http, /bindingVotingEnabled: false/);
  assert.match(http, /voteCastingEnabled: false/);
  assert.match(http, /concernSubmissionEnabled: true/);
  assert.match(http, /concernAutoPublicationEnabled: false/);
  assert.match(http, /worldwide/);
  assert.match(http, /worldz_civic_concerns/);
  assert.doesNotMatch(http, /app[.]post\("\/api\/worldz-votes\/civic\/.*vote/);
  assert.doesNotMatch(http, /app[.]post\("\/api\/worldz-votes\/civic\/.*concern/);
});
