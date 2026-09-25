import fs from 'node:fs';

fs.mkdirSync('artifacts',{recursive:true});
function load(name){
  try{return JSON.parse(fs.readFileSync('artifacts/'+name,'utf8'));}catch{return null;}
}
const staticProof=load('bitworldz-static-proof.json');
const live=load('bitworldz-live-bitpair.json');
const real=load('bitworldz-real-btc-compat.json');

const receipt={
  version:'BITWORLDZ-BITPROOF-V1',
  generatedAt:new Date().toISOString(),
  product:'BitWorldz OmniBTC™',
  rail:'Solana Devnet Mock-BTC BitPair',
  status:{
    staticGate:staticProof?.status??'NOT_RUN',
    liveDevnetBitPair:live?.status??'NOT_RUN',
    realBtcRepresentationReadOnly:real?.status??'NOT_RUN',
  },
  mockQuote:live?.mockBitcoin??staticProof?.mockQuote??null,
  devnetAccounts:live?.accounts??null,
  devnetTransactions:live?.transactions??null,
  feeProof:live?.stages?.find(x=>x.stage==='FEE_ACCRUAL_AND_WORLDZ_ROUTE_PREVIEW')??null,
  liquidityProof:live?.stages?.find(x=>x.stage==='LIQUIDITY_STATE_PROOF')??null,
  realBtcReference:real?.reference??staticProof?.pinnedReadOnlyMainnetReference??null,
  realBtcReadOnlyProof:real?.mint??null,
  compatibilityConclusion:real?.compatibilityConclusion??null,
  safety:{
    mainnetExecutionEnabled:false,
    worldzCustodiesNativeBitcoin:false,
    automaticBridgeEnabled:false,
    wrappedBtcMayBeCalledNative:false,
  },
  releaseGate:{
    approved:false,
    reason:'This proof is a research/devnet receipt. Mainnet BitPair execution remains disabled until an exact BTC asset + venue + chain combination passes live pool, buy/sell, fee, graduation, lock and security proofs.',
  },
};
fs.writeFileSync('artifacts/bitworldz-bitproof.json',JSON.stringify(receipt,null,2)+'\n');
console.log('BITWORLDZ_BITPROOF=CREATED live='+(receipt.status.liveDevnetBitPair)+' real_btc='+(receipt.status.realBtcRepresentationReadOnly)+' mainnet=OFF');
