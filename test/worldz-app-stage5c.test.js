"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const readers=require("../src/worldz-app/live-multisig-readers");

test("Stage 5C rejects insecure public proof endpoints",()=>{
  assert.throws(()=>readers.requireHttps("http://example.com","TEST"),/HTTPS_REQUIRED/);
  assert.throws(()=>readers.requireHttps("https://user:pass@example.com","TEST"),/INLINE_CREDENTIALS_FORBIDDEN/);
});

function safeFetchFixture({txSafe="0xSafe"}={}){
  return async url=>({
    ok:true,
    json:async()=>{
      const value=String(url);
      if(value.includes("/safes/")) return {threshold:2,owners:["0xA","0xB","0xC"]};
      if(value.endsWith("/confirmations/")) return {results:[{owner:"0xA"},{owner:"0xB"}]};
      return {safe:txSafe,safeTxHash:"0xTx"};
    }
  });
}

test("Stage 5C Safe proof binds transaction evidence to requested Safe",async()=>{
  const original=global.fetch;
  global.fetch=safeFetchFixture();
  try{
    const proof=await readers.readSafeApprovalState({
      serviceUrl:"https://safe.example",
      safeAddress:"0xSafe",
      safeTxHash:"0xTx"
    });
    assert.equal(proof.state.thresholdMet,true);
    assert.equal(proof.execution,false);
    assert.equal(proof.broadcast,false);
  } finally { global.fetch=original; }
});

test("Stage 5C Safe proof rejects a transaction from another Safe",async()=>{
  const original=global.fetch;
  global.fetch=safeFetchFixture({txSafe:"0xOther"});
  try{
    await assert.rejects(()=>readers.readSafeApprovalState({
      serviceUrl:"https://safe.example",
      safeAddress:"0xSafe",
      safeTxHash:"0xTx"
    }),/SAFE_TX_SAFE_MISMATCH/);
  } finally { global.fetch=original; }
});

function xrplFetchFixture({validated=true,txAccount="rWorldz"}={}){
  return async(_url,init)=>{
    const body=JSON.parse(init.body);
    const isAccount=body.method==="account_info";
    return {
      ok:true,
      json:async()=>isAccount
        ?{result:{validated:true,signer_lists:[{SignerQuorum:3,SignerEntries:[
          {SignerEntry:{Account:"rA",SignerWeight:2}},
          {SignerEntry:{Account:"rB",SignerWeight:1}}
        ]}]}}
        :{result:{validated,tx_json:{Account:txAccount,Signers:[
          {Signer:{Account:"rA"}},{Signer:{Account:"rB"}}
        ]}}}
    };
  };
}

test("Stage 5C XRPL proof uses validated weighted SignerList evidence for the configured account",async()=>{
  const original=global.fetch;
  global.fetch=xrplFetchFixture();
  try{
    const proof=await readers.readXrplApprovalState({
      rpcUrl:"https://xrpl.example",
      account:"rWorldz",
      txHash:"ABC"
    });
    assert.equal(proof.state.approvedWeight,3);
    assert.equal(proof.state.thresholdMet,true);
    assert.equal(proof.state.executionAllowed,false);
  } finally { global.fetch=original; }
});

test("Stage 5C XRPL proof requires HTTPS",async()=>{
  await assert.rejects(()=>readers.readXrplApprovalState({
    rpcUrl:"http://xrpl.example",
    account:"rWorldz",
    txHash:"ABC"
  }),/XRPL_RPC_URL_HTTPS_REQUIRED/);
});

test("Stage 5C XRPL proof rejects unvalidated transaction evidence",async()=>{
  const original=global.fetch;
  global.fetch=xrplFetchFixture({validated:false});
  try{
    await assert.rejects(()=>readers.readXrplApprovalState({
      rpcUrl:"https://xrpl.example",
      account:"rWorldz",
      txHash:"ABC"
    }),/XRPL_TX_NOT_VALIDATED/);
  } finally { global.fetch=original; }
});

test("Stage 5C XRPL proof rejects transaction evidence for another account",async()=>{
  const original=global.fetch;
  global.fetch=xrplFetchFixture({txAccount:"rOther"});
  try{
    await assert.rejects(()=>readers.readXrplApprovalState({
      rpcUrl:"https://xrpl.example",
      account:"rWorldz",
      txHash:"ABC"
    }),/XRPL_TX_ACCOUNT_MISMATCH/);
  } finally { global.fetch=original; }
});

test("Stage 5C Sui configured public proof remains evidence-only",()=>{
  const proof=readers.readSuiConfiguredApprovalState({
    multisigAddress:"0xWorldz",
    proofTxDigest:"Digest",
    config:{threshold:3,members:[
      {publicKey:"A",weight:2},{publicKey:"B",weight:1},{publicKey:"C",weight:1}
    ]},
    approvals:[{publicKey:"A"},{publicKey:"B"}]
  });
  assert.equal(proof.state.thresholdMet,true);
  assert.equal(proof.state.executionAllowed,false);
  assert.equal(proof.broadcast,false);
});
