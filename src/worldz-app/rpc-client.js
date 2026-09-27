"use strict";
const {URL}=require("node:url");

const DEFAULT_TIMEOUT_MS=8000;

function validateRpcUrl(value){
  if(!value) throw new Error("WORLDZAPP_RPC_URL_REQUIRED");
  const url=new URL(String(value));
  if(!["https:","http:"].includes(url.protocol)) throw new Error("WORLDZAPP_RPC_PROTOCOL_NOT_ALLOWED");
  if(url.username || url.password) throw new Error("WORLDZAPP_RPC_INLINE_CREDENTIALS_FORBIDDEN");
  return url.toString();
}

async function requestJson(url,payload,options={}){
  const endpoint=validateRpcUrl(url);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),options.timeoutMs||DEFAULT_TIMEOUT_MS);
  try{
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify(payload),
      signal:controller.signal
    });
    if(!response.ok) throw new Error("WORLDZAPP_RPC_HTTP_"+response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonRpc(url,method,params=[],options={}){
  const body=await requestJson(url,{jsonrpc:"2.0",id:options.id||1,method,params},options);
  if(body.error) throw new Error("WORLDZAPP_RPC_ERROR_"+String(body.error.code||"UNKNOWN")+":"+String(body.error.message||""));
  return body.result;
}

async function graphQL(url,query,variables={},options={}){
  const body=await requestJson(url,{query,variables},options);
  if(Array.isArray(body.errors) && body.errors.length){
    throw new Error("WORLDZAPP_GRAPHQL_ERROR:"+body.errors.map(item=>item.message||"unknown").join(" | "));
  }
  return body.data;
}

module.exports={DEFAULT_TIMEOUT_MS,validateRpcUrl,requestJson,jsonRpc,graphQL};
