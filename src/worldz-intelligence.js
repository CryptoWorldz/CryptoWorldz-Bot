'use strict';

const DEFAULT_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

async function fetchJson(url,{fetchImpl=fetch,timeoutMs=12000,method='GET',body=null,headers={}}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{
      method,
      headers:{accept:'application/json','user-agent':'WorldzIntelligence/1.0',...headers},
      body:body==null?undefined:JSON.stringify(body),
      signal:controller.signal
    });
    const text=await response.text();
    let parsed=null;try{parsed=JSON.parse(text);}catch{}
    if(!response.ok){
      const err=new Error('HTTP '+response.status);err.status=response.status;err.body=parsed;throw err;
    }
    return parsed;
  }finally{clearTimeout(timer);}
}

async function rpcCall(rpcUrl,method,params,options={}){
  const body=await fetchJson(rpcUrl,{...options,method:'POST',headers:{'content-type':'application/json',...(options.headers||{})},body:{jsonrpc:'2.0',id:1,method,params}});
  if(body?.error)throw new Error(body.error.message||'rpc_error');
  return body?.result;
}

function source(provider,status,reference=null,note=null){
  return {provider,status,reference,note};
}

function asNumber(v){const n=Number(v);return Number.isFinite(n)?n:null;}

function normalizeJupiter(raw,address){
  const rows=Array.isArray(raw)?raw:[];
  const row=rows.find(x=>x?.id===address||x?.address===address)||rows[0]||null;
  if(!row)return null;
  return {
    provider:'Jupiter Tokens V2',
    name:row.name||null,
    symbol:row.symbol||null,
    verified:row.isVerified===true,
    organicScore:asNumber(row.organicScore),
    organicScoreLabel:row.organicScoreLabel||null,
    holderCount:asNumber(row.holderCount),
    liquidityUsd:asNumber(row.liquidity),
    usdPrice:asNumber(row.usdPrice),
    devBalancePercent:asNumber(row.devBalancePercentage??row.devBalancePercent),
    raw:row
  };
}

function normalizeDex(raw,address){
  const rows=Array.isArray(raw)?raw:[];
  const unique=new Map();
  for(const row of rows){
    const key=String(row?.pairAddress||row?.url||Math.random());
    if(!unique.has(key))unique.set(key,row);
  }
  const pairs=[...unique.values()];
  const sorted=[...pairs].sort((a,b)=>Number(b?.liquidity?.usd||0)-Number(a?.liquidity?.usd||0));
  const deepest=sorted[0]||null;
  const token=deepest?(deepest?.baseToken?.address===address?deepest.baseToken:deepest?.quoteToken?.address===address?deepest.quoteToken:deepest.baseToken):null;
  return {
    provider:'DEX Screener',
    pairCount:pairs.length,
    aggregateObservedLiquidityUsd:pairs.reduce((sum,x)=>sum+Number(x?.liquidity?.usd||0),0),
    deepestPair:deepest?{
      pairAddress:deepest.pairAddress||null,
      dexId:deepest.dexId||null,
      url:deepest.url||null,
      liquidityUsd:asNumber(deepest?.liquidity?.usd),
      priceUsd:asNumber(deepest?.priceUsd),
      volume24hUsd:asNumber(deepest?.volume?.h24),
      buys24h:asNumber(deepest?.txns?.h24?.buys),
      sells24h:asNumber(deepest?.txns?.h24?.sells)
    }:null,
    name:token?.name||null,
    symbol:token?.symbol||null
  };
}

function normalizeGecko(raw){
  const a=raw?.data?.attributes||{};
  const pools=raw?.data?.relationships?.top_pools?.data;
  return {
    provider:'GeckoTerminal',
    name:a.name||null,
    symbol:a.symbol||null,
    priceUsd:asNumber(a.price_usd),
    fdvUsd:asNumber(a.fdv_usd),
    totalReserveUsd:asNumber(a.total_reserve_in_usd),
    topPoolCount:Array.isArray(pools)?pools.length:null
  };
}

