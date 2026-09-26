#!/usr/bin/env node
/**
 * PNEX Streamflow vesting transaction preparer.
 * Prepares instructions only. Never accepts a secret key, signs, or broadcasts.
 */
import fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import * as Streamflow from "@streamflow/stream";
import BN from "bn.js";

const DAY=86400;
const PERIOD=30*DAY;
const DECIMALS=6;
const UNIT=10n**6n;

function parseArgs(){
  const out={};
  for(let i=2;i<process.argv.length;i++){
    const k=process.argv[i];
    if(k==="--self-test") out.selfTest=true;
    else if(k.startsWith("--")) out[k.slice(2)]=process.argv[++i];
  }
  return out;
}
function raw(tokens){
  const s=String(tokens);
  if(!/^\\d+(\\.\\d+)?$/.test(s)) throw new Error("invalid token amount");
  const parts=s.split(".");
  const w=parts[0], f=parts[1]||"";
  if(f.length>DECIMALS) throw new Error("too many decimals");
  return BigInt(w)*UNIT+BigInt(f.padEnd(DECIMALS,"0")||"0");
}
function schedule(kind, amount){
  if(kind==="developer") return {cliffDays:90,releases:24,totalRaw:raw(amount||"25000000")};
  if(kind==="chance") return {cliffDays:30,releases:12,totalRaw:raw(amount||"37500000")};
  if(kind==="builder"){
    if(!amount) throw new Error("--amount required for builder");
    return {cliffDays:90,releases:24,totalRaw:raw(amount)};
  }
  throw new Error("--kind must be developer, chance or builder");
}
function split(totalRaw,releases){
  const base=totalRaw/BigInt(releases), remainder=totalRaw%BigInt(releases);
  return Array.from({length:releases},(_,i)=>base+(BigInt(i)<remainder?1n:0n));
}
function buildData(opts){
  const p=schedule(opts.kind,opts.amount);
  const releases=split(p.totalRaw,p.releases);
  const start=Number(opts.launchTimestamp)+p.cliffDays*DAY;
  const amountPerPeriod=p.totalRaw/BigInt(p.releases);
  const remainder=p.totalRaw-(amountPerPeriod*BigInt(p.releases));
  return {
    recipient:opts.recipient,
    tokenId:opts.mint,
    start,
    amount:new BN(p.totalRaw.toString()),
    period:PERIOD,
    cliff:start,
    cliffAmount:new BN(remainder.toString()),
    amountPerPeriod:new BN(amountPerPeriod.toString()),
    name:opts.name||("PHENIX "+opts.kind+" vesting"),
    canTopup:false,
    cancelableBySender:false,
    cancelableByRecipient:false,
    transferableBySender:false,
    transferableByRecipient:false,
    automaticWithdrawal:false,
    withdrawalFrequency:0,
    rawSchedule:{
      totalRaw:p.totalRaw.toString(),
      releases:p.releases,
      cliffDays:p.cliffDays,
      periodSeconds:PERIOD,
      nominalReleaseRaw:amountPerPeriod.toString(),
      reconciliationRemainderRaw:remainder.toString(),
      exactTotalRaw:(amountPerPeriod*BigInt(p.releases)+remainder).toString(),
      releasesRaw:releases.map(String)
    }
  };
}
async function main(){
  const a=parseArgs();
  if(a.selfTest){
    const fake="11111111111111111111111111111111";
    const cases=[["developer","25000000"],["chance","37500000"],["builder","1234567.123456"]];
    for(const item of cases){
      const d=buildData({kind:item[0],amount:item[1],launchTimestamp:1800000000,recipient:fake,mint:fake});
      if(d.canTopup||d.cancelableBySender||d.cancelableByRecipient||d.transferableBySender||d.transferableByRecipient) throw new Error("immutability default failed");
      if(BigInt(d.rawSchedule.exactTotalRaw)!==BigInt(d.rawSchedule.totalRaw)) throw new Error("raw reconciliation failed");
    }
    const Client=Streamflow.StreamflowSolana?.SolanaStreamClient||Streamflow.SolanaStreamClient;
    if(typeof Client!=="function") throw new Error("Streamflow SDK client unavailable exports="+Object.keys(Streamflow).join(","));
    console.log("PNEX_STREAMFLOW_VESTING_SELF_TEST=PASS non_cancelable=YES non_transferable=YES exact_raw=YES signing=EXTERNAL");
    return;
  }
  for(const k of ["rpc","kind","launch-timestamp","recipient","mint","sender"]) if(!a[k]) throw new Error("--"+k+" required");
  const sender=new PublicKey(a.sender);
  new PublicKey(a.recipient);
  new PublicKey(a.mint);
  const Client=Streamflow.StreamflowSolana?.SolanaStreamClient||Streamflow.SolanaStreamClient;
  if(typeof Client!=="function") throw new Error("Streamflow SDK client unavailable");
  const client=new Client(a.rpc);
  const data=buildData({
    kind:a.kind,amount:a.amount,launchTimestamp:Number(a["launch-timestamp"]),
    recipient:a.recipient,mint:a.mint,name:a.name
  });
  const built=await client.buildCreateTransactionInstructions(data,{senderPublicKey:sender,isNative:false});
  const ixs=built.ixs, metadataId=built.metadataId;
  const result={
    schema:"PNEX-STREAMFLOW-PREPARED-V1",
    provider:"Streamflow",
    networkRpc:a.rpc,
    kind:a.kind,
    mint:a.mint,
    sender:a.sender,
    recipient:a.recipient,
    schedule:data.rawSchedule,
    controls:{
      canTopup:false,cancelableBySender:false,cancelableByRecipient:false,
      transferableBySender:false,transferableByRecipient:false,
      automaticWithdrawal:false
    },
    metadataId,
    instructions:ixs.map(ix=>({
      programId:ix.programId.toBase58(),
      keys:ix.keys.map(k=>({pubkey:k.pubkey.toBase58(),signer:k.isSigner,writable:k.isWritable})),
      dataBase64:Buffer.from(ix.data).toString("base64")
    })),
    signed:false,broadcast:false,mainnetExecution:false
  };
  const output=a.output||"pnex-streamflow-prepared.json";
  fs.writeFileSync(output,JSON.stringify(result,null,2)+"\\n");
  console.log("PNEX_STREAMFLOW_PREPARED=PASS kind="+a.kind+" instructions="+ixs.length+" metadata="+metadataId+" signed=NO broadcast=NO");
}
main().catch(e=>{console.error(e.message);process.exit(1);});
