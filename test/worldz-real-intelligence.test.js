const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  aggregateSolanaTokenEvidence,
  diagnoseSolanaTransaction,
  solanaCreatorHistory,
  transactionHasInitializeMint
}=require('../src/worldz-intelligence');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

function response(body,status=200){
  return {
    ok:status>=200&&status<300,
    status,
    async text(){return JSON.stringify(body);}
  };
}
function rpcResult(result){return {jsonrpc:'2.0',id:1,result};}

test('creator history only identifies a deployer from complete oldest initializeMint evidence',async()=>{
  const mint='Mint111111111111111111111111111111111111111';
  const fetchImpl=async(url,opts={})=>{
    const req=JSON.parse(opts.body);
    if(req.method==='getSignaturesForAddress')return response(rpcResult([
      {signature:'newerSig',blockTime:20},{signature:'creationSig',blockTime:10}
    ]));
    if(req.method==='getTransaction')return response(rpcResult({
      blockTime:10,
      transaction:{message:{
        accountKeys:[{pubkey:'CreatorWallet1111111111111111111111111111111',signer:true}],
        instructions:[{parsed:{type:'initializeMint2',info:{mint}}}]
      }}
    }));
    throw new Error('unexpected rpc '+req.method);
  };
  const out=await solanaCreatorHistory(mint,{rpcUrl:'https://rpc.test',fetchImpl});
  assert.equal(out.status,'ORIGINAL_DEPLOYER_EVIDENCE');
  assert.equal(out.historyComplete,true);
  assert.equal(out.originalDeployerCandidate,'CreatorWallet1111111111111111111111111111111');
  assert.equal(out.creationSignature,'creationSig');
});

test('creator history refuses to guess when the bounded history window is incomplete',async()=>{
  const rows=Array.from({length:1000},(_,i)=>({signature:'sig'+i}));
  const fetchImpl=async(url,opts={})=>{
    const req=JSON.parse(opts.body);
    if(req.method==='getSignaturesForAddress')return response(rpcResult(rows));
    throw new Error('transaction must not be fetched');
  };
  const out=await solanaCreatorHistory('Mint111111111111111111111111111111111111111',{rpcUrl:'https://rpc.test',fetchImpl,maxPages:1});
  assert.equal(out.status,'HISTORY_WINDOW_INCOMPLETE');
  assert.equal(out.originalDeployerCandidate,null);
  assert.equal(out.historyComplete,false);
});

test('initializeMint evidence must match the exact target mint',()=>{
  assert.equal(transactionHasInitializeMint({transaction:{message:{instructions:[
    {parsed:{type:'initializeMint',info:{mint:'OTHER'}}}
  ]}}},'TARGET'),false);
  assert.equal(transactionHasInitializeMint({transaction:{message:{instructions:[
    {parsed:{type:'initializeMint2',info:{mint:'TARGET'}}}
  ]}}},'TARGET'),true);
});

test('real intelligence cross-checks public providers and keeps REX evidence separated',async()=>{
  const mint='Mint111111111111111111111111111111111111111';
  const fetchImpl=async(url,opts={})=>{
    if(opts.method==='POST'){
      const req=JSON.parse(opts.body);
      if(req.method==='getAccountInfo')return response(rpcResult({
        value:{data:{parsed:{info:{mintAuthority:null,freezeAuthority:null,decimals:6,supply:'1000'}}}}
      }));
      if(req.method==='getTokenLargestAccounts')return response(rpcResult({value:[
        {address:'A',amount:'400'},{address:'B',amount:'150'},{address:'C',amount:'50'}
      ]}));
      if(req.method==='getSignaturesForAddress')return response(rpcResult([{signature:'creationSig',blockTime:10}]));
      if(req.method==='getTransaction')return response(rpcResult({
        transaction:{message:{accountKeys:[{pubkey:'Creator1',signer:true}],instructions:[
          {parsed:{type:'initializeMint2',info:{mint}}}
        ]}},meta:{fee:5000,preBalances:[10000],postBalances:[5000],preTokenBalances:[],postTokenBalances:[]}
      }));
      if(req.method==='getSignatureStatuses')return response(rpcResult({value:[{confirmationStatus:'confirmed',confirmations:1,slot:42,err:null}]}));
    }
    if(String(url).includes('tokens/v2/search'))return response([{id:mint,name:'Test Token',symbol:'TEST',isVerified:false,organicScore:51}]);
    if(String(url).includes('dexscreener'))return response([
      {pairAddress:'P1',dexId:'raydium',liquidity:{usd:2000},priceUsd:'0.01',volume:{h24:800},baseToken:{address:mint,name:'Test Token',symbol:'TEST'}}
    ]);
    if(String(url).includes('geckoterminal'))return response({data:{attributes:{name:'Test Token',symbol:'TEST',price_usd:'0.01',total_reserve_in_usd:'1950'}}});
    if(String(url).includes('rugcheck'))return response({creator:'Creator1',tokenMeta:{name:'Test Token',symbol:'TEST'},risks:[{name:'Example Risk',level:'warn'}]});
    throw new Error('unexpected '+url);
  };
  const out=await aggregateSolanaTokenEvidence(mint,{rpcUrl:'https://rpc.test',fetchImpl,creatorPages:1});
  assert.equal(out.identity.nameAgreement,true);
  assert.equal(out.identity.symbolAgreement,true);
  assert.equal(out.creatorHistory.originalDeployerCandidate,'Creator1');
  assert.equal(out.liquidity.deepestObservedLiquidityUsd,2000);
  assert.equal(out.rex.overallSafetyRating,null);
  assert.equal(out.rex.signals.find(x=>x.id==='MINT_AUTHORITY').status,'EVIDENCE_PRESENT');
  assert.equal(out.rex.signals.find(x=>x.id==='HOLDER_CONCENTRATION').status,'REVIEW_REQUIRED');
});