function normalizeRugCheck(raw){
  if(!raw||typeof raw!=='object')return null;
  const meta=raw.tokenMeta||raw.token||{};
  const risks=Array.isArray(raw.risks)?raw.risks.map(x=>({
    name:x?.name||x?.type||'risk',
    level:x?.level||x?.severity||null,
    description:x?.description||x?.message||null,
    value:x?.value??null
  })):[];
  return {
    provider:'RugCheck',
    creatorCandidate:typeof raw.creator==='string'?raw.creator:null,
    name:meta.name||null,
    symbol:meta.symbol||null,
    score:asNumber(raw.score),
    risks,
    rawRiskCount:risks.length
  };
}

async function solanaMintEvidence(address,{rpcUrl=DEFAULT_SOLANA_RPC,fetchImpl=fetch}={}){
  const [account,largest]=await Promise.all([
    rpcCall(rpcUrl,'getAccountInfo',[address,{encoding:'jsonParsed',commitment:'confirmed'}],{fetchImpl}),
    rpcCall(rpcUrl,'getTokenLargestAccounts',[address,{commitment:'confirmed'}],{fetchImpl})
  ]);
  const info=account?.value?.data?.parsed?.info;
  if(!info)return null;
  const supply=BigInt(String(info.supply||'0'));
  const top=(largest?.value||[]).slice(0,10);
  const pct=amount=>supply>0n?Number((BigInt(String(amount||'0'))*1000000n)/supply)/10000:null;
  return {
    mintAuthority:info.mintAuthority??null,
    freezeAuthority:info.freezeAuthority??null,
    decimals:Number(info.decimals),
    supplyRaw:String(info.supply||'0'),
    topAccounts:top.map(x=>({address:x.address,amount:String(x.amount||'0'),percent:pct(x.amount)})),
    top10ObservedTokenAccountPercent:top.reduce((sum,x)=>sum+(pct(x.amount)||0),0),
    largestObservedTokenAccountPercent:top.length?pct(top[0].amount):null
  };
}

function transactionHasInitializeMint(tx,address){
  const instructions=tx?.transaction?.message?.instructions||[];
  return instructions.some(ix=>{
    const parsed=ix?.parsed;
    const type=String(parsed?.type||'').toLowerCase();
    const mint=parsed?.info?.mint;
    return (type==='initializemint'||type==='initializemint2')&&mint===address;
  });
}

function transactionFirstSigner(tx){
  const keys=tx?.transaction?.message?.accountKeys||[];
  for(const key of keys){
    if(typeof key==='object'&&key?.signer===true)return key.pubkey||key.address||null;
  }
  return null;
}

