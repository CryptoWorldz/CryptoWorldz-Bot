"use strict";

const {assertNoSecrets}=require("./session-contract");

const SIMULATION_STATES=Object.freeze(["SIMULATED","FAILED"]);

function normalizeEffects(effects=[]){
  if(!Array.isArray(effects) || effects.length===0) throw new Error("WORLDZAPP_SIMULATION_EFFECTS_REQUIRED");
  return effects.map((effect,index)=>{
    if(!effect || typeof effect!=="object") throw new TypeError("WORLDZAPP_SIMULATION_EFFECT_INVALID:"+index);
    assertNoSecrets(effect,"simulation.effects["+index+"]");
    const type=String(effect.type||"").trim();
    const summary=String(effect.summary||"").trim();
    if(!type || !summary) throw new Error("WORLDZAPP_SIMULATION_EFFECT_PUBLIC_FIELDS_REQUIRED:"+index);
    return Object.freeze({type,summary,asset:effect.asset==null?null:String(effect.asset),amount:effect.amount==null?null:String(effect.amount),destination:effect.destination==null?null:String(effect.destination)});
  });
}

function createSimulationResult({
  simulationId,
  proposalId,
  chain,
  network,
  treasuryProfile=null,
  unsignedPayloadHash,
  provider,
  state,
  effects,
  feeEstimate=null,
  warnings=[],
  simulatedAt=new Date().toISOString(),
  blockReference=null,
  execution=false,
  broadcast=false
}={}){
  if(execution===true || broadcast===true) throw new Error("WORLDZAPP_SIMULATION_CANNOT_EXECUTE_OR_BROADCAST");
  if(!simulationId || String(simulationId).length<8) throw new Error("WORLDZAPP_SIMULATION_ID_REQUIRED");
  if(!proposalId || !chain || !network || !unsignedPayloadHash || !provider) throw new Error("WORLDZAPP_SIMULATION_PUBLIC_FIELDS_REQUIRED");
  const normalizedState=String(state||"").toUpperCase();
  if(!SIMULATION_STATES.includes(normalizedState)) throw new Error("WORLDZAPP_SIMULATION_STATE_INVALID");
  if(!Array.isArray(warnings)) throw new TypeError("WORLDZAPP_SIMULATION_WARNINGS_ARRAY_REQUIRED");
  const result={
    schema:"WORLDZ-APP-SIMULATION-V1",
    simulationId:String(simulationId),
    proposalId:String(proposalId),
    chain:String(chain),
    network:String(network),
    treasuryProfile:treasuryProfile==null?null:String(treasuryProfile),
    unsignedPayloadHash:String(unsignedPayloadHash),
    provider:String(provider),
    state:normalizedState,
    effects:normalizedState==="SIMULATED"?normalizeEffects(effects):Array.isArray(effects)&&effects.length?normalizeEffects(effects):[],
    feeEstimate:feeEstimate==null?null:String(feeEstimate),
    warnings:warnings.map(String),
    simulatedAt:String(simulatedAt),
    blockReference:blockReference==null?null:String(blockReference),
    execution:false,
    broadcast:false,
    signatureRequested:false
  };
  assertNoSecrets(result,"simulation");
  return Object.freeze(result);
}

function createHumanReviewGate(simulation,{acknowledgedEffectIndexes=[]}={}){
  if(!simulation || simulation.schema!=="WORLDZ-APP-SIMULATION-V1") throw new Error("WORLDZAPP_SIMULATION_RESULT_REQUIRED");
  if(simulation.state!=="SIMULATED") throw new Error("WORLDZAPP_SIMULATION_SUCCESS_REQUIRED_FOR_REVIEW");
  const acknowledged=new Set((acknowledgedEffectIndexes||[]).map(Number));
  const allEffectsAcknowledged=simulation.effects.every((_,index)=>acknowledged.has(index));
  return Object.freeze({
    schema:"WORLDZ-APP-HUMAN-REVIEW-GATE-V1",
    simulationId:simulation.simulationId,
    proposalId:simulation.proposalId,
    allEffectsAcknowledged,
    signatureAllowed:false,
    broadcastAllowed:false,
    nextGate:allEffectsAcknowledged?"SIGNATURE_REQUEST_STILL_SEPARATELY_GATED":"HUMAN_EFFECT_REVIEW_REQUIRED"
  });
}

module.exports={SIMULATION_STATES,normalizeEffects,createSimulationResult,createHumanReviewGate};
