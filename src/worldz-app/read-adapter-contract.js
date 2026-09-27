"use strict";

const READ_METHODS=Object.freeze([
  "getHealth","getNetwork","getAccountSummary","getBalanceSummary",
  "getTreasuryState","getProposalHistory","getTransactionStatus"
]);

const FORBIDDEN_METHODS=Object.freeze([
  "sign","signTransaction","sendTransaction","broadcast","bridge","swap","stake",
  "changeSigner","createPrivateKey","importPrivateKey","exportPrivateKey","requestSeedPhrase"
]);

function assertReadOnlyHandlers(handlers={}){
  for(const key of Object.keys(handlers)){
    if(FORBIDDEN_METHODS.includes(key)) throw new Error("WORLDZAPP_READ_ADAPTER_FORBIDDEN_METHOD:"+key);
    if(!READ_METHODS.includes(key)) throw new Error("WORLDZAPP_READ_ADAPTER_UNKNOWN_METHOD:"+key);
    if(typeof handlers[key]!=="function") throw new TypeError("WORLDZAPP_READ_ADAPTER_HANDLER_MUST_BE_FUNCTION:"+key);
  }
  return true;
}

function createReadAdapter(definition,handlers={}){
  if(!definition || typeof definition!=="object") throw new TypeError("WORLDZAPP_READ_ADAPTER_DEFINITION_REQUIRED");
  if(!definition.id || !definition.family) throw new Error("WORLDZAPP_READ_ADAPTER_ID_AND_FAMILY_REQUIRED");
  assertReadOnlyHandlers(handlers);
  const adapter={
    id:String(definition.id),
    family:String(definition.family),
    mode:"READ_ONLY",
    execution:false,
    state:definition.state||"INTERFACE_BUILT_PROVIDER_NOT_CONFIGURED",
    methods:Object.freeze({...handlers})
  };
  return Object.freeze(adapter);
}

function createReadSnapshot({adapterId,chain,treasuryProfile=null,data=null,state="READ_OK",observedAt=new Date().toISOString()}){
  if(!adapterId || !chain) throw new Error("WORLDZAPP_READ_SNAPSHOT_ADAPTER_AND_CHAIN_REQUIRED");
  return Object.freeze({
    schema:"WORLDZ-APP-READ-SNAPSHOT-V1",
    adapterId:String(adapterId),
    chain:String(chain),
    treasuryProfile:treasuryProfile===null?null:String(treasuryProfile),
    state:String(state),
    observedAt:String(observedAt),
    data
  });
}

module.exports={READ_METHODS,FORBIDDEN_METHODS,assertReadOnlyHandlers,createReadAdapter,createReadSnapshot};
