const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/miniapp/index.html"), "utf8");
const max = fs.readFileSync(path.join(root, "public/miniapp/max.js"), "utf8");

test("Mini App loads Command Centre MAX and WorldzLaunchPad", () => {
  assert.match(html, /Command Centre <span>MAX™<\/span>/);
  assert.match(html, /WORLDZLAUNCHPAD™/);
  assert.match(max, /command-centre-max/);
  assert.doesNotMatch(max, /max-public-feed/);
  assert.doesNotMatch(max, /RECAP/);
  assert.match(max, /data-open="raids"/);
  assert.doesNotMatch(html, /based[.]bid/i);
  assert.equal(fs.existsSync(path.join(root, "public/miniapp/based-bid-launch-view.js")), false);
});

test("Mini App public shell and experience use current Worldz branding", () => {
  for (const file of ["index.html", "experience.js", "x-pages.js"]) {
    const text = fs.readFileSync(path.join(root, "public/miniapp", file), "utf8");
    assert.doesNotMatch(text, /oneworldz/i, `${file} exposes retired branding`);
  }
});