async function solanaCreatorHistory(address,{rpcUrl=DEFAULT_SOLANA_RPC,fetchImpl=fetch,maxPages=3}={}){
  let before=null,all=[],complete=false;
  for(let page=0;page<maxPages;page++){
    const cfg={limit:1000,commitment:'confirmed'};if(before)cfg.before=before;
    const rows=await rpcCall(rpcUrl,'getSignaturesForAddress',[address,cfg],{fetchImpl});
    if(!Array.isArray(rows)||rows.length===0){complete=true;break;}
    all=all.concat(rows);
    if(rows.length<1000){complete=true;break;}
    before=rows[rows.length-1]?.signature||null;
    if(!before)break;
  }
  if(!all.length)return {status:'NO_HISTORY',historyComplete:true,originalDeployerCandidate:null,creationSignature:null,evidence:[]};
  if(!complete)return {status:'HISTORY_WINDOW_INCOMPLETE',historyComplete:false,originalDeployerCandidate:null,creationSignature:null,evidence:['More than '+String(maxPages*1000)+' mint-address signatures observed; genesis was not assumed.']};
  const oldest=all[all.length-1];
  const sig=oldest?.signature;
  if(!sig)return {status:'GENESIS_SIGNATURE_MISSING',historyComplete:true,originalDeployerCandidate:null,creationSignature:null,evidence:[]};
  const tx=await rpcCall(rpcUrl,'getTransaction',[sig,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}],{fetchImpl});
  if(!transactionHasInitializeMint(tx,address)){
    return {status:'OLDEST_TX_NOT_MINT_INITIALIZATION',historyComplete:true,originalDeployerCandidate:null,creationSignature:sig,evidence:['Oldest observed mint-address transaction did not contain initializeMint for this mint.']};
  }
  const signer=transactionFirstSigner(tx);
  return {
    status:signer?'ORIGINAL_DEPLOYER_EVIDENCE':'INITIALIZATION_FOUND_SIGNER_UNKNOWN',
    historyComplete:true,
    originalDeployerCandidate:signer,
    creationSignature:sig,
    blockTime:oldest?.blockTime??tx?.blockTime??null,
    evidence:signer?['Oldest complete mint-address history transaction contains initializeMint for the target mint; first signer recorded as deployer evidence.']:[]
  };
}

function compareIdentity(jupiter,dex,rugcheck){
  const names=[jupiter?.name,dex?.name,rugcheck?.name].filter(Boolean).map(x=>String(x).trim().toLowerCase());
  const symbols=[jupiter?.symbol,dex?.symbol,rugcheck?.symbol].filter(Boolean).map(x=>String(x).trim().toLowerCase());
  return {
    nameAgreement:names.length<2?null:new Set(names).size===1,
    symbolAgreement:symbols.length<2?null:new Set(symbols).size===1,
    providersCompared:Math.max(names.length,symbols.length)
  };
}

function buildRexEvidence({onchain,dex,rugcheck,creator}){
  const signal=(id,status,explanation,observedValue=null,evidence=[])=>({id,status,explanation,observedValue,evidence});
  const signals=[];
  signals.push(signal('MINT_AUTHORITY',onchain?onchain.mintAuthority===null?'EVIDENCE_PRESENT':'REVIEW_REQUIRED':'UNKNOWN',onchain?(onchain.mintAuthority===null?'Mint authority is absent.':'Mint authority remains active.'):'On-chain mint authority could not be read.',onchain?.mintAuthority??null,['Solana getAccountInfo']));
  signals.push(signal('FREEZE_AUTHORITY',onchain?onchain.freezeAuthority===null?'EVIDENCE_PRESENT':'REVIEW_REQUIRED':'UNKNOWN',onchain?(onchain.freezeAuthority===null?'Freeze authority is absent.':'Freeze authority remains active.'):'On-chain freeze authority could not be read.',onchain?.freezeAuthority??null,['Solana getAccountInfo']));
  const top10=onchain?.top10ObservedTokenAccountPercent;
  signals.push(signal('HOLDER_CONCENTRATION',top10==null?'UNKNOWN':top10>50?'REVIEW_REQUIRED':'EVIDENCE_PRESENT',top10==null?'Top-account concentration could not be read.':'Top 10 observed token accounts hold '+top10.toFixed(2)+'% of mint supply. Token accounts can include LP, treasury or exchange accounts.',top10,['Solana getTokenLargestAccounts']));
  const liq=dex?.deepestPair?.liquidityUsd;
  signals.push(signal('LP_PROTECTION','UNKNOWN',liq!=null?'DEX liquidity is observed, but lock/permanent-protection evidence is a separate check.':'No DEX liquidity pair was observed by this provider.',liq,dex?.deepestPair?.url?[dex.deepestPair.url]:[]));
  signals.push(signal('RELATED_WALLETS','UNKNOWN','Related-wallet claims require attributable wallet-link evidence; no relationship is inferred from proximity alone.',null,[]));
  signals.push(signal('BUNDLED_ACTIVITY','UNKNOWN','Bundled-activity evidence is not yet established by the connected public sources.',null,[]));
  signals.push(signal('SNIPER_ACTIVITY','UNKNOWN','Sniper-activity evidence is not yet established by the connected public sources.',null,[]));
  signals.push(signal('CREATOR_SELLING','UNKNOWN',creator?.originalDeployerCandidate?'Original deployer evidence exists, but creator selling requires transaction-level balance/trade reconstruction.':'Original deployer evidence is incomplete, so creator selling is not inferred.',null,creator?.creationSignature?[creator.creationSignature]:[]));
  signals.push(signal('DUPLICATE_METADATA','UNKNOWN','Cross-provider identity disagreement is shown separately; duplicate-project claims require broader metadata/social comparison.',null,[]));
  signals.push(signal('MALICIOUS_LINKS','UNKNOWN','RugCheck token risk data is not treated as a malicious-link reputation feed.',null,[]));
  return {
    version:'REX-TOKEN-INTELLIGENCE-V1',
    signals,
    overallSafetyRating:null,
    rule:'REX shows separate evidence signals and never converts them into an unsupported overall SAFE score.'
  };
}

