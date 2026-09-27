import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import * as multisig from "@sqds/multisig";
import { Connection, PublicKey } from "@solana/web3.js";

const require=createRequire(import.meta.url);
const {fromSquadsV4}=require("../src/worldz-app/multisig-approval-adapters.js");

const sha256=value=>crypto.createHash("sha256").update(String(value)).digest("hex");
const candidate=JSON.parse(fs.readFileSync("worldzpad-mainnet/wldz-one-sided-launch.candidate.json","utf8"));
const rpcUrl=process.env.WORLDZ_SOLANA_RPC_URL||"https://api.mainnet.solana.com";

function fail(message){throw new Error("WORLDZAPP_STAGE5B_FAIL:"+message)}
function statusName(status){
  if(!status)return "UNKNOWN";
  if(typeof status==="string")return status;
  if(status.__kind)return String(status.__kind);
  const keys=Object.keys(status);
  return keys.length?keys[0]:"UNKNOWN";
}
function keyString(value){
  if(!value)return "";
  if(typeof value==="string")return value;
  if(typeof value.toBase58==="function")return value.toBase58();
  return String(value);
}

if(candidate.status!=="LIVE_EXECUTED__DO_NOT_REEXECUTE") fail("WLDZ_CANDIDATE_STATUS_DRIFT");
if(candidate.executionEnabled!==false) fail("WLDZ_EXECUTION_MUST_REMAIN_DISABLED");
if(candidate.duplicateExecutionProhibited!==true) fail("WLDZ_DUPLICATE_EXECUTION_GUARD_REQUIRED");

const declared=String(candidate.treasury.currentThreshold||"");
const thresholdMatch=declared.match(/(\d+)-of-(\d+)/);
if(!thresholdMatch) fail("WLDZ_THRESHOLD_DECLARATION_UNREADABLE");
const declaredThreshold=Number(thresholdMatch[1]);
const declaredMembers=Number(thresholdMatch[2]);

const connection=new Connection(rpcUrl,"confirmed");
const multisigPda=new PublicKey(candidate.treasury.multisig);
const info=await multisig.accounts.Multisig.fromAccountAddress(connection,multisigPda);
const actualThreshold=Number(info.threshold);
const members=(info.members||[]).map(member=>keyString(member.key||member.publicKey||member)).filter(Boolean);
const [vaultPda]=multisig.getVaultPda({multisigPda,index:Number(candidate.treasury.vaultIndex||0)});

if(vaultPda.toBase58()!==candidate.treasury.vault) fail("VAULT_DERIVATION_MISMATCH");
if(actualThreshold!==declaredThreshold) fail("LIVE_THRESHOLD_MISMATCH");
if(members.length!==declaredMembers) fail("LIVE_MEMBER_COUNT_MISMATCH");

const currentIndex=BigInt(info.transactionIndex.toString());
const indexes=[];
for(const value of [14n,currentIndex,currentIndex>0n?currentIndex-1n:0n]){
  if(value>0n&&!indexes.some(existing=>existing===value))indexes.push(value);
}

let proposalEvidence=null;
for(const transactionIndex of indexes){
  try{
    const [proposalPda]=multisig.getProposalPda({multisigPda,transactionIndex});
    const proposal=await multisig.accounts.Proposal.fromAccountAddress(connection,proposalPda);
    const approved=(proposal.approved||[]).map(keyString).filter(Boolean);
    const rejected=(proposal.rejected||[]).map(keyString).filter(Boolean);
    const cancelled=(proposal.cancelled||[]).map(keyString).filter(Boolean);
    const normalized=fromSquadsV4({
      network:"mainnet-beta",
      treasuryProfile:"WLDZ_OPERATIONAL_SQUADS",
      proposalId:"squads:"+proposalPda.toBase58(),
      multisigAddress:multisigPda.toBase58(),
      threshold:actualThreshold,
      members:members.map(publicKey=>({publicKey})),
      approvedMembers:approved
    });
    proposalEvidence={
      transactionIndex:transactionIndex.toString(),
      proposalPda:proposalPda.toBase58(),
      status:statusName(proposal.status),
      approved,
      rejected,
      cancelled,
      normalized:{
        threshold:normalized.threshold,
        approvedWeight:normalized.approvedWeight,
        thresholdMet:normalized.thresholdMet,
        executionAllowed:normalized.executionAllowed,
        broadcastAllowed:normalized.broadcastAllowed,
        stateHash:normalized.stateHash
      }
    };
    break;
  }catch(error){
    // Try the next known/current proposal index. Missing or closed historical accounts are not treated as proof.
  }
}
if(!proposalEvidence) fail("NO_READABLE_WORLDZ_SQUADS_PROPOSAL_FOUND");

const strongStatus=/Approved|Executed|Executing/.test(proposalEvidence.status);
if(strongStatus&&!proposalEvidence.normalized.thresholdMet) fail("PROPOSAL_STATUS_THRESHOLD_CONTRADICTION");

const proof={
  schema:"WORLDZ-APP-STAGE5B-SQUADS-LIVE-PROOF-V1",
  generatedAt:new Date().toISOString(),
  network:"mainnet-beta",
  system:"Squads Protocol v4",
  programId:"SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
  worldzProfile:"WLDZ_OPERATIONAL_SQUADS",
  multisig:multisigPda.toBase58(),
  vault:vaultPda.toBase58(),
  threshold:actualThreshold,
  memberCount:members.length,
  members,
  transactionIndex:currentIndex.toString(),
  staleTransactionIndex:info.staleTransactionIndex==null?null:info.staleTransactionIndex.toString(),
  proposalEvidence,
  executionEnabled:false,
  approvalSubmission:false,
  signing:false,
  broadcast:false,
  privateMaterialRead:false
};
const canonical=JSON.stringify(proof,null,2)+"\n";
fs.writeFileSync("worldzapp-stage5b-squads-live-proof.json",canonical);
console.log(canonical.trim());
console.log("WORLDZAPP_STAGE5B_SQUADS_PROOF_SHA256="+sha256(canonical));
console.log("WORLDZAPP_STAGE5B_SQUADS_PROFILE=PASS");
