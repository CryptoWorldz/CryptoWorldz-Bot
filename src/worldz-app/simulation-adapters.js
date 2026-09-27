"use strict";

const {jsonRpc}=require("./rpc-client");
const {createSimulationResult}=require("./simulation-contract");

function requireEffects(effects){
  if(!Array.isArray(effects) || effects.length===0) throw new Error("WORLDZAPP_SIMULATION_EFFECTS_REQUIRED_BEFORE_RPC");
  return effects;
}

function rpcLabel(rpcUrl,label){
  return label || new URL(String(rpcUrl)).host;
}

async function simulateSolanaUnsigned(input={},options={}){
  const {
    rpcUrl,proposalId,simulationId,network="mainnet-beta",unsignedPayloadHash,
    encodedTransactionBase64,effects,providerLabel,treasuryProfile=null
  }=input;
  if(!rpcUrl || !encodedTransactionBase64) throw new Error("WORLDZAPP_SOLANA_SIMULATION_RPC_AND_UNSIGNED_TX_REQUIRED");
  requireEffects(effects);
  const rpc=options.rpc||jsonRpc;
  const result=await rpc(rpcUrl,"simulateTransaction",[
    String(encodedTransactionBase64),
    {
      encoding:"base64",
      sigVerify:false,
      replaceRecentBlockhash:true,
      commitment:"confirmed",
      innerInstructions:true
    }
  ]);
  if(!result || !result.value) throw new Error("WORLDZAPP_SOLANA_SIMULATION_RESULT_INVALID");
  const failed=result.value.err!=null;
  const warnings=[];
  if(Array.isArray(result.value.logs) && result.value.logs.length===0) warnings.push("NO_SIMULATION_LOGS_RETURNED");
  return Object.freeze({
    simulation:createSimulationResult({
      simulationId,proposalId,chain:"solana",network,treasuryProfile,unsignedPayloadHash,
      provider:rpcLabel(rpcUrl,providerLabel),
      state:failed?"FAILED":"SIMULATED",
      effects:failed?[]:effects,
      feeEstimate:result.value.fee==null?null:String(result.value.fee),
      warnings,
      blockReference:result.context&&result.context.slot!=null?"slot:"+String(result.context.slot):null
    }),
    diagnostics:Object.freeze({
      transport:"JSON_RPC_HTTP",
      method:"simulateTransaction",
      rpcExecution:false,
      unitsConsumed:result.value.unitsConsumed==null?null:String(result.value.unitsConsumed),
      error:failed?result.value.err:null,
      logCount:Array.isArray(result.value.logs)?result.value.logs.length:null
    })
  });
}

function normalizeEvmCall(call){
  if(!call || typeof call!=="object") throw new TypeError("WORLDZAPP_EVM_SIMULATION_CALL_REQUIRED");
  const allowed=["from","to","gas","gasPrice","maxFeePerGas","maxPriorityFeePerGas","value","data","nonce"];
  const out={};
  for(const key of allowed) if(call[key]!=null) out[key]=String(call[key]);
  if(!out.to && !out.data) throw new Error("WORLDZAPP_EVM_SIMULATION_TO_OR_DATA_REQUIRED");
  return Object.freeze(out);
}

async function simulateEvmUnsigned(input={},options={}){
  const {
    rpcUrl,proposalId,simulationId,chain="ethereum",network,unsignedPayloadHash,
    call,effects,providerLabel,treasuryProfile=null,expectedChainId=null
  }=input;
  if(!rpcUrl || !network) throw new Error("WORLDZAPP_EVM_SIMULATION_RPC_AND_NETWORK_REQUIRED");
  requireEffects(effects);
  const rpc=options.rpc||jsonRpc;
  const tx=normalizeEvmCall(call);
  const chainIdHex=await rpc(rpcUrl,"eth_chainId",[]);
  const chainId=parseInt(String(chainIdHex),16);
  if(expectedChainId!=null && chainId!==Number(expectedChainId)) throw new Error("WORLDZAPP_EVM_SIMULATION_CHAIN_ID_MISMATCH");
  let callResult=null,gasEstimate=null,state="SIMULATED",failure=null;
  try{
    callResult=await rpc(rpcUrl,"eth_call",[tx,"pending"]);
    gasEstimate=await rpc(rpcUrl,"eth_estimateGas",[tx,"pending"]);
  }catch(error){
    state="FAILED";
    failure=String(error&&error.message||error);
  }
  return Object.freeze({
    simulation:createSimulationResult({
      simulationId,proposalId,chain,network,treasuryProfile,unsignedPayloadHash,
      provider:rpcLabel(rpcUrl,providerLabel),
      state,
      effects:state==="SIMULATED"?effects:[],
      feeEstimate:gasEstimate==null?null:String(parseInt(String(gasEstimate),16)),
      warnings:failure?[failure]:[],
      blockReference:"chainId:"+String(chainId)
    }),
    diagnostics:Object.freeze({
      transport:"JSON_RPC_HTTP",
      methods:["eth_call","eth_estimateGas"],
      rpcExecution:false,
      chainId,
      callReturn:callResult,
      failure
    })
  });
}

module.exports={requireEffects,normalizeEvmCall,simulateSolanaUnsigned,simulateEvmUnsigned};
