const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const { normalizeHost, registerPdcHost } = require("../src/pdc-host");

function request(server, pathname, headers = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port: address.port,
      path: pathname,
      method: "GET",
      headers
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("normalizes Purple Diamond Crew hostnames", () => {
  assert.equal(normalizeHost({ hostname: "www.PurpleDiamondCrew.com" }), "purplediamondcrew.com");
  assert.equal(normalizeHost({ hostname: "purplediamondcrew.com" }), "purplediamondcrew.com");
});

test("serves the complete Purple Diamond Crew site from the Zed host preview path", async (t) => {
  const app = express();
  registerPdcHost(app);
  app.get("/", (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const page = await request(server, "/purple-diamond-crew/");
  assert.equal(page.status, 200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.body, /const requestedSite = 'pdc';/);
  assert.match(page.body, /assets\/pdc-site\.js/);

  const script = await request(server, "/purple-diamond-crew/assets/pdc-site.js");
  assert.equal(script.status, 200);
  assert.match(script.body, /location\.pathname\.startsWith\('\/purple-diamond-crew'\)/);
  assert.match(script.body, /Real People\. Real Action\. Real Impact\./);
});

test("serves Purple Diamond Crew at the domain root when the domain is connected", async (t) => {
  const app = express();
  registerPdcHost(app);
  app.get("/", (req, res) => res.json({ ok: true, service: "fallback" }));
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const page = await request(server, "/", { Host: "purplediamondcrew.com" });
  assert.equal(page.status, 200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.body, /const requestedSite = 'pdc';/);

  const fallback = await request(server, "/", { Host: "cryptobotz.cryptoworldz.xyz" });
  assert.equal(fallback.status, 200);
  assert.match(fallback.body, /fallback/);
});
