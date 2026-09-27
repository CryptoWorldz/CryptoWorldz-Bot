const test=require("node:test");
const assert=require("node:assert/strict");
const {validateRpcUrl}=require("../src/worldz-app/rpc-client");
const {DEFINITIONS,createProviderAdapter}=require("../src/worldz-app/provider-bindings");

test("provider registry covers verified read families",()=>{
  assert.deepEqual(Object.keys(DEFINITIONS).sort(),["base","bnb","ethereum","hyperevm","solana","sui","xrpl"].sort());
});

test("provider bindings remain read-only",()=>{
  const adapter=createProviderAdapter("solana",{env:{WORLDZ_SOLANA_RPC_URL:"https://rpc.example.invalid"}});
  assert.equal(adapter.execution,false);
  assert.equal(adapter.mode,"READ_ONLY");
  assert.equal(Object.hasOwn(adapter.methods,"sendTransaction"),false);
  assert.equal(Object.hasOwn(adapter.methods,"signTransaction"),false);
});

test("provider URL rejects inline credentials and non-http protocols",()=>{
  assert.throws(()=>validateRpcUrl("https://user:secret@example.com"),/INLINE_CREDENTIALS_FORBIDDEN/);
  assert.throws(()=>validateRpcUrl("file:///tmp/rpc"),/PROTOCOL_NOT_ALLOWED/);
  assert.equal(validateRpcUrl("https://example.com/rpc"),"https://example.com/rpc");
});

test("missing provider environment fails closed",async()=>{
  const adapter=createProviderAdapter("xrpl",{env:{}});
  await assert.rejects(()=>adapter.methods.getHealth(),/PROVIDER_NOT_CONFIGURED/);
});
