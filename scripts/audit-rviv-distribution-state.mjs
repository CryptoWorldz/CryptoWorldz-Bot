const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const HIST_RPC='https://api.mainnet-beta.solana.com';
const MINT='DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R';
const SOURCE_ATA='28CwdVt2y997WZqTzEuBpuwoyVYAj6JcaD4qDMzyCdtn';
const owners=[
 ['JayJayTeamDev','Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u'],
 ['Limited Edition','5HiRrJRU1fyW5eXzHgvSgykBZ6PtrSVzg8A1e8eHB1u9'],
 ['Next Big Coin Dev','3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt'],
 ['PdCrew','DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j'],
 ['Purple Diamond Crew','ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U'],
 ['Purple PDC','G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3'],
 ['SolSavewXRP','5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9'],
 ['DevCity staging','2b9kxWY6zNCYh6D3WzZBFsvzck9tSkscaiCbap7CSB1m'],
 ['Impact staging','5HR1DFmgX23b3fmk8PADgCb1ejUAXnSSsjcAoGrGrGHW']
];
async function rpc(method,params=[]){
 const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:method,method,params})});
 const j=await r.json();
 if(!r.ok||j.error)throw new Error(method+' failed '+JSON.stringify(j.error||r.status));
 return j.result;
}
async function histRpc(method,params=[]){
 const r=await fetch(HIST_RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:method,method,params})});
 const j=await r.json();
 if(!r.ok||j.error)throw new Error('history '+method+' failed '+JSON.stringify(j.error||r.status));
 return j.result;
}
async function ownerRaw(owner){
 const out=await rpc('getTokenAccountsByOwner',[owner,{mint:MINT},{encoding:'jsonParsed',commitment:'confirmed'}]);
 return (out?.value||[]).reduce((n,x)=>n+BigInt(x?.account?.data?.parsed?.info?.tokenAmount?.amount||'0'),0n);
}
const supply=await rpc('getTokenSupply',[MINT,{commitment:'confirmed'}]);
const source=await rpc('getTokenAccountBalance',[SOURCE_ATA,{commitment:'confirmed'}]);
console.log('RVIV_LIVE_SUPPLY_RAW='+supply.value.amount+' UI='+supply.value.uiAmountString);
console.log('RVIV_SQUADS_SOURCE_RAW='+source.value.amount+' UI='+source.value.uiAmountString);
let known=0n;
for(const [label,owner] of owners){
 const raw=await ownerRaw(owner); known+=raw;
 console.log('RVIV_OWNER_BALANCE '+label+' '+owner+' raw='+raw+' ui='+(Number(raw)/1e6).toFixed(6));
}
console.log('RVIV_AUDITED_OWNER_BALANCES_RAW='+known);

try{\nconst signatures=await histRpc('getSignaturesForAddress',[SOURCE_ATA,{limit:50,commitment:'confirmed'}]);
for(const row of signatures){
 const tx=await histRpc('getTransaction',[row.signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}]);
 const groups=[...(tx?.transaction?.message?.instructions||[])];
 for(const inner of (tx?.meta?.innerInstructions||[])) groups.push(...(inner.instructions||[]));
 for(const ix of groups){
  const p=ix?.parsed;
  if(!p||!['transfer','transferChecked'].includes(p.type))continue;
  const info=p.info||{};
  if(info.source!==SOURCE_ATA)continue;
  const raw=String(info.tokenAmount?.amount??info.amount??'unknown');
  console.log('RVIV_SOURCE_OUTFLOW signature='+row.signature+' blockTime='+String(row.blockTime||'')+' type='+p.type+' raw='+raw+' destination='+String(info.destination||''));
 }
}
\n}catch(e){console.log('RVIV_HISTORY_AUDIT_UNAVAILABLE '+(e?.message||e));}\n