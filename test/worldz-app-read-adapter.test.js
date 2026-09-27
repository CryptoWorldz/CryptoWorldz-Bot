const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const contract=require("../src/worldz-app/read-adapter-contract");

const root=path.resolve(__dirname,"..");
const core=path.join(root,"launchpad.cryptoworldz.xyz","worldz-app","core");

test("WorldzApp read registry is read-only across every adapter",()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(core,"read-adapter-registry.json"),"utf8"));
  assert.equal(registry.mode,"READ_ONLY");
  assert.ok(registry.adapters.length>=8);
  for(const adapter of registry.adapters) assert.equal(adapter.execution,false);
  for(const method of ["signTransaction","sendTransaction","broadcast","bridge","swap","changeSigner"]){
    assert.ok(registry.forbiddenMethods.includes(method));
  }
});

test("read adapter contract rejects signing and unknown methods",()=>{
  assert.throws(
    ()=>contract.createReadAdapter({id:"solana",family:"SOLANA"},{sendTransaction(){}}),
    /FORBIDDEN_METHOD/
  );
  assert.throws(
    ()=>contract.createReadAdapter({id:"solana",family:"SOLANA"},{doMagic(){}}),
    /UNKNOWN_METHOD/
  );
});

test("read adapter contract accepts read handlers only",()=>{
  const adapter=contract.createReadAdapter(
    {id:"solana",family:"SOLANA"},
    {getHealth:async()=>({ok:true}),getBalanceSummary:async()=>({})}
  );
  assert.equal(adapter.mode,"READ_ONLY");
  assert.equal(adapter.execution,false);
  assert.equal(typeof adapter.methods.getHealth,"function");
});

test("WorldzApp storage policy forbids custody secrets",()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(core,"storage-policy.json"),"utf8"));
  const forbidden=policy.forbiddenEverywhere.join(" ").toLowerCase();
  assert.match(forbidden,/seed phrase/);
  assert.match(forbidden,/private key/);
  assert.match(forbidden,/recovery phrase/);
  assert.match(forbidden,/hardware-wallet secret/);
});

test("read snapshot contains observation state but no execution authority",()=>{
  const snapshot=contract.createReadSnapshot({adapterId:"xrpl",chain:"xrpl",data:{balance:"0"}});
  assert.equal(snapshot.schema,"WORLDZ-APP-READ-SNAPSHOT-V1");
  assert.equal(snapshot.chain,"xrpl");
  assert.equal(snapshot.state,"READ_OK");
  assert.equal(Object.hasOwn(snapshot,"execution"),false);
});


test("WorldzApp browser shell parses after provider binding changes",()=>{
  const vm=require("node:vm");
  const shell=fs.readFileSync(path.join(root,"launchpad.cryptoworldz.xyz","worldz-app","app.js"),"utf8");
  assert.doesNotThrow(()=>new vm.Script(shell,{filename:"worldz-app/app.js"}));
});
