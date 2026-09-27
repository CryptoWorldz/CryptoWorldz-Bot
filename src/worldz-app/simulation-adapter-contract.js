"use strict";

const ALLOWED_METHODS=Object.freeze(["simulateUnsigned"]);
const FORBIDDEN_METHODS=Object.freeze([
  "sign","signMessage","signTransaction","sendTransaction","signAndSendTransaction",
  "broadcast","bridge","swap","stake","changeSigner","requestSeedPhrase","requestPrivateKey"
]);

function assertSimulationOnlyHandlers(handlers={}){
  for(const key of Object.keys(handlers)){
    if(FORBIDDEN_METHODS.includes(key)) throw new Error("WORLDZAPP_SIMULATION_ADAPTER_FORBIDDEN_METHOD:"+key);
    if(!ALLOWED_METHODS.includes(key)) throw new Error("WORLDZAPP_SIMULATION_ADAPTER_UNKNOWN_METHOD:"+key);
    if(typeof handlers[key]!=="function") throw new TypeError("WORLDZAPP_SIMULATION_ADAPTER_HANDLER_MUST_BE_FUNCTION:"+key);
  }
  return true;
}

function createSimulationAdapter(definition,handlers={}){
  if(!definition || typeof definition!=="object") throw new TypeError("WORLDZAPP_SIMULATION_ADAPTER_DEFINITION_REQUIRED");
  if(!definition.id || !definition.family) throw new Error("WORLDZAPP_SIMULATION_ADAPTER_ID_AND_FAMILY_REQUIRED");
  assertSimulationOnlyHandlers(handlers);
  return Object.freeze({
    id:String(definition.id),
    family:String(definition.family),
    mode:"UNSIGNED_SIMULATION_ONLY",
    execution:false,
    signatureRequest:false,
    broadcast:false,
    methods:Object.freeze({...handlers})
  });
}

module.exports={ALLOWED_METHODS,FORBIDDEN_METHODS,assertSimulationOnlyHandlers,createSimulationAdapter};
