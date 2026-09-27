"use strict";

const {fromSafe,fromXrplSignerList,fromSuiWeightedMultisig}=require("./multisig-approval-adapters");
const {requestJson}=require("./rpc-client");

function requireHttps(url,label){
  const parsed=new URL(String(url||""));
  if(parsed.protocol!=="https:") throw new Error("WORLDZAPP_"+label+"_HTTPS_REQUIRED");
  if(parsed.username||parsed.password) throw new Error("WORLDZAPP_"+label+"_INLINE_CREDENTIALS_FORBIDDEN");
  return parsed.toString().replace(/\/$/,"");
}

async function fetchJson(url,{headers={},timeoutMs=8000}={}){
  const endpoint=requireHttps(url,"PUBLIC_READ");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(endpoint,{method:"GET",headers:{accept:"application/json",...headers},signal:controller.signal});
    if(!response.ok) throw new Error("WORLDZAPP_PUBLIC_READ_HTTP_"+response.status);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

async function readSafeApprovalState({
  serviceUrl,safeAddress,safeTxHash,apiKey=null,chain="base",network="mainnet",
  treasuryProfile="worldz-operations"
}={}){
  if(!serviceUrl||!safeAddress||!safeTxHash) throw new Error("WORLDZAPP_SAFE_LIVE_PROFILE_CONFIG_REQUIRED");
  const base=requireHttps(serviceUrl,"SAFE_SERVICE_URL");
  const headers=apiKey?{authorization:"Bearer "+String(apiKey)}:{};
  const safe=await fetchJson(base+"/api/v1/safes/"+encodeURIComponent(safeAddress)+"/",{headers});
  const txRecord=await fetchJson(base+"/api/v1/multisig-transactions/"+encodeURIComponent(safeTxHash)+"/",{headers});
  if(String(txRecord.safe||"").toLowerCase()!==String(safeAddress).toLowerCase()) throw new Error("WORLDZAPP_SAFE_TX_SAFE_MISMATCH");
  const confirmations=await fetchJson(base+"/api/v1/multisig-transactions/"+encodeURIComponent(safeTxHash)+"/confirmations/",{headers});
  const owners=Array.isArray(safe.owners)?safe.owners:[];
  const rows=Array.isArray(confirmations.results)?confirmations.results:[];
  const state=fromSafe({
    chain,network,treasuryProfile,proposalId:"safe:"+safeTxHash,
    safeAddress,threshold:Number(safe.threshold),owners,confirmations:rows
  });
  return Object.freeze({
    system:"SAFE_SMART_ACCOUNT",
    safeAddress:String(safeAddress),
    safeTxHash:String(safeTxHash),
    ownerCount:owners.length,
    confirmationCount:rows.length,
    state,
    approvalSubmission:false,signing:false,execution:false,broadcast:false
  });
}

async function xrplRpc(rpcUrl,method,params){
  const endpoint=requireHttps(rpcUrl,"XRPL_RPC_URL");
  const body=await requestJson(endpoint,{method,params:[params]});
  if(body&&body.result&&body.result.error) throw new Error("WORLDZAPP_XRPL_ERROR_"+String(body.result.error));
  if(body&&body.error) throw new Error("WORLDZAPP_XRPL_ERROR_"+String(body.error));
  return body.result||body;
}

async function readXrplApprovalState({
  rpcUrl,account,txHash,network="mainnet",treasuryProfile="worldz-reserve"
}={}){
  if(!rpcUrl||!account||!txHash) throw new Error("WORLDZAPP_XRPL_LIVE_PROFILE_CONFIG_REQUIRED");
  const accountInfo=await xrplRpc(rpcUrl,"account_info",{account,ledger_index:"validated",signer_lists:true,api_version:2});
  if(accountInfo.validated!==true) throw new Error("WORLDZAPP_XRPL_ACCOUNT_INFO_NOT_VALIDATED");
  const signerLists=accountInfo.signer_lists||accountInfo.account_data&&accountInfo.account_data.signer_lists||[];
  if(!Array.isArray(signerLists)||signerLists.length!==1) throw new Error("WORLDZAPP_XRPL_SIGNER_LIST_REQUIRED");
  const signerList=signerLists[0];
  const tx=await xrplRpc(rpcUrl,"tx",{transaction:txHash,binary:false,api_version:2});
  if(tx.validated!==true) throw new Error("WORLDZAPP_XRPL_TX_NOT_VALIDATED");
  const txJson=tx.tx_json||tx;
  if(String(txJson.Account||"")!==String(account)) throw new Error("WORLDZAPP_XRPL_TX_ACCOUNT_MISMATCH");
  const signers=Array.isArray(txJson.Signers)?txJson.Signers:[];
  const state=fromXrplSignerList({
    network,treasuryProfile,proposalId:"xrpl:"+txHash,account,
    signerQuorum:Number(signerList.SignerQuorum),
    signerEntries:signerList.SignerEntries||[],
    signers
  });
  return Object.freeze({
    system:"XRPL_SIGNER_LIST",
    account:String(account),
    txHash:String(txHash),
    validated:Boolean(accountInfo.validated),
    signerCount:(signerList.SignerEntries||[]).length,
    state,
    approvalSubmission:false,signing:false,execution:false,broadcast:false
  });
}

function readSuiConfiguredApprovalState({
  multisigAddress,config,proofTxDigest,approvals=[],network="mainnet",treasuryProfile="worldz-reserve"
}={}){
  if(!multisigAddress||!proofTxDigest||!config||typeof config!=="object") throw new Error("WORLDZAPP_SUI_LIVE_PROFILE_CONFIG_REQUIRED");
  const members=Array.isArray(config.members)?config.members:[];
  const threshold=Number(config.threshold);
  if(!members.length||!Number.isInteger(threshold)||threshold<=0) throw new Error("WORLDZAPP_SUI_MULTISIG_CONFIG_INVALID");
  const state=fromSuiWeightedMultisig({
    network,treasuryProfile,proposalId:"sui:"+proofTxDigest,multisigAddress,
    threshold,members,approvals
  });
  return Object.freeze({
    system:"SUI_WEIGHTED_MULTISIG",
    multisigAddress:String(multisigAddress),
    proofTxDigest:String(proofTxDigest),
    configSource:"EXPLICIT_WORLDZ_PUBLIC_CONFIGURATION",
    state,
    approvalSubmission:false,signing:false,execution:false,broadcast:false
  });
}

module.exports={requireHttps,fetchJson,xrplRpc,readSafeApprovalState,readXrplApprovalState,readSuiConfiguredApprovalState};
