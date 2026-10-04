const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("Worldz Spotlight keeps low-cost AUD packages and automation before payment",()=>{
  const edge=read("supabase/functions/worldz-launchpad-ads/index.ts");
  const page=read("launchpad.cryptoworldz.xyz/advertise/index.html");
  for(const price of ["A$5","A$12","A$22","A$75"]) assert.match(page,new RegExp(price.replace("$","\\$")));
  assert.match(edge,/status: "auto_check"/);
  assert.match(edge,/AFTER_WORLDZ_VALIDATION/);
  assert.match(page,/No payment is requested until Worldz validation passes/);
  assert.doesNotMatch(page,/PENDING HUMAN REVIEW/);
});

test("Spotlight receipt flow queues automatic on-chain verification",()=>{
  const edge=read("supabase/functions/worldz-launchpad-ads/index.ts");
  assert.match(edge,/action === "receipt"/);
  assert.match(edge,/status: "payment_review"/);
  assert.doesNotMatch(edge,/status: "active"/);
  assert.match(edge,/signature_already_used/);
  assert.match(edge,/automatic on-chain verification/i);
});

test("ZED runtime automatically validates content, quotes USDC and activates verified payment",()=>{
  const src=read("src/launchpad-ads.js");
  assert.match(src,/moderateSpotlight/);
  assert.match(src,/omni-moderation-latest/);
  assert.match(src,/audUsdRate/);
  assert.match(src,/Frankfurter AUD\/USD/);
  assert.match(src,/payment_currency: "USDC"/);
  assert.match(src,/verifySolanaContribution/);
  assert.match(src,/status: "active"/);
  assert.match(src,/payment_verified_at/);
  assert.match(src,/WORLDZ_OPERATIONS_TREASURY_ADDRESS/);
  assert.match(src,/setInterval\(\(\) => \{ void reconcile\(\); \}, 60_000\)/);
});

test("Spotlight automation migration supports holds, automatic rejection and quote proof",()=>{
  const sql=read("supabase/migrations/20261004_spotlight_zero_admin_automation.sql");
  assert.match(sql,/auto_check/);
  assert.match(sql,/deferred_auto/);
  assert.match(sql,/auto_rejected/);
  assert.match(sql,/quote_fx_rate/);
  assert.match(sql,/automation_checked_at/);
});

test("ZED runtime exposes Spotlight status and automatic recheck, not manual approval commands",()=>{
  const runtime=read("src/full-runtime-entry.js");
  const registry=read("src/command-registry.js");
  assert.match(runtime,/registerLaunchpadAds\(\{ bot, config, supabase, repository \}\)/);
  assert.match(registry,/launchads/);
  assert.match(registry,/recheckad/);
  for(const retired of ["launchadapprove","launchadreject","launchadactivate"]) assert.doesNotMatch(registry,new RegExp(retired));
});
