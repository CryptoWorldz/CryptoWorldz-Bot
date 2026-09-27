"use strict";

const SECRET_KEY_PATTERN=/(seed|mnemonic|private.?key|recovery|secret|password|unlock|signing.?key)/i;

function assertNoSecrets(value,path="root"){
  if(value===null || value===undefined) return true;
  if(Array.isArray(value)){ value.forEach((item,index)=>assertNoSecrets(item,`${path}[${index}]`)); return true; }
  if(typeof value==="object"){
    for(const [key,item] of Object.entries(value)){
      if(SECRET_KEY_PATTERN.test(key)) throw new Error("WORLDZAPP_SESSION_SECRET_FIELD_FORBIDDEN:"+path+"."+key);
      assertNoSecrets(item,path+"."+key);
    }
  }
  return true;
}

function normalizePermissionList(permissions=[]){
  if(!Array.isArray(permissions)) throw new TypeError("WORLDZAPP_SESSION_PERMISSIONS_ARRAY_REQUIRED");
  return [...new Set(permissions.map(String))].sort();
}

function normalizeConnection(connection){
  if(!connection || typeof connection!=="object") throw new TypeError("WORLDZAPP_WALLET_CONNECTION_REQUIRED");
  assertNoSecrets(connection,"walletConnection");
  const chain=String(connection.chain||"").trim();
  const publicAddress=String(connection.publicAddress||"").trim();
  const provider=String(connection.provider||"").trim();
  const connectionState=String(connection.connectionState||"CONNECTED");
  if(!chain || !publicAddress || !provider) throw new Error("WORLDZAPP_WALLET_CONNECTION_PUBLIC_FIELDS_REQUIRED");
  if(!["CONNECTED","DISCONNECTED","READ_ONLY"].includes(connectionState)) throw new Error("WORLDZAPP_WALLET_CONNECTION_STATE_INVALID");
  return Object.freeze({
    chain,
    publicAddress,
    provider,
    connectionState,
    persistedByConsent:Boolean(connection.persistedByConsent)
  });
}

function createPublicSession({
  sessionId,
  createdAt=new Date().toISOString(),
  expiresAt=null,
  publicIdentity=null,
  permissions=[],
  walletConnections=[]
}={}){
  if(!sessionId || String(sessionId).length<8) throw new Error("WORLDZAPP_SESSION_ID_REQUIRED");
  assertNoSecrets(publicIdentity,"publicIdentity");
  const session={
    schema:"WORLDZ-APP-SESSION-V1",
    sessionId:String(sessionId),
    createdAt:String(createdAt),
    expiresAt:expiresAt===null?null:String(expiresAt),
    publicIdentity:publicIdentity===null?null:{
      displayName:publicIdentity.displayName??null,
      role:publicIdentity.role??null,
      consentedPublicAssociation:Boolean(publicIdentity.consentedPublicAssociation)
    },
    permissions:normalizePermissionList(permissions),
    walletConnections:walletConnections.map(normalizeConnection)
  };
  assertNoSecrets(session);
  return Object.freeze(session);
}

function withWalletConnection(session,connection){
  if(!session || session.schema!=="WORLDZ-APP-SESSION-V1") throw new Error("WORLDZAPP_SESSION_INVALID");
  const next=normalizeConnection(connection);
  const filtered=(session.walletConnections||[]).filter(item=>!(item.chain===next.chain && item.provider===next.provider));
  return createPublicSession({...session,walletConnections:[...filtered,next]});
}

function withoutWalletConnection(session,{chain,provider}={}){
  if(!session || session.schema!=="WORLDZ-APP-SESSION-V1") throw new Error("WORLDZAPP_SESSION_INVALID");
  return createPublicSession({...session,walletConnections:(session.walletConnections||[]).filter(item=>!(item.chain===String(chain) && item.provider===String(provider)))});
}

module.exports={SECRET_KEY_PATTERN,assertNoSecrets,normalizeConnection,createPublicSession,withWalletConnection,withoutWalletConnection};
