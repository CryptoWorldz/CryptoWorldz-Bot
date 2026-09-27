"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const readers=require("../src/worldz-app/live-multisig-readers");

test("Stage 5C rejects insecure public proof endpoints",()=>{
  assert.throws(()=>readers.requireHttps("http://example.com","TEST"),/HTTPS_REQUIRED/);
  assert.throws(()=>readers.requireHttps("https://user:pass@example.com","TEST"),/INLINE_CREDENTIALS_FORBIDDEN/);
});

test("Stage 5C Safe proof normalizes public owners and confirmations only",async()=>{
  const original=global.fetch;
  global.fetch=async url=>({
    ok:true,
    json:async()=>String(url).includes("/safes/")
      ?{threshold:2,owners:["0xA","0xB","0xC"]}
      :{results:[{owner:"0xA"},{owner:"0xB"}]}
  });
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

test("Stage 5C XRPL proof uses weighted SignerList and transaction Signers",async()=>{
  const original=global.fetch;
  global.fetch=async(_url,init)=>{
    const body=JSON.parse(init.body);
    const isAccount=body.method==="account_info";
    return {
      ok:true,
      json:async()=>isAccount
        ?{result:{validated:true,signer_lists:[{SignerQuorum:3,SignerEntries:[
          {SignerEntry:{Account:"rA",SignerWeight:2}},
          {SignerEntry:{Account:"rB",SignerWeight:1}}
        ]}]}}
        :{result:{tx_json:{Signers:[{Signer:{Account:"rA"}},{Signer:{Account:"rB"}}]}}}
    };
  };
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
