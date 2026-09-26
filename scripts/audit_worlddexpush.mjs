import fs from 'node:fs/promises';

const config = JSON.parse(await fs.readFile('worldzpad-mainnet/worlddexpush/worlddexpush.v1.json','utf8'));
const out = {schema:'WORLDDEXPUSH-STATUS-V1',generatedAt:new Date().toISOString(),tokens:[]};

async function getJson(url, timeoutMs=15000){
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{'user-agent':'WorldDexPush/1.0','accept':'application/json'},signal:ctrl.signal});
    const text=await r.text(); let body=null; try{body=JSON.parse(text)}catch{}
    return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,300)};
  }catch(e){return {ok:false,status:null,body:null,error:String(e)}}
  finally{clearTimeout(timer)}
}

for(const token of config.tokens){
  const row={canonical:token,jupiter:{},dexScreener:{},checks:{}};

  const j=await getJson(config.jupiter.tokenApi.replace('{MINT}',encodeURIComponent(token.mint)));
  row.jupiter.httpStatus=j.status;
  if(Array.isArray(j.body)){
    const hit=j.body.find(x=>x.id===token.mint||x.address===token.mint)||j.body[0]||null;
    if(hit){
      row.jupiter.data={
        name:hit.name??null,symbol:hit.symbol??null,icon:hit.icon??hit.logoURI??null,
        isVerified:hit.isVerified??null,usdPrice:hit.usdPrice??null,liquidity:hit.liquidity??null,
        organicScore:hit.organicScore??null,organicScoreLabel:hit.organicScoreLabel??null,
        holderCount:hit.holderCount??null
      };
      row.checks.jupiterName=hit.name===token.name;
      row.checks.jupiterSymbol=hit.symbol===token.symbol;
      row.checks.jupiterIcon=!!(hit.icon||hit.logoURI);
      row.checks.jupiterPrice=hit.usdPrice!=null;
      row.checks.jupiterIndexed=true;
    }
  }
  if(!row.jupiter.data) row.jupiter.error=j.error||'Token not returned';

  const durl=config.dexScreener.pairApi.replace('{CHAIN}',token.chain).replace('{TOKEN}',token.mint);
  const d=await getJson(durl);
  row.dexScreener.httpStatus=d.status;
  const pairs=Array.isArray(d.body)?d.body:(Array.isArray(d.body?.pairs)?d.body.pairs:[]);
  row.dexScreener.pairs=pairs.map(p=>({
    pairAddress:p.pairAddress??null,dexId:p.dexId??null,url:p.url??null,
    baseToken:p.baseToken??null,quoteToken:p.quoteToken??null,
    priceUsd:p.priceUsd??null,liquidityUsd:p.liquidity?.usd??null,
    pairCreatedAt:p.pairCreatedAt??null,activeBoosts:p.boosts?.active??0,
    imageUrl:p.info?.imageUrl??null,
    websites:p.info?.websites??[],socials:p.info?.socials??[]
  }));
  row.checks.dexIndexed=pairs.length>0;
  row.checks.dexNameSymbol=pairs.some(p=>p.baseToken?.address===token.mint&&p.baseToken?.name===token.name&&p.baseToken?.symbol===token.symbol);
  row.checks.dexPrice=pairs.some(p=>p.priceUsd!=null);
  const activeBoosts=Math.max(0,...pairs.map(p=>Number(p.boosts?.active||0)));
  row.dexScreener.activeBoosts=activeBoosts;
  row.dexScreener.goldenTickerThreshold=config.dexScreener.goldenTicker.requiredActiveBoosts;
  row.dexScreener.goldenTickerActive=activeBoosts>=config.dexScreener.goldenTicker.requiredActiveBoosts;

  const ourl=config.dexScreener.ordersApi.replace('{CHAIN}',token.chain).replace('{TOKEN}',token.mint);
  const orders=await getJson(ourl);
  row.dexScreener.ordersHttpStatus=orders.status;
  row.dexScreener.orders=Array.isArray(orders.body)?orders.body:[];

  out.tokens.push(row);
  console.log('WORLDDEXPUSH',token.symbol,JSON.stringify(row.checks),'boosts='+activeBoosts);
}

await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/worlddexpush-status.json',JSON.stringify(out,null,2)+'\n');
console.log('WORLDDEXPUSH_REPORT=artifacts/worlddexpush-status.json');