async function providerResult(provider,fn,reference){
  try{return {provider,status:'AVAILABLE',reference,data:await fn(),error:null};}
  catch(error){return {provider,status:'UNAVAILABLE',reference,data:null,error:error?.message||'provider_error'};}
}

async function aggregateSolanaTokenEvidence(address,{rpcUrl=DEFAULT_SOLANA_RPC,fetchImpl=fetch,creatorPages=3}={}){
  const encoded=encodeURIComponent(address);
  const refs={
    jupiter:'https://lite-api.jup.ag/tokens/v2/search?query='+encoded,
    dex:'https://api.dexscreener.com/token-pairs/v1/solana/'+encoded,
    gecko:'https://api.geckoterminal.com/api/v2/networks/solana/tokens/'+encoded,
    rugcheck:'https://api.rugcheck.xyz/v1/tokens/'+encoded+'/report'
  };
  const [j,d,g,r,o,c]=await Promise.all([
    providerResult('Jupiter Tokens V2',async()=>normalizeJupiter(await fetchJson(refs.jupiter,{fetchImpl}),address),refs.jupiter),
    providerResult('DEX Screener',async()=>normalizeDex(await fetchJson(refs.dex,{fetchImpl}),address),refs.dex),
    providerResult('GeckoTerminal',async()=>normalizeGecko(await fetchJson(refs.gecko,{fetchImpl})),refs.gecko),
    providerResult('RugCheck',async()=>normalizeRugCheck(await fetchJson(refs.rugcheck,{fetchImpl})),refs.rugcheck),
    providerResult('Solana RPC',async()=>solanaMintEvidence(address,{rpcUrl,fetchImpl}),rpcUrl),
    providerResult('Solana Creator History',async()=>solanaCreatorHistory(address,{rpcUrl,fetchImpl,maxPages:creatorPages}),rpcUrl)
  ]);
  const identity=compareIdentity(j.data,d.data,r.data);
  const disagreements=[];
  if(identity.nameAgreement===false)disagreements.push('TOKEN_NAME_DISAGREEMENT');
  if(identity.symbolAgreement===false)disagreements.push('TOKEN_SYMBOL_DISAGREEMENT');
  const rex=buildRexEvidence({onchain:o.data,dex:d.data,rugcheck:r.data,creator:c.data});
  return {
    version:'WORLDZ-REAL-INTELLIGENCE-V1',
    chain:'solana',
    tokenId:address,
    checkedAt:new Date().toISOString(),
    providers:[j,d,g,r,o,c],
    dataSources:[j,d,g,r,o,c].map(x=>source(x.provider,x.status,x.reference,x.error)),
    identity,
    disagreements,
    liquidity:{
      dexScreener:d.data,
      geckoTerminal:g.data,
      deepestObservedLiquidityUsd:d.data?.deepestPair?.liquidityUsd??null,
      aggregateObservedDexLiquidityUsd:d.data?.aggregateObservedLiquidityUsd??null,
      rule:'Observed liquidity is market data. LP lock or permanent protection is proven separately.'
    },
    creatorHistory:c.data,
    onchain:o.data,
    rugcheck:r.data,
    jupiter:j.data,
    rex
  };
}

