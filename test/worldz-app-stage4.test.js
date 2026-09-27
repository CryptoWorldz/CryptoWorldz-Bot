"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

const contract=require("../src/worldz-app/simulation-adapter-contract");
const adapters=require("../src/worldz-app/simulation-adapters");

test("Stage 4A simulation adapter contract rejects signing and broadcast",()=>{
  assert.equal(contract.assertSimulationOnlyHandlers({simulateUnsigned:async()=>true}),true);
  assert.throws(()=>contract.assertSimulationOnlyHandlers({signTransaction:async()=>true}),/FORBIDDEN_METHOD/);
  assert.throws(()=>contract.assertSimulationOnlyHandlers({broadcast:async()=>true}),/FORBIDDEN_METHOD/);
});

test("Stage 4A Solana adapter uses simulateTransaction without execution",async()=>{
  const calls=[];
  const rpc=async(_url,method,params)=>{
    calls.push({method,params});
    return {context:{slot:123},value:{err:null,logs:["ok"],unitsConsumed:777,fee:5000}};
  };
  const result=await adapters.simulateSolanaUnsigned({
    rpcUrl:"https://api.mainnet.solana.com",
    proposalId:"proposal-sol-001",
    simulationId:"simulation-sol-001",
    unsignedPayloadHash:"hash-sol",
    encodedTransactionBase64:"AQID",
    effects:[{type:"TRANSFER",summary:"Review-only transfer",asset:"SOL",amount:"0",destination:"Example"}]
  },{rpc});
  assert.equal(calls[0].method,"simulateTransaction");
  assert.equal(calls[0].params[1].sigVerify,false);
  assert.equal(calls[0].params[1].replaceRecentBlockhash,true);
  assert.equal(result.simulation.state,"SIMULATED");
  assert.equal(result.simulation.signatureRequested,false);
  assert.equal(result.simulation.broadcast,false);
  assert.equal(result.diagnostics.rpcExecution,false);
});

test("Stage 4A EVM adapter checks chain ID and uses non-broadcast methods",async()=>{
  const methods=[];
  const rpc=async(_url,method)=>{
    methods.push(method);
    if(method==="eth_chainId") return "0x2105";
    if(method==="eth_call") return "0x";
    if(method==="eth_estimateGas") return "0x5208";
    throw new Error("unexpected");
  };
  const result=await adapters.simulateEvmUnsigned({
    rpcUrl:"https://mainnet.base.org",
    proposalId:"proposal-evm-001",
    simulationId:"simulation-evm-001",
    chain:"base",
    network:"mainnet",
    expectedChainId:8453,
    unsignedPayloadHash:"hash-evm",
    call:{to:"0x0000000000000000000000000000000000000001",value:"0x0"},
    effects:[{type:"CALL",summary:"Review-only EVM call"}]
  },{rpc});
  assert.deepEqual(methods,["eth_chainId","eth_call","eth_estimateGas"]);
  assert.equal(result.simulation.state,"SIMULATED");
  assert.equal(result.simulation.feeEstimate,"21000");
  assert.equal(result.simulation.broadcast,false);
  assert.equal(result.diagnostics.rpcExecution,false);
});

test("Stage 4A EVM adapter fails closed on wrong network",async()=>{
  const rpc=async(_url,method)=>method==="eth_chainId"?"0x1":"0x";
  await assert.rejects(()=>adapters.simulateEvmUnsigned({
    rpcUrl:"https://mainnet.base.org",
    proposalId:"proposal-evm-002",
    simulationId:"simulation-evm-002",
    chain:"base",
    network:"mainnet",
    expectedChainId:8453,
    unsignedPayloadHash:"hash-evm",
    call:{to:"0x0000000000000000000000000000000000000001"},
    effects:[{type:"CALL",summary:"Review-only EVM call"}]
  },{rpc}),/CHAIN_ID_MISMATCH/);
});
