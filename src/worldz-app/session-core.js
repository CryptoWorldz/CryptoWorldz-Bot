"use strict";
const crypto=require("node:crypto");

const SAFE_PERMISSIONS=Object.freeze([
  "read_public_state",
  "connect_external_wallet",
  "create_draft_proposal"
]);

const FORBIDDEN_FIELD_PATTERNS=Object.freeze([
  /seed/i,/mnemonic/i,/private.?key/i,/secret.?key/i,/recovery/i,/unlock.?password/i,/access.?code/i
]);

function assertNoSecrets(value,path="session"){
  if(value===null || value===undefined) return true;
  if(Array.isArray(value)){
    value.forEach((item,index)=>assertNoSecrets(item,path+"["+index+"]"));
    return true;
  }
  if(typeof value==="object"){
    for(const [key,item] of Object.entries(value)){
      if(FORBIDDEN_FIELD_PATTERNS.some(pattern=>pattern.test(key))){
        throw new Error("WORLDZAPP_SESSION_FORBIDDEN_SECRET_FIELD:"+path+"."+key);
      }
      assertNoSecrets(item,path+"."+key);
    }
  }
  return true;
}

function createSession({displayName=null,role="GUEST",ttlMinutes=60}={}){
  const now=new Date();
  const expires=new Date(now.getTime()+Math.max(5,Math.min(Number(ttlMinutes)||60,1440))*60000);
  const session={
    schema:"WORLDZ-APP-SESSION-V1",
    sessionId:crypto.randomUUID(),
    createdAt:now.toISOString(),
    expiresAt:expires.toISOString(),
    publicIdentity:{
      displayName:displayName===null?null:String(displayName).slice(0,120),
      role:String(role||"GUEST").slice(0,80),
      consentedPublicAssociation:false
    },
    permissions:["read_public_state","connect_external_wallet","create_draft_proposal"],
    walletConnections:[]
  };
  assertNoSecrets(session);
  return Object.freeze(session);
}

function normalizeConnection(connection={}){
  const normalized={
    chain:String(connection.chain||"").toLowerCase(),
    publicAddress:String(connection.publicAddress||""),
    provider:String(connection.provider||"External wallet").slice(0,120),
    connectionState:"CONNECTED_UNVERIFIED_CONTROL",
    controlProof:"NONE",
    persistedByConsent:connection.persistedByConsent===true,
    treasurySignerAuthority:false,
    connectedAt:new Date().toISOString()
  };
  if(!normalized.chain) throw new Error("WORLDZAPP_CONNECTION_CHAIN_REQUIRED");
  if(normalized.publicAddress.length<4 || normalized.publicAddress.length>256) throw new Error("WORLDZAPP_CONNECTION_ADDRESS_INVALID");
  assertNoSecrets(normalized,"connection");
  return Object.freeze(normalized);
}

function addWalletConnection(session,connection){
  assertNoSecrets(session);
  const next=normalizeConnection(connection);
  const walletConnections=(session.walletConnections||[]).filter(item=>
    !(String(item.chain).toLowerCase()===next.chain && String(item.publicAddress)===next.publicAddress)
  );
  walletConnections.push(next);
  const updated={...session,walletConnections};
  assertNoSecrets(updated);
  return Object.freeze(updated);
}

function markControlChallengeVerified(session,{chain,publicAddress,proofId}){
  if(!proofId) throw new Error("WORLDZAPP_CONTROL_PROOF_ID_REQUIRED");
  const walletConnections=(session.walletConnections||[]).map(item=>{
    if(String(item.chain).toLowerCase()!==String(chain).toLowerCase() || item.publicAddress!==publicAddress) return item;
    return Object.freeze({
      ...item,
      connectionState:"VERIFIED_BY_CHALLENGE",
      controlProof:String(proofId),
      treasurySignerAuthority:false
    });
  });
  const updated={...session,walletConnections};
  assertNoSecrets(updated);
  return Object.freeze(updated);
}

function grantPermission(session,permission){
  if(!SAFE_PERMISSIONS.includes(permission)) throw new Error("WORLDZAPP_SESSION_PERMISSION_DENIED:"+permission);
  const updated={...session,permissions:[...new Set([...(session.permissions||[]),permission])]};
  assertNoSecrets(updated);
  return Object.freeze(updated);
}

function toPublicSession(session){
  assertNoSecrets(session);
  return JSON.parse(JSON.stringify(session));
}

module.exports={
  SAFE_PERMISSIONS,
  FORBIDDEN_FIELD_PATTERNS,
  assertNoSecrets,
  createSession,
  normalizeConnection,
  addWalletConnection,
  markControlChallengeVerified,
  grantPermission,
  toPublicSession
};
