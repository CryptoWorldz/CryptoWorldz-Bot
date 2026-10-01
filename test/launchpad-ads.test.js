const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("Worldz Spotlight keeps low-cost AUD packages and human approval before payment",()=>{
  const edge=read("supabase/functions/worldz-launchpad-ads/index.ts");
  const page=read("launchpad.cryptoworldz.xyz/advertise/index.html");
  for(const price of ["A$5","A$12","A$22","A$75"]) assert.match(page,new RegExp(price.replace("$","\\$")));
  assert.match(edge,/pending_review/);
  assert.match(edge,/AFTER_HUMAN_APPROVAL/);
  assert.match(page,/No payment is due yet/);
});

test("Spotlight receipt flow cannot activate itself",()=>{
  const edge=read("supabase/functions/worldz-launchpad-ads/index.ts");
  assert.match(edge,/action === "receipt"/);
  assert.match(edge,/status: "payment_review"/);
  assert.doesNotMatch(edge,/status: "active"/);
  assert.match(edge,/signature_already_used/);
});

test("ZED owner controls verify finalized SOL or USDC before activation",()=>{
  const src=read("src/launchpad-ads.js");
  assert.match(src,/verifySolanaContribution/);
  assert.match(src,/status !== "payment_review"/);
  assert.match(src,/received \+ tolerance < due/);
  assert.match(src,/status: "active"/);
  assert.match(src,/payment_verified_at/);
  assert.match(src,/WORLDZ_OPERATIONS_TREASURY_ADDRESS/);
});

test("Spotlight ad table exposes protected ZED runtime RLS only",()=>{
  const sql=read("supabase/migrations/20261002073500_worldz_launchpad_ad_payment_flow.sql");
  assert.match(sql,/zed_runtime_authorized\(\)/);
  assert.match(sql,/to anon/);
  assert.match(sql,/revoke all[\s\S]*from authenticated/i);
  assert.match(sql,/payment_review/);
  assert.match(sql,/payment_signature_unique/);
});

test("ZED runtime registers Spotlight owner controls",()=>{
  const runtime=read("src/full-runtime-entry.js");
  const registry=read("src/command-registry.js");
  assert.match(runtime,/registerLaunchpadAds/);
  for(const cmd of ["launchads","launchadapprove","launchadreject","launchadactivate"]) assert.match(registry,new RegExp(cmd));
});
