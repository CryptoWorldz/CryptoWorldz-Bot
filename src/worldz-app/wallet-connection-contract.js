"use strict";

const ALLOWED_METHODS=Object.freeze(["detect","connect","getPublicAddress","getNetwork","disconnect"]);
const FORBIDDEN_METHODS=Object.freeze([
  "sign","signMessage","signTransaction","signAndSendTransaction","sendTransaction","broadcast",
  "bridge","swap","stake","changeSigner","requestSeedPhrase","requestPrivateKey","exportPrivateKey"
]);

function assertConnectionOnlyHandlers(handlers={}){
  for(const key of Object.keys(handlers)){
    if(FORBIDDEN_METHODS.includes(key)) throw new Error("WORLDZAPP_WALLET_CONNECT_FORBIDDEN_METHOD:"+key);
    if(!ALLOWED_METHODS.includes(key)) throw new Error("WORLDZAPP_WALLET_CONNECT_UNKNOWN_METHOD:"+key);
    if(typeof handlers[key]!=="function") throw new TypeError("WORLDZAPP_WALLET_CONNECT_HANDLER_MUST_BE_FUNCTION:"+key);
  }
  return true;
}

function createWalletConnector(definition,handlers={}){
  if(!definition || typeof definition!=="object") throw new TypeError("WORLDZAPP_WALLET_CONNECTOR_DEFINITION_REQUIRED");
  if(!definition.id || !definition.family) throw new Error("WORLDZAPP_WALLET_CONNECTOR_ID_AND_FAMILY_REQUIRED");
  assertConnectionOnlyHandlers(handlers);
  return Object.freeze({
    id:String(definition.id),
    family:String(definition.family),
    mode:"CONNECTION_ONLY",
    externalCustody:true,
    execution:false,
    methods:Object.freeze({...handlers})
  });
}

function createConnectionSnapshot({connectorId,chain,publicAddress,provider,network=null,state="CONNECTED",observedAt=new Date().toISOString()}={}){
  if(!connectorId || !chain || !publicAddress || !provider) throw new Error("WORLDZAPP_CONNECTION_SNAPSHOT_PUBLIC_FIELDS_REQUIRED");
  return Object.freeze({
    schema:"WORLDZ-APP-WALLET-CONNECTION-V1",
    connectorId:String(connectorId),
    chain:String(chain),
    publicAddress:String(publicAddress),
    provider:String(provider),
    network:network===null?null:String(network),
    state:String(state),
    observedAt:String(observedAt),
    execution:false
  });
}

module.exports={ALLOWED_METHODS,FORBIDDEN_METHODS,assertConnectionOnlyHandlers,createWalletConnector,createConnectionSnapshot};
