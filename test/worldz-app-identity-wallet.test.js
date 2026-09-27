const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const session=require("../src/worldz-app/session-core");

const root=path.resolve(__dirname,"..");
const core=path.join(root,"launchpad.cryptoworldz.xyz","worldz-app","core");

test("new WorldzApp session is public-only and deny-by-default",()=>{
  const value=session.createSession({displayName:"Legend"});
  assert.equal(value.schema,"WORLDZ-APP-SESSION-V1");
  assert.equal(value.publicIdentity.role,"GUEST");
  assert.deepEqual(value.permissions,["read_public_state","connect_external_wallet","create_draft_proposal"]);
  assert.deepEqual(value.walletConnections,[]);
});

test("wallet connection never grants treasury signer authority",()=>{
  const base=session.createSession();
  const connected=session.addWalletConnection(base,{
    chain:"solana",
    publicAddress:"Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u",
    provider:"External Solana Wallet"
  });
  const wallet=connected.walletConnections[0];
  assert.equal(wallet.connectionState,"CONNECTED_UNVERIFIED_CONTROL");
  assert.equal(wallet.controlProof,"NONE");
  assert.equal(wallet.treasurySignerAuthority,false);

  const verified=session.markControlChallengeVerified(connected,{
    chain:"solana",
    publicAddress:wallet.publicAddress,
    proofId:"challenge-proof-1234"
  });
  assert.equal(verified.walletConnections[0].connectionState,"VERIFIED_BY_CHALLENGE");
  assert.equal(verified.walletConnections[0].treasurySignerAuthority,false);
});

test("session core rejects secret-shaped fields",()=>{
  const value=session.createSession();
  assert.throws(()=>session.assertNoSecrets({...value,privateKey:"never"}),/FORBIDDEN_SECRET_FIELD/);
  assert.throws(()=>session.assertNoSecrets({nested:{seedPhrase:"never"}}),/FORBIDDEN_SECRET_FIELD/);
  assert.throws(()=>session.assertNoSecrets({recovery_words:"never"}),/FORBIDDEN_SECRET_FIELD/);
});

test("session permissions cannot escalate into signing or broadcast",()=>{
  const value=session.createSession();
  assert.throws(()=>session.grantPermission(value,"sign_transaction"),/PERMISSION_DENIED/);
  assert.throws(()=>session.grantPermission(value,"broadcast_mainnet"),/PERMISSION_DENIED/);
});

test("wallet connection registry keeps every Stage 3 connector non-signing",()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(core,"wallet-connection-registry.json"),"utf8"));
  assert.equal(registry.signingEnabled,false);
  assert.equal(registry.broadcastEnabled,false);
  for(const connector of registry.connectors) assert.equal(connector.signing,false);
  assert.ok(registry.connectors.find(item=>item.id==="evm-injected"));
  assert.ok(registry.connectors.find(item=>item.id==="solana-wallet-standard"));
  assert.ok(registry.connectors.find(item=>item.id==="walletconnect"));
  assert.ok(registry.connectors.find(item=>item.id==="xrpl-xaman"));
  assert.ok(registry.connectors.find(item=>item.id==="sui-dapp-kit"));
  assert.ok(registry.connectors.find(item=>item.id==="worldzcard-tangem"));
});

test("browser connector code has no signing or broadcast implementation",()=>{
  const browser=fs.readFileSync(path.join(root,"launchpad.cryptoworldz.xyz","worldz-app","connections.js"),"utf8");
  assert.doesNotMatch(browser,/sendTransaction\s*\(/);
  assert.doesNotMatch(browser,/signTransaction\s*\(/);
  assert.doesNotMatch(browser,/signAndSendTransaction\s*\(/);
  assert.doesNotMatch(browser,/eth_sendTransaction/);
  assert.doesNotMatch(browser,/personal_sign/);
  assert.match(browser,/eth_requestAccounts/);
  assert.match(browser,/eip6963:requestProvider/);
  assert.match(browser,/sessionStorage/);
  assert.doesNotMatch(browser,/localStorage/);
});

test("identity policy separates connection, control proof and signer authority",()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(core,"identity-policy.json"),"utf8"));
  assert.equal(policy.principles.walletConnectionIsIdentityProof,false);
  assert.equal(policy.principles.challengeSignatureRequiredForControlVerification,true);
  assert.equal(policy.principles.walletConnectionAutomaticallyGrantsTreasurySignerAuthority,false);
  assert.equal(policy.principles.treasurySignerAuthorityRequiresTreasurySpecificVerification,true);
});