async function diagnoseSolanaTransaction(signature,{rpcUrl=DEFAULT_SOLANA_RPC,fetchImpl=fetch}={}){
  const [status,tx]=await Promise.all([
    rpcCall(rpcUrl,'getSignatureStatuses',[[signature],{searchTransactionHistory:true}],{fetchImpl}),
    rpcCall(rpcUrl,'getTransaction',[signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}],{fetchImpl}).catch(()=>null)
  ]);
  const s=status?.value?.[0]||null;
  let state='UNKNOWN';
  if(s?.err)state='FAILED';
  else if(s?.confirmationStatus==='finalized'||s?.confirmationStatus==='confirmed')state='CONFIRMED';
  else if(s?.confirmationStatus==='processed')state='CONFIRMING';
  else if(s)state='SUBMITTED';
  const meta=tx?.meta||null;
  const feeLamports=meta?.fee!=null?Number(meta.fee):null;
  let tokenChanged=false;
  if(meta){
    const key=x=>String(x?.accountIndex)+'|'+String(x?.mint||'')+'|'+String(x?.owner||'');
    const pre=new Map((meta.preTokenBalances||[]).map(x=>[key(x),String(x?.uiTokenAmount?.amount||'0')]));
    for(const x of meta.postTokenBalances||[])if((pre.get(key(x))??'0')!==String(x?.uiTokenAmount?.amount||'0'))tokenChanged=true;
    for(const [k,v] of pre)if(!(meta.postTokenBalances||[]).some(x=>key(x)===k)&&v!=='0')tokenChanged=true;
  }
  let nonFeeLamportChanged=false;
  if(meta&&Array.isArray(meta.preBalances)&&Array.isArray(meta.postBalances)){
    for(let i=0;i<Math.min(meta.preBalances.length,meta.postBalances.length);i++){
      const delta=Number(meta.postBalances[i])-Number(meta.preBalances[i]);
      if(i===0&&feeLamports!=null&&delta===-feeLamports)continue;
      if(delta!==0){nonFeeLamportChanged=true;break;}
    }
  }
  const fundsMoved=meta?(tokenChanged||nonFeeLamportChanged?'YES':'NO'):'UNKNOWN';
  return {
    version:'WORLDZ-TRANSACTION-DIAGNOSIS-V1',
    chain:'solana',
    txId:signature,
    state,
    confirmationStatus:s?.confirmationStatus||null,
    confirmations:s?.confirmations??null,
    slot:s?.slot??tx?.slot??null,
    error:s?.err??meta?.err??null,
    networkFeeLamports:feeLamports,
    fundsMoved,
    tokenBalanceChanged:tokenChanged,
    nonFeeLamportBalanceChanged:nonFeeLamportChanged,
    blockTime:tx?.blockTime??null,
    checkedAt:new Date().toISOString(),
    rule:'CONFIRMED is reported only from Solana RPC confirmation state; submitted context never upgrades itself.'
  };
}

module.exports={
  DEFAULT_SOLANA_RPC,
  aggregateSolanaTokenEvidence,
  buildRexEvidence,
  compareIdentity,
  diagnoseSolanaTransaction,
  fetchJson,
  normalizeDex,
  normalizeGecko,
  normalizeJupiter,
  normalizeRugCheck,
  rpcCall,
  solanaCreatorHistory,
  solanaMintEvidence,
  transactionFirstSigner,
  transactionHasInitializeMint
};
