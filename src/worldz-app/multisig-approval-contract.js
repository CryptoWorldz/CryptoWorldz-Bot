"use strict";

const crypto=require("node:crypto");
const {assertNoSecrets}=require("./session-contract");

const MODES=Object.freeze(["COUNT","WEIGHT"]);
const sha256=value=>crypto.createHash("sha256").update(String(value)).digest("hex");

function normalizePublicId(value,label){
  const out=String(value||"").trim();
  if(!out) throw new Error("WORLDZAPP_MULTISIG_"+label+"_REQUIRED");
  return out;
}

function createApprovalReviewEnvelope({
  requestId,proposalId,simulationId,simulationProofHash,chain,network,treasuryProfile,
  unsignedPayloadHash,adapterId,effectsHash=null,expiresAt=null
}={}){
  const envelope={
    schema:"WORLDZ-APP-APPROVAL-REVIEW-V1",
    requestId:normalizePublicId(requestId,"REQUEST_ID"),
    proposalId:normalizePublicId(proposalId,"PROPOSAL_ID"),
    simulationId:normalizePublicId(simulationId,"SIMULATION_ID"),
    simulationProofHash:normalizePublicId(simulationProofHash,"SIMULATION_PROOF_HASH"),
    chain:normalizePublicId(chain,"CHAIN"),
    network:normalizePublicId(network,"NETWORK"),
    treasuryProfile:normalizePublicId(treasuryProfile,"TREASURY_PROFILE"),
    unsignedPayloadHash:normalizePublicId(unsignedPayloadHash,"UNSIGNED_PAYLOAD_HASH"),
    adapterId:normalizePublicId(adapterId,"ADAPTER_ID"),
    effectsHash:effectsHash==null?null:String(effectsHash),
    expiresAt:expiresAt==null?null:String(expiresAt),
    signing:false,
    signatureRequested:false,
    execution:false,
    broadcast:false
  };
  assertNoSecrets(envelope,"approvalReview");
  return Object.freeze(envelope);
}

function normalizeEligibility(eligibleApprovers=[],mode="COUNT"){
  if(!MODES.includes(mode)) throw new Error("WORLDZAPP_MULTISIG_THRESHOLD_MODE_INVALID");
  if(!Array.isArray(eligibleApprovers)||eligibleApprovers.length===0) throw new Error("WORLDZAPP_MULTISIG_ELIGIBLE_APPROVERS_REQUIRED");
  const seen=new Set();
  return eligibleApprovers.map((item,index)=>{
    if(!item||typeof item!=="object") throw new TypeError("WORLDZAPP_MULTISIG_APPROVER_INVALID:"+index);
    assertNoSecrets(item,"eligibleApprovers["+index+"]");
    const id=normalizePublicId(item.id,"APPROVER_ID");
    if(seen.has(id)) throw new Error("WORLDZAPP_MULTISIG_DUPLICATE_APPROVER:"+id);
    seen.add(id);
    const weight=mode==="WEIGHT"?Number(item.weight):1;
    if(!Number.isFinite(weight)||weight<=0||!Number.isInteger(weight)) throw new Error("WORLDZAPP_MULTISIG_APPROVER_WEIGHT_INVALID:"+id);
    return Object.freeze({id,weight});
  });
}

function createApprovalState({
  adapterId,chain,network,treasuryProfile,proposalId,mode="COUNT",threshold,
  eligibleApprovers=[],approvals=[],stateSource="UNSPECIFIED",observedAt=new Date().toISOString()
}={}){
  const eligible=normalizeEligibility(eligibleApprovers,mode);
  const required=Number(threshold);
  if(!Number.isInteger(required)||required<=0) throw new Error("WORLDZAPP_MULTISIG_THRESHOLD_INVALID");
  const totalPossible=eligible.reduce((sum,item)=>sum+item.weight,0);
  if(required>totalPossible) throw new Error("WORLDZAPP_MULTISIG_THRESHOLD_IMPOSSIBLE");
  if(!Array.isArray(approvals)) throw new TypeError("WORLDZAPP_MULTISIG_APPROVALS_ARRAY_REQUIRED");
  const eligibleMap=new Map(eligible.map(item=>[item.id,item]));
  const unique=[];
  const seen=new Set();
  for(const raw of approvals){
    const id=typeof raw==="string"?raw:String(raw&&raw.id||"");
    if(!eligibleMap.has(id)||seen.has(id)) continue;
    seen.add(id);
    unique.push(Object.freeze({id,weight:eligibleMap.get(id).weight}));
  }
  const approvedWeight=unique.reduce((sum,item)=>sum+item.weight,0);
  const thresholdMet=approvedWeight>=required;
  const state={
    schema:"WORLDZ-APP-MULTISIG-APPROVAL-STATE-V1",
    adapterId:normalizePublicId(adapterId,"ADAPTER_ID"),
    chain:normalizePublicId(chain,"CHAIN"),
    network:normalizePublicId(network,"NETWORK"),
    treasuryProfile:normalizePublicId(treasuryProfile,"TREASURY_PROFILE"),
    proposalId:normalizePublicId(proposalId,"PROPOSAL_ID"),
    mode,
    threshold:required,
    totalPossible,
    approvedWeight,
    approvals:unique,
    thresholdMet,
    stateSource:String(stateSource),
    observedAt:String(observedAt),
    stateHash:sha256(JSON.stringify({adapterId,chain,network,treasuryProfile,proposalId,mode,threshold:required,approvedWeight,approvals:unique,stateSource})),
    signatureRequested:false,
    executionAllowed:false,
    broadcastAllowed:false
  };
  assertNoSecrets(state,"approvalState");
  return Object.freeze(state);
}

module.exports={MODES,sha256,createApprovalReviewEnvelope,createApprovalState};
