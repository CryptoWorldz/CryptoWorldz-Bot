// Collect actual token-creation records, not HTML page wallet strings.
// Bitquery supports multi-launchpad instruction-level creator/signer attribution.
// Requires BITQUERY_ACCESS_TOKEN, configured as a GitHub Actions secret.
import fs from 'node:fs/promises';
const token=process.env.BITQUERY_ACCESS_TOKEN;
if(!token)throw Error('BITQUERY_ACCESS_TOKEN is required; no addresses fabricated.');
const endpoint='https://streaming.bitquery.io/eap';
const query=`query { Solana(dataset: archive) { Instructions(limit: {count: 1000}, orderBy: {descending: Block_Time}, where: {Transaction: {Result: {Success: true}}, any: [{Instruction: {Program: {Address: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}, Method: {in: ["create", "create_v2"]}}}}, {Instruction: {Program: {Address: {is: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj"}, Method: {is: "initialize_v2"}}}}]}) { Block { Time } Transaction { Signature Signer } Instruction { Program { Address Method } } } } }`;
const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({query}),signal:AbortSignal.timeout(30000)});
if(!r.ok)throw Error('Bitquery HTTP '+r.status+': '+(await r.text()).slice(0,200));
const data=await r.json();if(data.errors?.length)throw Error(JSON.stringify(data.errors));
const records=data.data?.Solana?.Instructions;if(!Array.isArray(records))throw Error('No Solana Instructions array');
const addresses=new Map();
for(const x of records){const a=x.Transaction?.Signer;const signature=x.Transaction?.Signature;const program=x.Instruction?.Program;if(typeof a!=='string'||!signature||!program?.Address)continue;const key=program.Address+':'+a;let row=addresses.get(key);if(!row){row={chain:'solana',address:a,programId:program.Address,launchCountInSample:0,exampleTransaction:signature,source:'Bitquery Solana successful create instructions',role:'transaction signer, not necessarily fee recipient',developerIdentityVerified:false,worldzDistributionApproved:false};addresses.set(key,row)}row.launchCountInSample++}
const out={generatedAt:new Date().toISOString(),method:'On-chain token creation instruction signatures and signer wallets',sampledInstructions:records.length,uniqueCreatorSignerWallets:addresses.size,limitations:['Only Pump.fun and Raydium LaunchLab program IDs in initial query','Transaction signer is evidence of launch involvement, not verified developer identity','Sample of latest 1000 instructions, not platform top 50 all-time'],candidates:[...addresses.values()]};
await fs.mkdir('launchpad.cryptoworldz.xyz/wallet-snapshots',{recursive:true});
await fs.writeFile('launchpad.cryptoworldz.xyz/wallet-snapshots/onchain-launch-creators.latest.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sampledInstructions:records.length,uniqueCreatorSignerWallets:addresses.size}));
