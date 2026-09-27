"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

const sessions=require("../src/worldz-app/session-contract");
const wallets=require("../src/worldz-app/wallet-connection-contract");

test("WorldzApp Stage 3 session stores public connection data only",()=>{
  const session=sessions.createPublicSession({
    sessionId:"worldzapp-test-session",
    permissions:["connect_external_wallet","read_public_state"],
    walletConnections:[{chain:"solana",publicAddress:"ExamplePublicAddress",provider:"Test Wallet",connectionState:"CONNECTED"}]
  });
  assert.equal(session.schema,"WORLDZ-APP-SESSION-V1");
  assert.equal(session.walletConnections[0].publicAddress,"ExamplePublicAddress");
  assert.equal(session.walletConnections[0].persistedByConsent,false);
});

test("WorldzApp Stage 3 rejects secret-shaped session fields",()=>{
  assert.throws(()=>sessions.createPublicSession({
    sessionId:"worldzapp-test-session",
    publicIdentity:{displayName:"Test",privateKey:"forbidden"}
  }),/WORLDZAPP_SESSION_SECRET_FIELD_FORBIDDEN/);
});

test("WorldzApp wallet connector is connection-only",()=>{
  assert.equal(wallets.assertConnectionOnlyHandlers({connect:async()=>true,getNetwork:async()=>1}),true);
  assert.throws(()=>wallets.assertConnectionOnlyHandlers({signTransaction:async()=>true}),/WORLDZAPP_WALLET_CONNECT_FORBIDDEN_METHOD/);
});

test("WorldzApp connection snapshot cannot imply execution",()=>{
  const snapshot=wallets.createConnectionSnapshot({
    connectorId:"solana_injected",
    chain:"solana",
    publicAddress:"ExamplePublicAddress",
    provider:"Test Wallet"
  });
  assert.equal(snapshot.execution,false);
  assert.equal(snapshot.state,"CONNECTED");
});
