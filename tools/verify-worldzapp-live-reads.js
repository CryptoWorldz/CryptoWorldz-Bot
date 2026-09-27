#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {DEFINITIONS,createProviderAdapter,resolveProviderUrl}=require("../src/worldz-app/provider-bindings");

const PUBLIC_MODE=process.env.WORLDZAPP_ALLOW_PUBLIC_VERIFY==="1";
const SOLANA_VERIFY_ADDRESS=process.env.WORLDZAPP_SOLANA_VERIFY_ADDRESS||"Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u";
const requested=process.argv.slice(2);

function redact(url){
  if(!url) return null;
  try{
    const parsed=new URL(url);
    return parsed.origin+parsed.pathname;
  }catch{return "[configured]";}
}

async function executeCheck(name,chain,method,args){
  const def=DEFINITIONS[chain];
  if(!def) return {name,chain,state:"FAIL",error:"WORLDZAPP_PROVIDER_CHAIN_UNSUPPORTED"};
  let provider;
  try{ provider=resolveProviderUrl(def,process.env); }
  catch(error){ return {name,chain,state:"FAIL",error:String(error.message||error)}; }
  try{
    const adapter=createProviderAdapter(chain);
    const handler=adapter.methods[method];
    if(typeof handler!=="function") throw new Error("WORLDZAPP_REQUIRED_READ_METHOD_MISSING:"+method);
    const snapshot=await handler(args||{});
    if(snapshot?.state!=="READ_OK") throw new Error("WORLDZAPP_LIVE_READ_NOT_OK:"+String(snapshot?.state||"UNKNOWN"));
    return {name,chain,state:"PASS",provider:redact(provider),snapshot};
  }catch(error){
    return {name,chain,state:"FAIL",provider:redact(provider),error:String(error.message||error)};
  }
}

(async()=>{
  const checks=[
    ["solana","solana","getHealth",null],
    ["solana-balance","solana","getBalanceSummary",{address:SOLANA_VERIFY_ADDRESS}],
    ["base","base","getHealth",null],
    ["bnb","bnb","getHealth",null],
    ["hyperevm","hyperevm","getHealth",null],
    ["xrpl","xrpl","getHealth",null],
    ["sui","sui","getHealth",null],
    ["robinhood","robinhood","getHealth",null]
  ];
  if(!PUBLIC_MODE){
    checks.push(["ethereum","ethereum","getHealth",null]);
  }
  const selected=requested.length
    ? checks.filter(([name,chain])=>requested.includes(name)||requested.includes(chain))
    : checks;
  const results=[];
  for(const [name,chain,method,args] of selected){
    results.push(await executeCheck(name,chain,method,args));
  }
  const required=selected.map(item=>item[0]);
  const incomplete=required.filter(name=>results.find(item=>item.name===name)?.state!=="PASS");
  const out={
    schema:"WORLDZ-APP-LIVE-READ-PROOF-V1",
    generatedAt:new Date().toISOString(),
    mode:PUBLIC_MODE?"PUBLIC_VERIFICATION_ENDPOINTS":"ENV_CONFIGURED_PROVIDERS",
    execution:false,
    results
  };
  const target=process.env.WORLDZAPP_READ_PROOF_OUT;
  if(target){
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(out,null,2)+"
");
  }
  process.stdout.write(JSON.stringify(out,null,2)+"
");
  if(incomplete.length){
    console.error("Required live-read proof entries not PASS:",incomplete.join(", "));
    process.exitCode=1;
  }
})().catch(error=>{console.error(error);process.exitCode=1});
