import fs from 'node:fs';
import { buildBitPairIntent, buildBitProofPreview, quoteWorldzFee } from '../../../worldzpad-omnichain/bitworldz/sdk/bitworldz-core.mjs';
import { MAGIC_FEE_BPS, WBTC_SOLANA_MAINNET, routePartnerQuoteAtomic } from './common.mjs';

fs.mkdirSync('artifacts',{recursive:true});

if(MAGIC_FEE_BPS!==75n) throw new Error('MagicFee target drifted');
const intent=buildBitPairIntent({
  targetChain:'solana',
  bitcoinAsset:{
    class:'WRAPPED_BTC',
    symbol:'mBTC',
    assetId:'DEVNET_MOCK_BTC_8_DECIMALS',
    verificationStatus:'UNVERIFIED_INPUT',
  },
  venue:'METEORA_DBC_DEVNET_CANDIDATE'
});
const fee=quoteWorldzFee({tradeAmountAtomic:100_000_000n});
if(fee.grossWorldzFeeAtomic!=='750000') throw new Error('75 bps static fee math failed');

const routed=routePartnerQuoteAtomic(490_000n);
if(routed.referrer!=='170000'||routed.legacyFlywheel!=='150000'||routed.worldzLaunchPad!=='85000'||routed.oneWorldzImpact!=='85000'){
  throw new Error('partner router math failed');
}

const report={
  proof:'BITWORLDZ_STATIC_GATE_V1',
  status:'PASS',
  target:'Solana Devnet Mock-BTC BitPair',
  mockQuote:{symbol:'mBTC',decimals:8,assetClass:'WRAPPED_BTC_SIMULATION_ONLY'},
  intent,
  bitProofPreview:buildBitProofPreview(intent),
  feeExample:fee,
  partnerRoutingExample:routed,
  pinnedReadOnlyMainnetReference:WBTC_SOLANA_MAINNET,
  guarantees:{
    mainnetExecution:false,
    automaticBridge:false,
    worldzCustodiesBitcoin:false,
    wrappedMayBeCalledNative:false,
  },
};
fs.writeFileSync('artifacts/bitworldz-static-proof.json',JSON.stringify(report,null,2)+'\n');
console.log('BITWORLDZ_STATIC_PROOF=PASS quote=mBTC decimals=8 fee_bps=75 mainnet=OFF');
