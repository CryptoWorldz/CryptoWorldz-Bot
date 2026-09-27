"use strict";

const {assertNoSecrets}=require("./session-contract");

const PUBLIC_ROLE="PUBLIC_USER";
const KNOWN_ROLES=Object.freeze([
  PUBLIC_ROLE,
  "VERIFIED_MEMBER",
  "TEAM_MEMBER",
  "TREASURY_SIGNER",
  "MODULE_OPERATOR",
  "ADMIN"
]);
const PRIVILEGED_ROLES=Object.freeze(KNOWN_ROLES.filter(role=>role!==PUBLIC_ROLE));

function normalizeRole(role){
  const value=String(role||"").trim().toUpperCase();
  if(!KNOWN_ROLES.includes(value)) throw new Error("WORLDZAPP_IDENTITY_ROLE_UNKNOWN:"+value);
  return value;
}

function normalizeScope(scope=[]){
  if(!Array.isArray(scope)) throw new TypeError("WORLDZAPP_IDENTITY_SCOPE_ARRAY_REQUIRED");
  return [...new Set(scope.map(item=>String(item).trim()).filter(Boolean))].sort();
}

function createIdentityAssertion({
  assertionId,
  subject,
  role=PUBLIC_ROLE,
  issuer="SELF",
  scope=[],
  verified=false,
  verifiedAt=null,
  expiresAt=null,
  evidenceRef=null,
  consentedPublicAssociation=false
}={}, {trustedIssuers=[]}={}){
  const normalizedRole=normalizeRole(role);
  const normalizedIssuer=String(issuer||"").trim();
  const normalizedSubject=String(subject||"").trim();
  if(!assertionId || String(assertionId).length<8) throw new Error("WORLDZAPP_IDENTITY_ASSERTION_ID_REQUIRED");
  if(!normalizedSubject) throw new Error("WORLDZAPP_IDENTITY_SUBJECT_REQUIRED");
  if(!normalizedIssuer) throw new Error("WORLDZAPP_IDENTITY_ISSUER_REQUIRED");
  const trusted=new Set((trustedIssuers||[]).map(String));
  if(normalizedIssuer==="SELF" && normalizedRole!==PUBLIC_ROLE){
    throw new Error("WORLDZAPP_IDENTITY_SELF_ASSERTED_PRIVILEGED_ROLE_FORBIDDEN:"+normalizedRole);
  }
  if(PRIVILEGED_ROLES.includes(normalizedRole) && (!verified || !trusted.has(normalizedIssuer))){
    throw new Error("WORLDZAPP_IDENTITY_PRIVILEGED_ROLE_REQUIRES_TRUSTED_VERIFICATION:"+normalizedRole);
  }
  const assertion={
    schema:"WORLDZ-APP-IDENTITY-ASSERTION-V1",
    assertionId:String(assertionId),
    subject:normalizedSubject,
    role:normalizedRole,
    issuer:normalizedIssuer,
    scope:normalizeScope(scope),
    verified:Boolean(verified),
    verifiedAt:verifiedAt===null?null:String(verifiedAt),
    expiresAt:expiresAt===null?null:String(expiresAt),
    evidenceRef:evidenceRef===null?null:String(evidenceRef),
    consentedPublicAssociation:Boolean(consentedPublicAssociation),
    authorityGrant:false
  };
  assertNoSecrets(assertion,"identityAssertion");
  return Object.freeze(assertion);
}

function isAssertionActive(assertion,{at=new Date()}={}){
  if(!assertion || assertion.schema!=="WORLDZ-APP-IDENTITY-ASSERTION-V1") return false;
  if(assertion.expiresAt && new Date(assertion.expiresAt).getTime()<=at.getTime()) return false;
  if(assertion.role===PUBLIC_ROLE && assertion.issuer==="SELF") return true;
  return assertion.verified===true;
}

function deriveEffectiveRoles(assertions=[],options={}){
  if(!Array.isArray(assertions)) throw new TypeError("WORLDZAPP_IDENTITY_ASSERTIONS_ARRAY_REQUIRED");
  return [...new Set(assertions.filter(item=>isAssertionActive(item,options)).map(item=>normalizeRole(item.role)))].sort();
}

function assertIdentityDoesNotGrantAuthority(assertion){
  if(assertion && assertion.authorityGrant===true) throw new Error("WORLDZAPP_IDENTITY_CANNOT_GRANT_TRANSACTION_AUTHORITY");
  return true;
}

module.exports={
  PUBLIC_ROLE,
  KNOWN_ROLES,
  PRIVILEGED_ROLES,
  normalizeRole,
  normalizeScope,
  createIdentityAssertion,
  isAssertionActive,
  deriveEffectiveRoles,
  assertIdentityDoesNotGrantAuthority
};
