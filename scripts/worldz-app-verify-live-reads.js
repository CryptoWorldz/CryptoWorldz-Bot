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
    ["solana",()=>solanaAdapter({providerUrl:endpoint("solana")}).getHealth()],
    ["solana-balance",()=>solanaAdapter({providerUrl:endpoint("solana")}).getBalanceSummary({address:targetWallet})],
    ["base",()=>evmAdapter({id:"base",providerUrl:endpoint("base"),expectedChainId:8453}).getHealth()],
    ["bnb",()=>evmAdapter({id:"bnb",providerUrl:endpoint("bnb"),expectedChainId:56}).getHealth()],
    ["hyperevm",()=>evmAdapter({id:"hyperevm",providerUrl:endpoint("hyperevm"),expectedChainId:999}).getHealth()],
    ["xrpl",()=>xrplAdapter({providerUrl:endpoint("xrpl")}).getHealth()],
    ["sui",()=>suiAdapter({providerUrl:endpoint("sui")}).getHealth()],
    ["robinhood",()=>evmAdapter({id:"robinhood",providerUrl:endpoint("robinhood"),expectedChainId:4663}).getHealth()]
  ];
  for(const [name,task] of jobs){
    const chain=name==="solana-balance"?"solana":name;
    const url=endpoint(chain);
    if(!url){proof.results.push({name,state:"SKIPPED_PROVIDER_NOT_CONFIGURED"});continue;}
    try{
      const snapshot=await task();
      proof.results.push({name,state:"PASS",provider:redact(url),snapshot});
    }catch(error){
      proof.results.push({name,state:"FAIL",provider:redact(url),error:String(error.message||error)});
    }
  }
  const required=["solana","solana-balance","base","bnb","hyperevm","xrpl","sui","robinhood"];
  const failed=proof.results.filter(item=>required.includes(item.name)&&item.state==="FAIL");
  console.log(JSON.stringify(proof,null,2));
  if(failed.length) process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1});
