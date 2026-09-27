const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const appDir=path.join(root,"launchpad.cryptoworldz.xyz","worldz-app");

function readJson(file){return JSON.parse(fs.readFileSync(path.join(appDir,file),"utf8"))}

test("WorldzApp core foundation exists",()=>{
  for(const file of ["index.html","app.js","style.css","config.json","manifest.webmanifest","service-worker.js","core/worldz-app.v1.json","core/capability-registry.json","core/treasury-profiles.json","core/proposal.schema.json","core/worldzproof.schema.json"]){
    assert.equal(fs.existsSync(path.join(appDir,file)),true,file+" missing");
  }
});

test("WorldzApp is deny-by-default and app-level mainnet stays off",()=>{
  const contract=readJson("core/worldz-app.v1.json");
  const capabilities=readJson("core/capability-registry.json");
  assert.equal(capabilities.default,"DENY");
  assert.equal(contract.appSecurity.mainnetBroadcastEnabled,false);
  assert.equal(contract.principles.externalWalletCustody,true);
  assert.equal(contract.principles.onePrivateKeyForAllChains,false);
  assert.equal(contract.principles.noSeedPhraseCollection,true);
  assert.equal(contract.principles.noPrivateKeyCollection,true);
});

test("WorldzMiracleWallet remains 4-of-10 and non-executable from app core",()=>{
  const profiles=readJson("core/treasury-profiles.json");
  const miracle=profiles.profiles.find(profile=>profile.id==="miracle-church");
  assert.ok(miracle);
  assert.equal(miracle.governance.display,"4-of-10");
  assert.equal(miracle.mainnetExecution,false);
  const capabilities=readJson("core/capability-registry.json");
  assert.equal(capabilities.modules.treasury.broadcast_mainnet,false);
  assert.equal(capabilities.modules.treasury.bridge_assets,false);
  assert.equal(capabilities.modules.treasury.change_signers,false);
});

test("Worldz Votes and WorldzGovern remain separate authorities",()=>{
  const contract=readJson("core/worldz-app.v1.json");
  const votes=contract.modules.find(module=>module.id==="votes");
  const govern=contract.modules.find(module=>module.id==="govern");
  assert.equal(votes.authority,"POPULARITY_ONLY");
  assert.equal(govern.authority,"DAO_GOVERNANCE_ONLY");
});

test("WorldzApp shell contains no transaction broadcast function",()=>{
  const js=fs.readFileSync(path.join(appDir,"app.js"),"utf8");
  assert.doesNotMatch(js,/sendTransaction\s*\(/);
  assert.doesNotMatch(js,/signAndSendTransaction\s*\(/);
  assert.doesNotMatch(js,/eth_sendTransaction/);
});
