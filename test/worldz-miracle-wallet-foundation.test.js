const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const appDir=path.join(root,"launchpad.cryptoworldz.xyz","miracle-wallet");

test("WorldzMiracleWallet foundation files exist",()=>{
  for(const file of ["index.html","app.js","style.css","config.json","manifest.webmanifest","service-worker.js"]){
    assert.equal(fs.existsSync(path.join(appDir,file)),true,file+" missing");
  }
});

test("Miracle treasury app config keeps owner-approved 4-of-8 policy",()=>{
  const config=JSON.parse(fs.readFileSync(path.join(appDir,"config.json"),"utf8"));
  assert.equal(config.miracleTreasury.allocationPercent,20);
  assert.equal(config.miracleTreasury.threshold,4);
  assert.equal(config.miracleTreasury.signerCount,8);
  assert.equal(config.miracleTreasury.governance,"4-of-8");
  assert.equal(config.safety.mainnetBroadcastEnabled,false);
  assert.equal(config.safety.collectSeedPhrase,false);
  assert.equal(config.safety.collectPrivateKey,false);
});

test("app foundation is explicit about non-custodial and no-mainnet state",()=>{
  const html=fs.readFileSync(path.join(appDir,"index.html"),"utf8");
  const js=fs.readFileSync(path.join(appDir,"app.js"),"utf8");
  assert.match(html,/NON-CUSTODIAL/);
  assert.match(html,/Mainnet broadcast:\s*<b>OFF<\/b>/);
  assert.match(js,/DISABLED_FOUNDATION_MODE/);
  assert.doesNotMatch(js,/sendTransaction\s*\(/);
});