test('transaction diagnosis distinguishes chain confirmation from context and detects fee-only movement',async()=>{
  const fetchImpl=async(url,opts={})=>{
    const req=JSON.parse(opts.body);
    if(req.method==='getSignatureStatuses')return response(rpcResult({value:[{confirmationStatus:'confirmed',confirmations:1,slot:42,err:null}]}));
    if(req.method==='getTransaction')return response(rpcResult({
      slot:42,blockTime:123,
      meta:{fee:5000,err:null,preBalances:[10000,1000],postBalances:[5000,1000],preTokenBalances:[],postTokenBalances:[]},
      transaction:{message:{accountKeys:[],instructions:[]}}
    }));
    throw new Error('unexpected rpc');
  };
  const out=await diagnoseSolanaTransaction('signature',{rpcUrl:'https://rpc.test',fetchImpl});
  assert.equal(out.state,'CONFIRMED');
  assert.equal(out.fundsMoved,'NO');
  assert.equal(out.networkFeeLamports,5000);
  assert.match(out.rule,/only from Solana RPC/);
});

test('public surfaces keep liquidity and confirmation truth separate',()=>{
  const platform=json('launchpad.cryptoworldz.xyz/platform-config.json');
  const liquidity=json('worldzpad-omnichain/liquidity-intelligence.v1.json');
  const trust=read('launchpad.cryptoworldz.xyz/trust/index.html');
  const txHelp=read('launchpad.cryptoworldz.xyz/transaction-help/index.html');
  const intelPhp=read('launchpad.cryptoworldz.xyz/intelligence.php');
  const txPhp=read('launchpad.cryptoworldz.xyz/transaction-status.php');

  assert.equal(platform.intelligenceStack.rexTokenIntelligence.overallSafetyScore,false);
  assert.equal(platform.liquidityIntelligence.automaticValueMovementEnabled,false);
  assert.equal(liquidity.solana.automaticValueMovementEnabled,false);
  assert.match(trust,/Observed market depth is separate from LP lock\/protection proof/);
  assert.match(txHelp,/Verify On-Chain/);
  assert.match(intelPhp,/No provider result alone creates a SAFE label/);
  assert.match(txPhp,/CONFIRMED is reported only from Solana RPC confirmation state/);
});

test('creator-history registry lookup is exact-wallet and public-record only',()=>{
  const src=read('supabase/functions/worldz-launch-register/index.ts');
  assert.match(src,/creatorHistoryQuery/);
  assert.match(src,/\.eq\("wallet_address", creatorHistoryQuery\)/);
  assert.match(src,/\.eq\("is_public", true\)/);
  assert.match(src,/does not claim control of other wallets/);
});

test('provider availability is not mislabeled as confirmed truth',()=>{
  const schema=json('worldzpad-omnichain/schemas/worldz-proof-intelligence.v1.json');
  const statuses=schema.properties.dataSources.items.properties.status.enum;
  assert.ok(statuses.includes('AVAILABLE'));
  const moduleSrc=read('src/worldz-intelligence.js');
  assert.match(moduleSrc,/status:'AVAILABLE'/);
  assert.doesNotMatch(moduleSrc,/provider,status:'CONFIRMED'/);
});
