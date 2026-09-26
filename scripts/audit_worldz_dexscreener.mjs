import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

const canonical=JSON.parse(await fs.readFile('worldzpad-mainnet/worlddexpush/dexscreener-worldz.v1.json','utf8'));
const publicPack=JSON.parse(await fs.readFile('launchpad.cryptoworldz.xyz/worlddexpush/dexscreener/package.json','utf8'));
const registry=JSON.parse(await fs.readFile('worldzpad-mainnet/token-identity/worldz-token-registry.v1.json','utf8'));
const report={schema:'WORLDZ-DEXSCREENER-AUDIT-V1',generatedAt:new Date().toISOString(),tokens:[]};

function fail(msg){ throw new Error(msg); }
function sorted(values){ return [...values].sort(); }

const publicComparable=structuredClone(publicPack);
delete publicComparable.source;
if(!isDeepStrictEqual(publicComparable,canonical)) fail('Public DEX Screener package drifted from canonical package');

const live=registry.tokens.filter(t=>t.lifecycle==='LIVE'&&t.chain==='Solana');
const liveByMint=new Map(live.map(t=>[t.canonicalMint,t]));
const packageByMint=new Map(canonical.tokens.map(t=>[t.mint,t]));
if(packageByMint.size!==canonical.tokens.length) fail('DEX Screener package contains duplicate mints');
if(!isDeepStrictEqual(sorted(liveByMint.keys()),sorted(packageByMint.keys()))) fail('DEX Screener package must contain every LIVE Solana Worldz token exactly once');

async function getJson(url,timeoutMs=20000){
  const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'WorldDexPush-DEXScreener-Audit/1.0'},signal:ctl.signal});
    const text=await r.text(); let body=null; try{body=JSON.parse(text)}catch{}
    return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,500)};
  }catch(e){return {ok:false,status:null,body:null,error:String(e)}}
  finally{clearTimeout(timer)}
}

let hardFail=false;
for(const token of canonical.tokens){
  const source=liveByMint.get(token.mint);
  if(!source) fail('Unknown/non-LIVE DEX Screener token '+token.mint);

  const expected={
    launchOrder:source.launchOrder,slug:source.slug,name:source.name,symbol:source.symbol,
    mint:source.canonicalMint,decimals:source.decimals,image:source.image,website:source.website,
    x:source.x,telegram:source.telegram,publicMetadata:source.publicMetadata
  };
  for(const [key,value] of Object.entries(expected)){
    if(token[key]!==value) fail('DEX Screener package '+token.symbol+' canonical drift: '+key);
  }
  if(token.expectedMarket.pairAddress!==(source.market?.pool??null)) fail('DEX Screener package '+token.symbol+' expected pair drift');

  const pairUrl=canonical.provider.pairApi.replace('{CHAIN}',token.chain).replace('{TOKEN}',token.mint);
  const pairResponse=await getJson(pairUrl);
  const rawPairs=Array.isArray(pairResponse.body)?pairResponse.body:(Array.isArray(pairResponse.body?.pairs)?pairResponse.body.pairs:[]);
  const pairs=rawPairs.filter(p=>p?.baseToken?.address===token.mint||p?.quoteToken?.address===token.mint);

  let state='PENDING_NOT_INDEXED';
  let identityMatch=false;
  let expectedPairSeen=false;
  let priceSeen=false;
  let activeBoosts=0;

  if(!pairResponse.ok){
    state='FAIL_PROVIDER_UNAVAILABLE';
    hardFail=true;
  }else if(!Array.isArray(pairResponse.body)&&!Array.isArray(pairResponse.body?.pairs)){
    state='FAIL_PROVIDER_PAYLOAD_INVALID';
    hardFail=true;
  }else if(pairs.length){
    for(const p of pairs){
      const side=p.baseToken?.address===token.mint?p.baseToken:p.quoteToken;
      const name=String(side?.name??'');
      const symbol=String(side?.symbol??'');
      if(name===token.name&&symbol===token.symbol) identityMatch=true;
      else if(name||symbol){
        state='FAIL_WRONG_NONBLANK_IDENTITY';
        hardFail=true;
      }
      if(p.pairAddress===token.expectedMarket.pairAddress) expectedPairSeen=true;
      if(p.priceUsd!=null) priceSeen=true;
      activeBoosts=Math.max(activeBoosts,Number(p.boosts?.active||0));
    }
    if(!hardFail || state!=='FAIL_WRONG_NONBLANK_IDENTITY'){
      if(!identityMatch) state='PENDING_IDENTITY';
      else if(!expectedPairSeen) state='PENDING_EXPECTED_PAIR';
      else if(!priceSeen) state='PENDING_PRICE';
      else state='PASS';
    }
  }

  const ordersUrl=canonical.provider.ordersApi.replace('{CHAIN}',token.chain).replace('{TOKEN}',token.mint);
  const orders=await getJson(ordersUrl);
  if(!orders.ok){
    hardFail=true;
    if(!state.startsWith('FAIL_')) state='FAIL_ORDERS_STATUS_UNAVAILABLE';
  }

  const goldenTickerActive=activeBoosts>=canonical.goldenTicker.requiredActiveBoosts;
  report.tokens.push({
    mint:token.mint,symbol:token.symbol,state,
    provider:{pairHttpStatus:pairResponse.status,ordersHttpStatus:orders.status},
    checks:{identityMatch,expectedPairSeen,priceSeen,indexed:pairs.length>0},
    expectedPairAddress:token.expectedMarket.pairAddress,
    pairCount:pairs.length,
    activeBoosts,
    goldenTickerThreshold:canonical.goldenTicker.requiredActiveBoosts,
    goldenTickerActive,
    orders:Array.isArray(orders.body)?orders.body:[],
    error:pairResponse.error||orders.error||null
  });
  console.log('DEXSCREENER_WORLDZ',token.symbol,state,'pairs='+pairs.length,'boosts='+activeBoosts,'golden='+goldenTickerActive);
}

report.summary={
  liveTokens:live.length,
  packagedTokens:canonical.tokens.length,
  pass:report.tokens.filter(t=>t.state==='PASS').length,
  pending:report.tokens.filter(t=>t.state.startsWith('PENDING_')).length,
  failed:report.tokens.filter(t=>t.state.startsWith('FAIL_')).length
};
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/worldz-dexscreener-status.json',JSON.stringify(report,null,2)+'\n');
console.log('WORLDZ_DEXSCREENER_REPORT=artifacts/worldz-dexscreener-status.json');
console.log('WORLDZ_DEXSCREENER_SUMMARY='+JSON.stringify(report.summary));
if(hardFail) process.exitCode=1;
