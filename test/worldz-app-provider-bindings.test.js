const test=require("node:test");
const assert=require("node:assert/strict");
const {validateRpcUrl}=require("../src/worldz-app/rpc-client");
const {DEFINITIONS,resolveProviderUrl,createProviderAdapter}=require("../src/worldz-app/provider-bindings");

function fakeJsonRpc(result){
  return async()=>({ok:true,json:async()=>({jsonrpc:"2.0",id:1,result})});
}

test("provider registry covers all eight WorldzApp chain slots",()=>{
  assert.deepEqual(
    Object.keys(DEFINITIONS).sort(),
    ["base","bnb","ethereum","hyperevm","robinhood","solana","sui","xrpl"].sort()
  );
  assert.equal(DEFINITIONS.base.expectedChainId,8453);
  assert.equal(DEFINITIONS.bnb.expectedChainId,56);
  assert.equal(DEFINITIONS.hyperevm.expectedChainId,999);
  assert.equal(DEFINITIONS.robinhood.expectedChainId,4663);
  assert.equal(DEFINITIONS.sui.transport,"GRAPHQL");
});

test("provider bindings remain read-only",()=>{
  const adapter=createProviderAdapter("solana",{env:{WORLDZ_SOLANA_RPC_URL:"https://rpc.example.invalid"}});
  assert.equal(adapter.execution,false);
  assert.equal(adapter.mode,"READ_ONLY");
  assert.equal(Object.hasOwn(adapter.methods,"sendTransaction"),false);
  assert.equal(Object.hasOwn(adapter.methods,"signTransaction"),false);
  assert.equal(Object.hasOwn(adapter.methods,"broadcast"),false);
});

test("provider URL rejects inline credentials and non-http protocols",()=>{
  assert.throws(()=>validateRpcUrl("https://user:secret@example.com"),/INLINE_CREDENTIALS_FORBIDDEN/);
  assert.throws(()=>validateRpcUrl("file:///tmp/rpc"),/PROTOCOL_NOT_ALLOWED/);
  assert.equal(validateRpcUrl("https://example.com/rpc"),"https://example.com/rpc");
});

test("missing production provider fails closed",async()=>{
  const adapter=createProviderAdapter("xrpl",{env:{}});
  await assert.rejects(()=>adapter.methods.getHealth(),/PROVIDER_NOT_CONFIGURED/);
});

test("public verification endpoint is opt-in only",()=>{
  assert.throws(()=>resolveProviderUrl(DEFINITIONS.base,{}),/PROVIDER_NOT_CONFIGURED/);
  assert.equal(
    resolveProviderUrl(DEFINITIONS.base,{WORLDZAPP_ALLOW_PUBLIC_VERIFY:"1"}),
    "https://mainnet.base.org"
  );
});

test("EVM health reports chain mismatch instead of READ_OK",async()=>{
  const previous=global.fetch;
  global.fetch=fakeJsonRpc("0x1");
  try{
    const adapter=createProviderAdapter("base",{env:{WORLDZ_BASE_RPC_URL:"https://example.invalid"}});
    const snapshot=await adapter.methods.getHealth();
    assert.equal(snapshot.state,"CHAIN_ID_MISMATCH");
    assert.equal(snapshot.data.chainId,1);
    assert.equal(snapshot.data.expectedChainId,8453);
  }finally{global.fetch=previous}
});

test("XRPL nested result errors are rejected",async()=>{
  const previous=global.fetch;
  global.fetch=async()=>({
    ok:true,
    json:async()=>({jsonrpc:"2.0",id:1,result:{status:"error",error:"actNotFound",error_message:"Account not found"}})
  });
  try{
    const adapter=createProviderAdapter("xrpl",{env:{WORLDZ_XRPL_RPC_URL:"https://example.invalid"}});
    await assert.rejects(
      ()=>adapter.methods.getAccountSummary({address:"rExample"}),
      /WORLDZAPP_XRPL_RPC_actNotFound/
    );
  }finally{global.fetch=previous}
});

test("Sui uses GraphQL health transport",async()=>{
  const previous=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>({data:{chainIdentifier:"sui-mainnet"}})});
  try{
    const adapter=createProviderAdapter("sui",{env:{WORLDZ_SUI_GRAPHQL_URL:"https://example.invalid/graphql"}});
    const snapshot=await adapter.methods.getHealth();
    assert.equal(snapshot.state,"READ_OK");
    assert.equal(snapshot.data.chainIdentifier,"sui-mainnet");
    assert.equal(snapshot.data.transport,"GRAPHQL");
  }finally{global.fetch=previous}
});

test("Solana balance reads use external public address without signing",async()=>{
  const previous=global.fetch;
  global.fetch=async()=>({
    ok:true,
    json:async()=>({jsonrpc:"2.0",id:1,result:{context:{slot:123},value:456}})
  });
  try{
    const adapter=createProviderAdapter("solana",{env:{WORLDZ_SOLANA_RPC_URL:"https://example.invalid"}});
    const snapshot=await adapter.methods.getBalanceSummary({address:"Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u"});
    assert.equal(snapshot.data.balanceLamports,456);
    assert.equal(snapshot.data.contextSlot,123);
    assert.equal(adapter.execution,false);
  }finally{global.fetch=previous}
});
