"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

const identity=require("../src/worldz-app/identity-assertion-contract");
const handoff=require("../src/worldz-app/mobile-handoff-contract");
const sessions=require("../src/worldz-app/session-contract");
const simulation=require("../src/worldz-app/simulation-contract");

const future=()=>new Date(Date.now()+5*60*1000).toISOString();

test("WorldzApp Stage 3B allows self asserted public identity only",()=>{
  const assertion=identity.createIdentityAssertion({
    assertionId:"identity-public-001",
    subject:"session:example",
    role:"PUBLIC_USER",
    issuer:"SELF"
  });
  assert.equal(assertion.role,"PUBLIC_USER");
  assert.equal(assertion.authorityGrant,false);
  assert.throws(()=>identity.createIdentityAssertion({
    assertionId:"identity-admin-001",
    subject:"session:example",
    role:"ADMIN",
    issuer:"SELF"
  }),/SELF_ASSERTED_PRIVILEGED_ROLE_FORBIDDEN/);
});

test("WorldzApp Stage 3B privileged role requires trusted verified issuer",()=>{
  assert.throws(()=>identity.createIdentityAssertion({
    assertionId:"identity-team-001",
    subject:"wallet:example",
    role:"TEAM_MEMBER",
    issuer:"worldz:test",
    verified:true
  },{trustedIssuers:["worldz:other"]}),/PRIVILEGED_ROLE_REQUIRES_TRUSTED_VERIFICATION/);
  const assertion=identity.createIdentityAssertion({
    assertionId:"identity-team-002",
    subject:"wallet:example",
    role:"TEAM_MEMBER",
    issuer:"worldz:test",
    verified:true,
    verifiedAt:new Date().toISOString()
  },{trustedIssuers:["worldz:test"]});
  assert.deepEqual(identity.deriveEffectiveRoles([assertion]),["TEAM_MEMBER"]);
});

test("WorldzApp Stage 3B mobile handoff is fail closed by origin",()=>{
  assert.throws(()=>handoff.createMobileHandoffIntent({
    intentId:"handoff-test-001",
    providerId:"xaman_oauth",
    family:"XRPL",
    launchUrl:"https://evil.example/auth",
    returnUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/",
    stateNonce:"nonce-1234567890",
    expiresAt:future()
  },{
    approvedProviderOrigins:["https://oauth2.xumm.app"],
    firstPartyOrigins:["https://launchpad.cryptoworldz.xyz"]
  }),/PROVIDER_ORIGIN_NOT_APPROVED/);
});

test("WorldzApp Stage 3B WalletConnect pairing remains memory only and audit redacted",()=>{
  const intent=handoff.createMobileHandoffIntent({
    intentId:"handoff-wc-001",
    providerId:"walletconnect_v2",
    family:"EVM",
    launchUrl:"wc:example-topic@2?relay-protocol=irn&symKey=example",
    stateNonce:"nonce-1234567890",
    expiresAt:future()
  },{allowWalletConnectPairing:true});
  assert.equal(intent.persistence,"MEMORY_ONLY");
  assert.equal(intent.execution,false);
  assert.equal(intent.signing,false);
  assert.equal(intent.audit.launch,"wc:<ephemeral-pairing-redacted>");
});

test("WorldzApp Stage 3B session carries public identity assertions without authority",()=>{
  const assertion=identity.createIdentityAssertion({
    assertionId:"identity-public-003",
    subject:"session:worldzapp-test-session",
    role:"PUBLIC_USER",
    issuer:"SELF"
  });
  const session=sessions.createPublicSession({
    sessionId:"worldzapp-test-session",
    permissions:["read_public_state","connect_external_wallet"],
    identityAssertions:[assertion]
  });
  assert.equal(session.identityAssertions.length,1);
  assert.equal(session.identityAssertions[0].authorityGrant,false);
});

test("WorldzApp Stage 4 foundation simulation cannot execute or broadcast",()=>{
  assert.throws(()=>simulation.createSimulationResult({
    simulationId:"simulation-001",
    proposalId:"proposal-001",
    chain:"solana",
    network:"mainnet-beta",
    unsignedPayloadHash:"hash-example",
    provider:"test",
    state:"SIMULATED",
    effects:[{type:"TRANSFER",summary:"Review-only transfer effect"}],
    execution:true
  }),/CANNOT_EXECUTE_OR_BROADCAST/);
  const result=simulation.createSimulationResult({
    simulationId:"simulation-002",
    proposalId:"proposal-002",
    chain:"solana",
    network:"mainnet-beta",
    unsignedPayloadHash:"hash-example",
    provider:"test",
    state:"SIMULATED",
    effects:[{type:"TRANSFER",summary:"Review-only transfer effect",asset:"MRCL",amount:"1",destination:"ExamplePublicAddress"}]
  });
  const gate=simulation.createHumanReviewGate(result,{acknowledgedEffectIndexes:[0]});
  assert.equal(gate.allEffectsAcknowledged,true);
  assert.equal(gate.signatureAllowed,false);
  assert.equal(gate.broadcastAllowed,false);
});
