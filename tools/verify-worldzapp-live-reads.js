#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {DEFINITIONS,createProviderAdapter}=require("../src/worldz-app/provider-bindings");

const chains=process.argv.slice(2);
const selected=chains.length?chains:Object.keys(DEFINITIONS);
const results=[];

(async()=>{
  for(const chain of selected){
    const def=DEFINITIONS[chain];
    if(!def){results.push({chain,state:"UNSUPPORTED"});continue}
    if(!process.env[def.env]){results.push({chain,state:"NOT_CONFIGURED",env:def.env});continue}
    try{
      const adapter=createProviderAdapter(chain);
      const snapshot=await adapter.methods.getHealth();
      results.push({chain,state:"LIVE_READ_VERIFIED",observedAt:snapshot.observedAt,data:snapshot.data});
    }catch(error){
      results.push({chain,state:"READ_FAILED",error:String(error.message||error)});
    }
  }
  const out={schema:"WORLDZ-APP-LIVE-READ-PROOF-V1",generatedAt:new Date().toISOString(),results};
  const target=process.env.WORLDZAPP_READ_PROOF_OUT;
  if(target){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(out,null,2)+"\n")}
  process.stdout.write(JSON.stringify(out,null,2)+"\n");
  process.exitCode=results.some(r=>r.state==="READ_FAILED")?1:0;
})().catch(error=>{console.error(error);process.exitCode=1});
