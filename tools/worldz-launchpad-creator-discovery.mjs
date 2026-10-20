import fs from 'node:fs/promises';
const endpoint='https://frontend-api-v3.pump.fun/coins';
const url=endpoint+'?offset=0&limit=100&sort=market_cap&order=DESC&includeNsfw=false';
const response=await fetch(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error('Pump.fun public coin API HTTP '+response.status);
const raw=await response.json();
const coins=Array.isArray(raw)?raw:Array.isArray(raw.data)?raw.data:null;
if(!coins)throw Error('Unexpected public coin API schema');
const valid=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const seen=new Set();
const creators=[];
for(const c of coins){const a=String(c.creator||'').trim();if(!valid.test(a)||seen.has(a))continue;seen.add(a);creators.push({chain:'solana',address:a,platform:'Pump.fun',role:'public token creator',source:url,tokenMint:c.mint||null,marketCapUsd:c.usd_market_cap??null,volumeRankVerified:false,developerIdentityVerified:false,distributionApproved:false});if(creators.length===50)break}
const result={version:1,generatedAt:new Date().toISOString(),method:'Public Pump.fun coin listings sorted by market cap; distinct creator addresses, NOT top-volume ranking',platform:'Pump.fun',source:url,creatorCount:creators.length,creators};
await fs.mkdir('launchpad.cryptoworldz.xyz/wallet-snapshots',{recursive:true});
await fs.writeFile('launchpad.cryptoworldz.xyz/wallet-snapshots/pumpfun-creator-candidates.latest.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({creatorCount:creators.length,coinsScanned:coins.length}));
if(!creators.length)process.exitCode=1;
