"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");

const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const json=(p)=>JSON.parse(read(p));

test("WorldzLaunchPad new-launch economics are Fee Flow V2",()=>{
  const p=json("launchpad.cryptoworldz.xyz/platform-config.json");
  assert.deepEqual(p.feePolicy.worldzLaunchPadContributionChoicesPercent,[3,5,8]);
  assert.equal(p.feePolicy.worldzLaunchPadContributionDefaultPercent,5);
  assert.equal(p.feePolicy.legacyCorePercent,15);
  assert.equal(p.feePolicy.legacyCoreTokenCount,12);
  assert.equal(p.feePolicy.legacyCoreEqualPerTokenPercent,1.25);
  assert.equal(p.feePolicy.coreFamilyMarketBuyPercent,12);
  assert.deepEqual(p.feePolicy.coreFamilySymbols,["WLDZ","RVIV","PNEX","MRCL"]);
  assert.equal(p.feePolicy.worldzLaunchPadShareOfTokenSupplyPercent,0);
  assert.equal(p.feePolicy.worldzLaunchPadShareOfInitialLiquidityPercent,0);
  assert.equal(p.feePolicy.walletTransferTaxPercent,0);
});

test("public LaunchPad builder uses locked V2 choice and no stale 90/10 public copy",()=>{
  const home=read("launchpad.cryptoworldz.xyz/index.html");
  const app=read("launchpad.cryptoworldz.xyz/app.js");
  assert.match(home,/3% • 5% • 8%/);
  assert.match(home,/Legacy Core/);
  assert.match(home,/WLDZ • RVIV • PNEX • MRCL/);
  assert.match(app,/WORLDZ-FEE-FLOW-V2/);
  assert.match(app,/selectedLaunchPadContribution/);
  assert.doesNotMatch(home,/10% Worldz • 90% project/);
  assert.doesNotMatch(home,/90% remains for your project routing/);
});

test("Launch Station supports mint-new and read-only existing-mint intake",()=>{
  const page=read("launchpad.cryptoworldz.xyz/launch-station/index.html");
  assert.match(page,/WORLDZ LAUNCH STATION/);
  assert.match(page,/Mint New/);
  assert.match(page,/Import Existing Mint/);
  assert.match(page,/getAccountInfo/);
  assert.match(page,/getTokenSupply/);
  assert.match(page,/No transaction was attempted|No transaction was created/);
  assert.match(page,/PHENIX/);
  assert.match(page,/PNEX/);
});

test("WorldzLaunch community contains real Worldz and Pump Squad surfaces",()=>{
  const page=read("launchpad.cryptoworldz.xyz/community/index.html");
  assert.match(page,/TheChaos/);
  assert.match(page,/https:\/\/join\.pump\.fun\/HSag\/rwtn4stv/);
  assert.match(page,/DipShitBossBot/);
  assert.match(page,/Command Centre MAX/);
  assert.match(page,/CryptoWLDZ/);
  assert.match(page,/@WorldzLaunchPad/);
});

test("integration rail uses official X architecture and no undocumented Pump API",()=>{
  const x=json("worldzpad-omnichain/integrations/x-api.v1.json");
  const pump=json("worldzpad-omnichain/integrations/pump.v1.json");
  assert.equal(x.api,"X API v2");
  assert.equal(x.status,"ARCHITECTURE_READY__LIVE_ACTIONS_REQUIRE_OFFICIAL_X_CREDENTIALS_AND_USAGE_CREDITS");
  assert.equal(pump.squad.name,"TheChaos");
  assert.equal(pump.squad.joinUrl,"https://join.pump.fun/HSag/rwtn4stv");
  assert.equal(pump.unsupported.includes("undocumented_private_api_dependency"),true);
});

test("PNEX is the canonical PHENIX ticker and no mint is invented",()=>{
  const p=json("worldzpad-mainnet/phenix/phenix.v1.json");
  assert.equal(p.token.name,"PHENIX");
  assert.equal(p.token.symbol,"PNEX");
  assert.equal(p.token.canonicalMint,null);
  assert.equal(p.worldzLaunchPadTestPlan.canonicalTicker,"PNEX");
  assert.equal(p.worldzLaunchPadTestPlan.noMintMayBeInvented,true);
  assert.equal(p.worldzLaunchPadTestPlan.automaticMainnetBroadcast,false);
});

test("WorldzLaunch.com migration stays prepared but not falsely live",()=>{
  const d=json("launchpad.cryptoworldz.xyz/.well-known/worldzlaunch-domain-plan.json");
  assert.equal(d.futurePrimaryHost,"worldzlaunch.com");
  assert.equal(d.futureHostStatus,"NOT_OWNED_OR_LIVE_YET");
  assert.equal(d.migrationReady,true);
});

test("readiness contract distinguishes public readiness from mainnet market execution",()=>{
  const r=json("launchpad.cryptoworldz.xyz/.well-known/worldzlaunch-readiness.json");
  assert.equal(r.status,"PUBLIC_PRODUCT_READY__MAINNET_MARKET_EXECUTION_GATED");
  assert.equal(r.nextWorldzTest.symbol,"PNEX");
  assert.equal(r.nextWorldzTest.canonicalMint,null);
  assert.equal(r.launchPaths.solanaMainnetMarket.status,"GATED");
  assert.equal(r.community.pumpSquad.name,"TheChaos");
});
