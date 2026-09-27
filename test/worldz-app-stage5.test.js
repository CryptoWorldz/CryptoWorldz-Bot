"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

const core=require("../src/worldz-app/multisig-approval-contract");
const adapters=require("../src/worldz-app/multisig-approval-adapters");

test("Stage 5 approval review envelope cannot imply signing or execution",()=>{
  const item=core.createApprovalReviewEnvelope({
    requestId:"approval-review-001",
    proposalId:"proposal-001",
    simulationId:"simulation-001",
    simulationProofHash:"proofhash",
    chain:"solana",
    network:"mainnet-beta",
    treasuryProfile:"miracle",
    unsignedPayloadHash:"payloadhash",
    adapterId:"squads_v4"
  });
  assert.equal(item.signatureRequested,false);
  assert.equal(item.execution,false);
  assert.equal(item.broadcast,false);
});

test("Stage 5 Squads count threshold is normalized without execution authority",()=>{
  const state=adapters.fromSquadsV4({
    treasuryProfile:"miracle",
    proposalId:"proposal-squads",
    multisigAddress:"ExampleSquads",
    threshold:4,
    members:["A","B","C","D","E"].map(publicKey=>({publicKey})),
    approvedMembers:["A","B","C","D"]
  });
  assert.equal(state.thresholdMet,true);
  assert.equal(state.approvedWeight,4);
  assert.equal(state.executionAllowed,false);
});

test("Stage 5 Safe confirmations are de-duplicated",()=>{
  const state=adapters.fromSafe({
    chain:"base",treasuryProfile:"ops",proposalId:"proposal-safe",safeAddress:"0xSafe",
    threshold:2,owners:["0xA","0xB","0xC"],
    confirmations:[{owner:"0xA"},{owner:"0xA"},{owner:"0xB"}]
  });
  assert.equal(state.approvedWeight,2);
  assert.equal(state.approvals.length,2);
  assert.equal(state.thresholdMet,true);
});

test("Stage 5 XRPL uses signer weights and quorum",()=>{
  const state=adapters.fromXrplSignerList({
    treasuryProfile:"reserve",proposalId:"proposal-xrpl",account:"rExample",signerQuorum:3,
    signerEntries:[
      {SignerEntry:{Account:"rA",SignerWeight:2}},
      {SignerEntry:{Account:"rB",SignerWeight:1}},
      {SignerEntry:{Account:"rC",SignerWeight:1}}
    ],
    signers:[{Signer:{Account:"rA"}},{Signer:{Account:"rB"}}]
  });
  assert.equal(state.approvedWeight,3);
  assert.equal(state.thresholdMet,true);
  assert.equal(state.broadcastAllowed,false);
});

test("Stage 5 Sui weighted threshold remains approval evidence only",()=>{
  const state=adapters.fromSuiWeightedMultisig({
    treasuryProfile:"reserve",proposalId:"proposal-sui",multisigAddress:"0xSui",threshold:3,
    members:[{publicKey:"A",weight:2},{publicKey:"B",weight:1},{publicKey:"C",weight:1}],
    approvals:[{publicKey:"A"},{publicKey:"B"}]
  });
  assert.equal(state.approvedWeight,3);
  assert.equal(state.thresholdMet,true);
  assert.equal(state.executionAllowed,false);
  assert.equal(state.broadcastAllowed,false);
});

test("Stage 5 impossible thresholds fail closed",()=>{
  assert.throws(()=>core.createApprovalState({
    adapterId:"test",chain:"test",network:"test",treasuryProfile:"test",proposalId:"test",
    mode:"COUNT",threshold:3,
    eligibleApprovers:[{id:"A"},{id:"B"}],approvals:[]
  }),/THRESHOLD_IMPOSSIBLE/);
});
