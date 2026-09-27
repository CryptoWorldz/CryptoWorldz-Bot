"use strict";

const {createApprovalState}=require("./multisig-approval-contract");

function norm(value){return String(value||"").trim()}
function ids(items,key){return (items||[]).map(item=>typeof item==="string"?item:norm(item&&item[key])).filter(Boolean)}

function fromSquadsV4({
  network="solana-mainnet",treasuryProfile,proposalId,multisigAddress,threshold,members=[],approvedMembers=[]
}={}){
  return createApprovalState({
    adapterId:"squads_v4",
    chain:"solana",network,treasuryProfile,proposalId,
    mode:"COUNT",threshold,
    eligibleApprovers:members.map(member=>({id:norm(member.publicKey||member.id),weight:1})),
    approvals:ids(approvedMembers,"publicKey"),
    stateSource:"SQUADS_V4_PUBLIC_PROPOSAL:"+norm(multisigAddress)
  });
}

function fromSafe({
  chain="ethereum",network="mainnet",treasuryProfile,proposalId,safeAddress,threshold,owners=[],confirmations=[]
}={}){
  return createApprovalState({
    adapterId:"safe_smart_account",
    chain,network,treasuryProfile,proposalId,
    mode:"COUNT",threshold,
    eligibleApprovers:owners.map(owner=>({id:norm(owner),weight:1})),
    approvals:ids(confirmations,"owner"),
    stateSource:"SAFE_PUBLIC_CONFIRMATIONS:"+norm(safeAddress)
  });
}

function fromXrplSignerList({
  network="mainnet",treasuryProfile,proposalId,account,signerQuorum,signerEntries=[],signers=[]
}={}){
  const eligibleApprovers=signerEntries.map(entry=>{
    const inner=entry.SignerEntry||entry;
    return {id:norm(inner.Account||inner.account),weight:Number(inner.SignerWeight??inner.weight)};
  });
  const approvals=signers.map(item=>{
    const inner=item.Signer||item;
    return norm(inner.Account||inner.account);
  }).filter(Boolean);
  return createApprovalState({
    adapterId:"xrpl_signer_list",
    chain:"xrpl",network,treasuryProfile,proposalId,
    mode:"WEIGHT",threshold:Number(signerQuorum),
    eligibleApprovers,approvals,
    stateSource:"XRPL_SIGNER_LIST:"+norm(account)
  });
}

function fromSuiWeightedMultisig({
  network="mainnet",treasuryProfile,proposalId,multisigAddress,threshold,members=[],approvals=[]
}={}){
  const eligibleApprovers=members.map(member=>({
    id:norm(member.publicKey||member.id),
    weight:Number(member.weight)
  }));
  return createApprovalState({
    adapterId:"sui_weighted_multisig",
    chain:"sui",network,treasuryProfile,proposalId,
    mode:"WEIGHT",threshold:Number(threshold),
    eligibleApprovers,
    approvals:ids(approvals,"publicKey"),
    stateSource:"SUI_WEIGHTED_MULTISIG:"+norm(multisigAddress)
  });
}

module.exports={fromSquadsV4,fromSafe,fromXrplSignerList,fromSuiWeightedMultisig};
