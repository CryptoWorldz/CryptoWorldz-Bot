const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const {
  WORLDZ_HOSTS,
  allowPdcPreview,
  injectPreviewSelection,
  normalizeHost,
  registerPdcHost
} = require("../src/pdc-host");

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

test("normalizes Worldz hostnames", () => {
  assert.equal(normalizeHost({ hostname: "www.PurpleDiamondCrew.com" }), "purplediamondcrew.com");
  assert.equal(normalizeHost({ hostname: "OneWorldz.com" }), "oneworldz.com");
  assert.equal(normalizeHost({ hostname: "XRPWorldz.xyz" }), "xrpworldz.xyz");
});

test("registers every required custom Worldz hostname", () => {
  for (const hostname of [
    "purplediamondcrew.com",
    "oneworldz.com",
    "cryptoworldz.xyz",
    "solworldz.xyz",
    "ethworldz.xyz",
    "baseworldz.xyz",
    "bnbworldz.xyz",
    "xrpworldz.xyz",
    "suiworldz.xyz",
    "hyperworldz.xyz",
    "robinworldz.xyz",
    "bitcoinworldz.xyz",
    "hodlerworldz.xyz",
    "impactbased.oneworldz.com",
    "law.oneworldz.com",
    "learn.oneworldz.com"
  ]) {
    assert.ok(WORLDZ_HOSTS[hostname], `Missing Worldz host: ${hostname}`);
  }
});

test("injects immutable preview selections without changing executable scripts", () => {
  const source = "<!doctype html><html><body><main>Preview</main></body></html>";
  const result = injectPreviewSelection(source, { slug: "xrpworldz", mode: "coming-soon" });
  assert.match(result, /<body data-worldz-site="xrpworldz" data-worldz-mode="coming-soon">/);
  assert.match(result, /<main>Preview<\/main>/);
});

test("opens Purple Diamond Crew scripts only for the verified domain or fallback route", () => {
  const source = "const hostname = location.hostname;\nif (hostname !== 'purplediamondcrew.com') return;\nconsole.log('loaded');";
  const result = allowPdcPreview(source);
  assert.match(result, /hostname !== 'purplediamondcrew\.com'/);
  assert.match(result, /location\.pathname\.startsWith\('\/purple-diamond-crew'\)/);
});

test("serves the complete Purple Diamond Crew site and Hope Chest visual from the Zed fallback", async (t) => {
  const app = express();
  registerPdcHost(app);
  app.get("/", (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const page = await request(server, "/purple-diamond-crew/");
  assert.equal(page.status, 200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.body, /data-worldz-site="pdc"/);
  assert.match(page.body, /assets\/site-router\.js/);
  assert.match(page.body, /assets\/pdc-asset\.js/);

  const router = await request(server, "/purple-diamond-crew/assets/site-router.js");
  assert.equal(router.status, 200);
  assert.match(router.body, /document\.body\.dataset\.worldzSite/);
  assert.match(router.body, /assets\/pdc-fallback\.js/);

  const script = await request(server, "/purple-diamond-crew/assets/pdc-site.js");
  assert.equal(script.status, 200);
  assert.match(script.body, /location\.pathname\.startsWith\('\/purple-diamond-crew'\)/);
  assert.match(script.body, /Real People\. Real Action\. Real Impact\./);

  const asset = await request(server, "/purple-diamond-crew/assets/pdc-asset.js");
  assert.equal(asset.status, 200);
  assert.match(asset.body, /location\.pathname\.startsWith\('\/purple-diamond-crew'\)/);
  assert.match(asset.body, /pdc-hope-chest/);
});

test("serves OneWorldz and blockchain Worldz preview routes", async (t) => {
  const app = express();
  registerPdcHost(app);
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const oneWorldz = await request(server, "/worldz/oneworldz/");
  assert.equal(oneWorldz.status, 200);
  assert.match(oneWorldz.body, /data-worldz-site="oneworldz"/);
  assert.match(oneWorldz.body, /data-worldz-mode="mission"/);
  assert.match(oneWorldz.body, /assets\/site-router\.js/);

  const xrp = await request(server, "/worldz/xrpworldz/");
  assert.equal(xrp.status, 200);
  assert.match(xrp.body, /data-worldz-site="xrpworldz"/);
  assert.match(xrp.body, /data-worldz-mode="coming-soon"/);
  assert.match(xrp.body, /assets\/site-router\.js/);
});

test("serves registered Worldz domains at root and preserves the Zed host fallback", async (t) => {
  const app = express();
  registerPdcHost(app);
  app.get("/", (req, res) => res.json({ ok: true, service: "fallback" }));
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const pdc = await request(server, "/", { Host: "purplediamondcrew.com" });
  assert.equal(pdc.status, 200);
  assert.match(pdc.body, /data-worldz-site="pdc"/);

  const oneWorldz = await request(server, "/", { Host: "oneworldz.com" });
  assert.equal(oneWorldz.status, 200);
  assert.match(oneWorldz.body, /data-worldz-site="oneworldz"/);
  assert.match(oneWorldz.body, /data-worldz-mode="mission"/);

  const fallback = await request(server, "/", { Host: "cryptobotz.cryptoworldz.xyz" });
  assert.equal(fallback.status, 200);
  assert.match(fallback.body, /fallback/);
});
