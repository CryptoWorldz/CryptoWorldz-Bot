const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const html = fs.readFileSync(path.join(__dirname, "../public/miniapp/open-x.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function launch(query) {
  const nodes = {};
  const document = {
    getElementById(id) { return nodes[id] ||= { appendChild() {}, addEventListener() {} }; },
    createElement() { return { style: {} }; }
  };
  // No native navigation or timers are supplied: either would fail the test.
  vm.runInNewContext(script, { URL, URLSearchParams, location: { search: query }, document });
  return nodes;
}
test("raid launcher preserves the exact post on explicit clicks", () => {
  const id = "2116635766965092553";
  const exact = "https://x.com/JayJayTeamDev/status/" + id;
  const nodes = launch("?id=" + id + "&src=" + encodeURIComponent(exact));
  assert.equal(nodes["open-app"].href, exact);
  assert.equal(nodes["open-web"].href, exact);
  assert.equal(nodes["open-web"].target, "_blank");
  assert(!html.includes("location.href ="));
  assert(!html.includes("twitter://"));
  assert(!html.includes("intent://"));
});
test("raid launcher rejects mismatched and unrelated source links", () => {
  const id = "2116635766965092553";
  for (const source of ["https://evil.example/status/" + id, "https://x.com/JayJayTeamDev/status/123456789", "https://x.com/home"]) {
    const nodes = launch("?id=" + id + "&src=" + encodeURIComponent(source));
    assert.equal(nodes["open-web"].href, "https://x.com/i/web/status/" + id);
  }
});
test("raid launcher blocks missing or invalid status IDs", () => {
  for (const query of ["", "?id=bad", "?id=1234"]) {
    const nodes = launch(query);
    assert.equal(nodes["open-app"].hidden, true);
    assert.equal(nodes["open-web"].hidden, true);
  }
});
