// Dev City: import independently verified public developer wallets from Solfate's public API.
// Source code: https://github.com/solfate/website/blob/main/src/app/api/lists/developers/route.ts
import fs from 'node:fs/promises';
const source='https://solfate.com/api/lists/developers';
const response=await fetch(source,{headers:{accept:'application/json','user-agent':'Worldz-Dev-City-public-research/1.0'},signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error('DevList API HTTP '+response.status);
const data=await response.json();
if(!Array.isArray(data.members))throw Error('Unexpected DevList schema: members missing');
const valid=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const wallets=new Map();
for(const m of data.members){const a=String(m?.owner||'').trim();if(valid.test(a)&&!wallets.has(a))wallets.set(a,{chain:'solana',address:a,developerEvidence:'Solfate DevList active membership',source,sourceTokenMint:m.token||null,verification:'third-party-verified',worldzPartner:false,worldzDistributionApproved:false})}
const candidates=[...wallets.values()].sort((a,b)=>a.address.localeCompare(b.address));
const out={version:'WORLDZ-DEV-CITY-RESEARCH-V1',generatedAt:new Date().toISOString(),source,sourceReportedCount:data.count||null,researchTarget:250,uniqueDeveloperWallets:candidates.length,distributionSeats:100,distributionApproved:0,notes:'Verified by Solfate, not Worldz. Research list only; no endorsements or transfers.',candidates};
await fs.mkdir('launchpad.cryptoworldz.xyz/wallet-snapshots',{recursive:true});
await fs.writeFile('launchpad.cryptoworldz.xyz/wallet-snapshots/dev-city-developers.latest.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({uniqueDeveloperWallets:candidates.length,sourceReportedCount:data.count,goalMet:candidates.length>=250}));
if(!candidates.length)process.exitCode=1;
