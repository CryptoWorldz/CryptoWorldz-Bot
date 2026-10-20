// Public-data discovery only. Never infer private wallet ownership or partnership.
import fs from 'node:fs/promises';
const base='https://api.xrpl.to/v1';
const out='launchpad.cryptoworldz.xyz/wallet-snapshots';
async function get(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(r.status+' '+url);return r.json()}
const tokenIds=(process.env.XRPL_TOKEN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const snapshot={version:1,generatedAt:new Date().toISOString(),chain:'xrpl',sources:[],tokens:[],warnings:[]};
for(const id of tokenIds.slice(0,3)){try{const url=base+'/holders/list/'+encodeURIComponent(id)+'?limit=100&sort=balance&order=desc';const d=await get(url);if(!d.success||!Array.isArray(d.richList))throw Error('bad response');snapshot.tokens.push({id,holderCount:d.length,holders:d.richList.filter(x=>/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(x.account)).map(x=>({rank:x.rank,address:x.account,balance:x.balance,holding:x.holding,source:url,attribution:x.name||null,verifiedOwner:false,consent:false}))});snapshot.sources.push(url)}catch(e){snapshot.warnings.push(id+': '+String(e.message))}}
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/xrpl-token-holders.latest.json',JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({tokenCount:snapshot.tokens.length,holderRows:snapshot.tokens.reduce((n,t)=>n+t.holders.length,0),warnings:snapshot.warnings},null,2));
