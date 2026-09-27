"use strict";

const SENSITIVE_NAME_PATTERN=/(access.?token|refresh.?token|id.?token|private.?key|seed|mnemonic|secret|sym.?key|recovery|password)/i;
const ALLOWED_PROTOCOLS=Object.freeze(["https:","wc:"]);

function asUrl(value){
  try{return new URL(String(value));}
  catch(_){throw new Error("WORLDZAPP_MOBILE_HANDOFF_URL_INVALID");}
}

function assertNoSensitiveMetadata(value,path="handoff"){
  if(value===null || value===undefined) return true;
  if(Array.isArray(value)){value.forEach((item,index)=>assertNoSensitiveMetadata(item,`${path}[${index}]`));return true;}
  if(typeof value==="object"){
    for(const [key,item] of Object.entries(value)){
      if(SENSITIVE_NAME_PATTERN.test(key)) throw new Error("WORLDZAPP_MOBILE_HANDOFF_SENSITIVE_FIELD_FORBIDDEN:"+path+"."+key);
      assertNoSensitiveMetadata(item,path+"."+key);
    }
  }
  return true;
}

function validateFirstPartyReturnUrl(returnUrl,firstPartyOrigins=[]){
  const url=asUrl(returnUrl);
  if(url.protocol!=="https:") throw new Error("WORLDZAPP_MOBILE_HANDOFF_RETURN_HTTPS_REQUIRED");
  const approved=new Set(firstPartyOrigins.map(String));
  if(!approved.has(url.origin)) throw new Error("WORLDZAPP_MOBILE_HANDOFF_RETURN_ORIGIN_NOT_APPROVED:"+url.origin);
  return url.toString();
}

function validateProviderLaunchUrl(launchUrl,{approvedProviderOrigins=[],allowWalletConnectPairing=false}={}){
  const text=String(launchUrl||"").trim();
  if(/^wc:/i.test(text)){
    if(!allowWalletConnectPairing) throw new Error("WORLDZAPP_MOBILE_HANDOFF_WALLETCONNECT_NOT_ENABLED");
    return {protocol:"wc:",origin:null,url:text,persistence:"MEMORY_ONLY"};
  }
  const url=asUrl(text);
  if(!ALLOWED_PROTOCOLS.includes(url.protocol)) throw new Error("WORLDZAPP_MOBILE_HANDOFF_PROTOCOL_FORBIDDEN:"+url.protocol);
  if(url.protocol!=="https:") throw new Error("WORLDZAPP_MOBILE_HANDOFF_PROVIDER_HTTPS_REQUIRED");
  const approved=new Set(approvedProviderOrigins.map(String));
  if(!approved.has(url.origin)) throw new Error("WORLDZAPP_MOBILE_HANDOFF_PROVIDER_ORIGIN_NOT_APPROVED:"+url.origin);
  return {protocol:url.protocol,origin:url.origin,url:url.toString(),persistence:"MEMORY_ONLY"};
}

function redactLaunchUrlForAudit(launchUrl){
  const text=String(launchUrl||"");
  if(/^wc:/i.test(text)) return "wc:<ephemeral-pairing-redacted>";
  const url=asUrl(text);
  return url.origin+url.pathname;
}

function createMobileHandoffIntent({
  intentId,
  providerId,
  family,
  launchUrl,
  returnUrl,
  stateNonce,
  expiresAt,
  metadata={}
}={}, policy={}){
  if(!intentId || String(intentId).length<8) throw new Error("WORLDZAPP_MOBILE_HANDOFF_INTENT_ID_REQUIRED");
  if(!providerId || !family) throw new Error("WORLDZAPP_MOBILE_HANDOFF_PROVIDER_AND_FAMILY_REQUIRED");
  if(!stateNonce || String(stateNonce).length<12) throw new Error("WORLDZAPP_MOBILE_HANDOFF_STATE_NONCE_REQUIRED");
  if(!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) throw new Error("WORLDZAPP_MOBILE_HANDOFF_EXPIRY_REQUIRED");
  if(new Date(expiresAt).getTime()<=Date.now()) throw new Error("WORLDZAPP_MOBILE_HANDOFF_ALREADY_EXPIRED");
  assertNoSensitiveMetadata(metadata);
  const launch=validateProviderLaunchUrl(launchUrl,policy);
  const normalizedReturn=launch.protocol==="wc:"?null:validateFirstPartyReturnUrl(returnUrl,policy.firstPartyOrigins||[]);
  return Object.freeze({
    schema:"WORLDZ-APP-MOBILE-HANDOFF-V1",
    intentId:String(intentId),
    providerId:String(providerId),
    family:String(family),
    stateNonce:String(stateNonce),
    expiresAt:new Date(expiresAt).toISOString(),
    launchUrl:launch.url,
    returnUrl:normalizedReturn,
    persistence:"MEMORY_ONLY",
    execution:false,
    signing:false,
    metadata:Object.freeze({...metadata}),
    audit:Object.freeze({launch:redactLaunchUrlForAudit(launch.url),providerOrigin:launch.origin})
  });
}

module.exports={
  SENSITIVE_NAME_PATTERN,
  ALLOWED_PROTOCOLS,
  assertNoSensitiveMetadata,
  validateFirstPartyReturnUrl,
  validateProviderLaunchUrl,
  redactLaunchUrlForAudit,
  createMobileHandoffIntent
};
