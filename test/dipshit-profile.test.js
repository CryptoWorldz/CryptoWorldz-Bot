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
  assert.match(js, /Run DIPSHIT System Check/);
  assert.match(avatar, /WORLDZ DUDE/);
  assert.match(avatar, /#168dff/);
});
