const test=require("node:test");
const assert=require("node:assert/strict");
const {evmAdapter,solanaAdapter,xrplAdapter,suiAdapter}=require("../src/worldz-app/read-adapters");

function fakeFetch(result){
  return async()=>({ok:true,json:async()=>({jsonrpc:"2.0",id:1,result})});
}

test("EVM adapter validates expected chain id without write methods",async()=>{
  const previous=global.fetch;global.fetch=fakeFetch("0x2105");
  try{
    const adapter=evmAdapter({id:"base",providerUrl:"https://example.invalid",expectedChainId:8453});
    const health=await adapter.methods.getHealth();
    assert.equal(health.state,"READ_OK");
    assert.equal(adapter.execution,false);
    assert.equal(Object.hasOwn(adapter.methods,"sendTransaction"),false);
  }finally{global.fetch=previous}
});

test("Solana adapter reads finalized balance without signing",async()=>{
  const previous=global.fetch;global.fetch=fakeFetch({context:{slot:123},value:456});
  try{
    const adapter=solanaAdapter({providerUrl:"https://example.invalid"});
    const snapshot=await adapter.methods.getBalanceSummary({address:"Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u"});
    assert.equal(snapshot.data.lamports,456);
    assert.equal(adapter.execution,false);
  }finally{global.fetch=previous}
});

test("XRPL and Sui adapters expose read-only contracts",()=>{
  const xrpl=xrplAdapter({providerUrl:"https://example.invalid"});
  const sui=suiAdapter({providerUrl:"https://example.invalid"});
  for(const adapter of [xrpl,sui]){
    assert.equal(adapter.execution,false);
    assert.equal(Object.hasOwn(adapter.methods,"broadcast"),false);
    assert.equal(Object.hasOwn(adapter.methods,"sign"),false);
  }
});
