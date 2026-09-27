"use strict";

const SECRET_KEY_PATTERN=/(seed|mnemonic|private.?key|recovery|secret|password|unlock|signing.?key|access.?token|refresh.?token|id.?token)/i;

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
  const connectionState=String(connection.connectionState||connection.state||"CONNECTED");
  if(!chain || !publicAddress || !provider) throw new Error("WORLDZAPP_WALLET_CONNECTION_PUBLIC_FIELDS_REQUIRED");
  if(!["CONNECTED","DISCONNECTED","READ_ONLY"].includes(connectionState)) throw new Error("WORLDZAPP_WALLET_CONNECTION_STATE_INVALID");
  return Object.freeze({
    connectorId:connection.connectorId==null?null:String(connection.connectorId),
    chain,
    publicAddress,
    provider,
    connectionState,
    network:connection.network==null?null:String(connection.network),
    observedAt:connection.observedAt==null?null:String(connection.observedAt),
    persistedByConsent:Boolean(connection.persistedByConsent)
  });
}

function normalizeIdentityAssertion(assertion){
  if(!assertion || typeof assertion!=="object") throw new TypeError("WORLDZAPP_IDENTITY_ASSERTION_REQUIRED");
  assertNoSecrets(assertion,"identityAssertion");
  if(assertion.authorityGrant===true) throw new Error("WORLDZAPP_IDENTITY_CANNOT_GRANT_TRANSACTION_AUTHORITY");
  const assertionId=String(assertion.assertionId||"").trim();
  const subject=String(assertion.subject||"").trim();
  const role=String(assertion.role||"").trim();
  const issuer=String(assertion.issuer||"").trim();
  if(!assertionId || !subject || !role || !issuer) throw new Error("WORLDZAPP_IDENTITY_ASSERTION_PUBLIC_FIELDS_REQUIRED");
  return Object.freeze({
    schema:"WORLDZ-APP-IDENTITY-ASSERTION-V1",
    assertionId,
    subject,
    role,
    issuer,
    scope:Array.isArray(assertion.scope)?[...new Set(assertion.scope.map(String))].sort():[],
    verified:Boolean(assertion.verified),
    verifiedAt:assertion.verifiedAt==null?null:String(assertion.verifiedAt),
    expiresAt:assertion.expiresAt==null?null:String(assertion.expiresAt),
    evidenceRef:assertion.evidenceRef==null?null:String(assertion.evidenceRef),
    consentedPublicAssociation:Boolean(assertion.consentedPublicAssociation),
    authorityGrant:false
  });
}

function createPublicSession({
  sessionId,
  createdAt=new Date().toISOString(),
  expiresAt=null,
  publicIdentity=null,
  identityAssertions=[],
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
      consentedPublicAssociation:Boolean(publicIdentity.consentedPublicAssociation),
      authorityGrant:false
    },
    identityAssertions:identityAssertions.map(normalizeIdentityAssertion),
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

function withIdentityAssertion(session,assertion){
  if(!session || session.schema!=="WORLDZ-APP-SESSION-V1") throw new Error("WORLDZAPP_SESSION_INVALID");
  const next=normalizeIdentityAssertion(assertion);
  const filtered=(session.identityAssertions||[]).filter(item=>item.assertionId!==next.assertionId);
  return createPublicSession({...session,identityAssertions:[...filtered,next]});
}

module.exports={
  SECRET_KEY_PATTERN,
  assertNoSecrets,
  normalizeConnection,
  normalizeIdentityAssertion,
  createPublicSession,
  withWalletConnection,
  withoutWalletConnection,
  withIdentityAssertion
};
