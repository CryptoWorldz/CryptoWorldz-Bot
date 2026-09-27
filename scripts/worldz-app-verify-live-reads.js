#!/usr/bin/env node
"use strict";

const fs=require("node:fs");
const path=require("node:path");
const {evmAdapter,solanaAdapter,xrplAdapter,suiAdapter}=require("../src/worldz-app/read-adapters");

const root=path.resolve(__dirname,"..");
const bindings=JSON.parse(fs.readFileSync(path.join(root,"launchpad.cryptoworldz.xyz","worldz-app","core","provider-bindings.json"),"utf8"));
const targetWallet=process.env.WORLDZAPP_SOLANA_VERIFY_ADDRESS||"Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u";
const usePublic=process.env.WORLDZAPP_ALLOW_PUBLIC_VERIFY==="1";

function endpoint(chain){
  const binding=bindings.providers.find(item=>item.chain===chain);
  const envName=bindings.envNames[chain];
  return process.env[envName] || (usePublic ? binding?.publicVerificationEndpoint : null);
}
function redact(url){
  if(!url) return null;
  try{
    const u=new URL(url);
    return u.origin+u.pathname.replace(/\/v2\/.+$/,"/v2/[REDACTED]");
  }catch{return "[configured]";}
}
async function run(){
  const proof={
    schema:"WORLDZ-APP-LIVE-READ-PROOF-V1",
    observedAt:new Date().toISOString(),
    mode:usePublic?"PUBLIC_VERIFICATION_ENDPOINTS":"ENV_CONFIGURED_PROVIDERS",
    execution:false,
    results:[]
  };
  const jobs=[
    ["solana",()=>solanaAdapter({providerUrl:endpoint("solana")}).methods.getHealth()],
    ["solana-balance",()=>solanaAdapter({providerUrl:endpoint("solana")}).methods.getBalanceSummary({address:targetWallet})],
    ["base",()=>evmAdapter({id:"base",providerUrl:endpoint("base"),expectedChainId:8453}).methods.getHealth()],
    ["bnb",()=>evmAdapter({id:"bnb",providerUrl:endpoint("bnb"),expectedChainId:56}).methods.getHealth()],
    ["hyperevm",()=>evmAdapter({id:"hyperevm",providerUrl:endpoint("hyperevm"),expectedChainId:999}).methods.getHealth()],
    ["xrpl",()=>xrplAdapter({providerUrl:endpoint("xrpl")}).methods.getHealth()],
    ["sui",()=>suiAdapter({providerUrl:endpoint("sui")}).methods.getHealth()],
    ["robinhood",()=>evmAdapter({id:"robinhood",providerUrl:endpoint("robinhood"),expectedChainId:4663}).methods.getHealth()]
  ];
  for(const [name,task] of jobs){
    const chain=name==="solana-balance"?"solana":name;
    const url=endpoint(chain);
    if(!url){proof.results.push({name,state:"SKIPPED_PROVIDER_NOT_CONFIGURED"});continue;}
    try{
      const snapshot=await task();
      if(snapshot?.state!=="READ_OK") throw new Error("WORLDZAPP_LIVE_READ_NOT_OK:"+String(snapshot?.state||"UNKNOWN"));
      proof.results.push({name,state:"PASS",provider:redact(url),snapshot});
    }catch(error){
      proof.results.push({name,state:"FAIL",provider:redact(url),error:String(error.message||error)});
    }
  }
  const required=["solana","solana-balance","base","bnb","hyperevm","xrpl","sui","robinhood"];
  const incomplete=required.filter(name=>proof.results.find(item=>item.name===name)?.state!=="PASS");
  console.log(JSON.stringify(proof,null,2));
  if(incomplete.length){
    console.error("Required live-read proof entries not PASS:",incomplete.join(", "));
    process.exitCode=1;
  }
}
run().catch(error=>{console.error(error);process.exitCode=1});
