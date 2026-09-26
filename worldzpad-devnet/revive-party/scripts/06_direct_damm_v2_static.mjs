import fs from 'node:fs';
import path from 'node:path';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  getBaseFeeParams,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
} from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const root=path.resolve('../../worldzpad-mainnet/revive');
const config=JSON.parse(fs.readFileSync(path.join(root,'revive-direct-damm-v2-existing-mint.v1.json'),'utf8'));

if(config.route.venue!=='Meteora DAMM v2')throw new Error('wrong venue');
if(config.route.mode!=='DIRECT_CUSTOMIZABLE_POOL__EXISTING_MINT__ONE_SIDED')throw new Error('wrong route');
if(config.pricing.devnetFixture.priceSolPerRviv!==0.000045)throw new Error('devnet fixture drift');
if(Number(config.pricing.mainnet.priceSolPerRviv)!==0.000045)throw new Error('owner-approved mainnet price must be 0.000045 SOL/RVIV');
if(config.pricing.mainnet.mayInheritDevnetFixtureAutomatically!==false)throw new Error('devnet price inheritance forbidden');
if(config.route.initialBaseLiquidityTokens!==30_000_000||config.route.initialQuoteLiquiditySol!==0)throw new Error('one-sided liquidity drift');
if(config.route.isLockLiquidity!==true||config.route.permanentLockTargetPercent!==100)throw new Error('permanent lock target drift');
if(config.fairFee.magicFeeBps!==75||config.fairFee.dynamicFee!==false)throw new Error('MagicFee drift');

const baseFee=getBaseFeeParams({
  baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{
    startingFeeBps:75,
    endingFeeBps:75,
    numberOfPeriod:0,
    totalDuration:0,
  },
});
if(!baseFee)throw new Error('DAMM v2 SDK rejected 75-bps fixed fee');

const initSqrtPrice=getSqrtPriceFromPrice('0.000045',6,9);
if(!BN.isBN(initSqrtPrice)||initSqrtPrice.lte(new BN(0)))throw new Error('invalid 0.000045 sqrt price');

const proof={
  proof:'REVIVE_DIRECT_DAMM_V2_STATIC',
  sdk:'@meteora-ag/cp-amm-sdk@1.4.10',
  route:'EXISTING_MINT_ONE_SIDED',
  canonicalMint:config.canonicalToken.mint,
  devnetMockRequired:true,
  devnetPriceSolPerRviv:0.000045,
  mainnetPrice:0.000045,
  initialBaseTokens:30_000_000,
  initialQuoteSol:0,
  baseFeeBps:75,
  dynamicFee:false,
  collectFeeMode:'QUOTE_TOKEN',
  sdkEnums:{
    activationTimestamp:Number(ActivationType.Timestamp),
    quoteOnly:Number(CollectFeeMode.OnlyB),
    fixedFeeMode:Number(BaseFeeMode.FeeTimeSchedulerLinear),
  },
  initSqrtPrice:initSqrtPrice.toString(),
  sdkSupportsExistingMintCustomPool:typeof CpAmm==='function',
  minSqrtPrice:MIN_SQRT_PRICE.toString(),
  maxSqrtPrice:MAX_SQRT_PRICE.toString(),
  isLockLiquidity:true,
  permanentLockTargetPercent:100,
  warning:'Static SDK compatibility only. Mainnet price is owner-approved; execution still requires live preflight and wallet signature.',
  mainnetExecution:false,
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-direct-damm-v2-static.json',JSON.stringify(proof,null,2)+'\n');
console.log('REVIVE_DIRECT_DAMM_STATIC=PASS price=0.000045 fee_bps=75 one_sided=YES permanent_lock=100 mainnet_price=OWNER_APPROVED execution=LOCKED_PENDING_SIGNATURE');
