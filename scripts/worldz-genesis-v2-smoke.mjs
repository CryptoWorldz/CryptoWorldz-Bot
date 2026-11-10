import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const ui=readFileSync(new URL('../launchpad.cryptoworldz.xyz/worldz-genesis-v2/index.html',import.meta.url),'utf8');
const key=ui.match(/const SUPABASE_ANON_KEY="([^"]+)"/)?.[1];
assert.ok(key,'preview public anon JWT missing');
const manifest=JSON.parse(readFileSync(new URL('../config/worldz-genesis-v2.json',import.meta.url),'utf8'));
const payload={...manifest,network:'devnet'};
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);
try{
 const rpc=await fetch('https://api.devnet.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getLatestBlockhash',params:[{commitment:'confirmed'}]}),signal:controller.signal});
 const rpcData=await rpc.json();assert.ok(rpc.ok&&rpcData?.result?.value?.blockhash,'Solana devnet RPC blockhash not confirmed');
 console.log('PASS: Solana devnet RPC returned confirmed blockhash');
 const url='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-genesis-v2-preview';
 const headers={'content-type':'application/json',apikey:key,authorization:'Bearer '+key};
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});
 const data=await response.json();assert.equal(response.status,200,'authenticated preview HTTP 200 required');assert.equal(data.validation,'passed');assert.equal(data.devnetReachable,true);assert.equal(data.mintEnabled,false);assert.equal(data.transactionBroadcastEnabled,false);assert.equal(data.allocations.length,11);
 console.log('PASS: Authenticated preview validated 11 allocations; no mint/broadcast');
 const rejected=await fetch(url,{method:'POST',headers,body:JSON.stringify({...payload,allocations:payload.allocations.slice(1)}),signal:controller.signal});
 assert.equal(rejected.status,422,'invalid allocation request must fail closed');
 console.log('PASS: Invalid allocation payload rejected');
}finally{clearTimeout(timer);}
