"use strict";

const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const {simulateSolanaUnsigned,simulateEvmUnsigned}=require("../src/worldz-app/simulation-adapters");

const SOLANA_DOCS_FIXTURE="AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEEjNmKiZGiOtSZ+g0//wH5kEQo3+UzictY+KlLV8hjXcs44M/Xnr+1SlZsqS6cFMQc46yj9PIsxqkycxJmXT+veJjIvefX4nhY9rY+B5qreeqTHu4mG6Xtxr5udn4MN8PnBt324e51j94YQl285GzN2rYa/E2DuQ0n/r35KNihi/zamQ6EeyeeVDvPVgUO2W3Lgt9hT+CfyqHvIa11egFPCgEDAwIBAAkDZAAAAAAAAAA=";
const sha256=value=>crypto.createHash("sha256").update(String(value)).digest("hex");

function loadBindings(){
  const file=path.resolve(__dirname,"../launchpad.cryptoworldz.xyz/worldz-app/core/provider-bindings.json");
  return JSON.parse(fs.readFileSync(file,"utf8")).bindings;
}

function safeError(error){
  return String(error&&error.message||error).replace(/https?:\/\/[^\s]+/g,"<endpoint-redacted>");
}

async function proveSolana(){
  const rpcUrl=process.env.WORLDZ_SOLANA_SIMULATION_RPC_URL||"https://api.devnet.solana.com";
  const result=await simulateSolanaUnsigned({
    rpcUrl,
    proposalId:"worldzapp-stage4b-solana-fixture",
    simulationId:"simulation-stage4b-solana",
    network:"devnet",
    unsignedPayloadHash:sha256(SOLANA_DOCS_FIXTURE),
    encodedTransactionBase64:SOLANA_DOCS_FIXTURE,
    providerLabel:"SOLANA_DEVNET_PUBLIC_VERIFY",
    effects:[{
      type:"SIMULATION_FIXTURE",
      summary:"Official Solana documentation transaction simulated only; no transaction is broadcast.",
      asset:"FIXTURE",
      amount:"0",
      destination:"NO_BROADCAST"
    }]
  });
  if(result.simulation.state!=="SIMULATED") throw new Error("WORLDZAPP_STAGE4B_SOLANA_SIMULATION_FAILED");
  if(result.simulation.signatureRequested!==false||result.simulation.broadcast!==false||result.diagnostics.stateMutation!==false){
    throw new Error("WORLDZAPP_STAGE4B_SOLANA_SAFETY_BOUNDARY_FAILED");
  }
  return {
    chain:"solana",
    network:"devnet",
    state:"PASS",
    method:result.diagnostics.method,
    unitsConsumed:result.diagnostics.unitsConsumed,
    logCount:result.diagnostics.logCount,
    blockReference:result.simulation.blockReference,
    fixtureSha256:sha256(SOLANA_DOCS_FIXTURE),
    signatureRequested:false,
    broadcast:false,
    stateMutation:false
  };
}

async function proveEvm(binding){
  const envUrl=process.env[binding.env||""];
  const rpcUrl=envUrl||binding.publicVerificationEndpoint;
  if(!rpcUrl) return {chain:binding.chain,state:"SKIP",reason:"NO_PUBLIC_OR_ENV_VERIFY_ENDPOINT"};
  const zeroCall={
    to:"0x000000000000000000000000000000000000dEaD",
    value:"0x0",
    data:"0x"
  };
  const result=await simulateEvmUnsigned({
    rpcUrl,
    proposalId:"worldzapp-stage4b-"+binding.chain+"-fixture",
    simulationId:"simulation-stage4b-"+binding.chain,
    chain:binding.chain,
    network:"mainnet",
    expectedChainId:binding.expectedChainId,
    unsignedPayloadHash:sha256(JSON.stringify(zeroCall)),
    call:zeroCall,
    providerLabel:(binding.chain||"evm").toUpperCase()+"_PUBLIC_VERIFY",
    effects:[{
      type:"ZERO_VALUE_CALL",
      summary:"Zero-value EVM dry-run to a non-Worldz address; eth_call/estimateGas only and no transaction broadcast.",
      asset:"NATIVE",
      amount:"0",
      destination:zeroCall.to
    }]
  });
  if(result.simulation.state!=="SIMULATED") throw new Error("WORLDZAPP_STAGE4B_EVM_SIMULATION_FAILED:"+binding.chain);
  if(result.simulation.signatureRequested!==false||result.simulation.broadcast!==false||result.diagnostics.stateMutation!==false){
    throw new Error("WORLDZAPP_STAGE4B_EVM_SAFETY_BOUNDARY_FAILED:"+binding.chain);
  }
  return {
    chain:binding.chain,
    network:"mainnet",
    state:"PASS",
    methods:result.diagnostics.methods,
    chainId:result.diagnostics.chainId,
    gasEstimate:result.simulation.feeEstimate,
    callFixtureSha256:sha256(JSON.stringify(zeroCall)),
    signatureRequested:false,
    broadcast:false,
    stateMutation:false
  };
}

(async()=>{
  const proof={
    schema:"WORLDZ-APP-STAGE4B-LIVE-SIMULATION-PROOF-V1",
    generatedAt:new Date().toISOString(),
    execution:false,
    signing:false,
    broadcast:false,
    results:[]
  };

  try{
    proof.results.push(await proveSolana());
  }catch(error){
    proof.results.push({chain:"solana",state:"FAIL",error:safeError(error)});
  }

  const bindings=loadBindings().filter(item=>item.family==="EVM");
  for(const binding of bindings){
    try{
      proof.results.push(await proveEvm(binding));
    }catch(error){
      proof.results.push({chain:binding.chain,state:"FAIL",error:safeError(error)});
    }
  }

  const required=["solana","base","bnb","hyperevm","robinhood"];
  const byChain=Object.fromEntries(proof.results.map(item=>[item.chain,item]));
  const missing=required.filter(chain=>!byChain[chain]||byChain[chain].state!=="PASS");
  proof.requiredPassed=missing.length===0;
  proof.requiredChains=required;
  proof.missingRequired=missing;
  proof.ethereumState=byChain.ethereum?.state||"SKIP";

  const canonical=JSON.stringify(proof,null,2)+"\n";
  fs.writeFileSync("worldzapp-stage4b-live-simulation-proof.json",canonical);
  console.log(canonical.trim());
  console.log("WORLDZAPP_STAGE4B_PROOF_SHA256="+sha256(canonical));
  console.log("WORLDZAPP_STAGE4B_REQUIRED="+(proof.requiredPassed?"PASS":"FAIL"));
  if(!proof.requiredPassed) process.exit(1);
})().catch(error=>{
  console.error("WORLDZAPP_STAGE4B_FATAL="+safeError(error));
  process.exit(1);
});
