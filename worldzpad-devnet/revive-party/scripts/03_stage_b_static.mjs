import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { LEGACY_MINTS } from './common.mjs';
import { cumulativePartnerEntitlements, deltaPartnerEntitlements, modelGrossFee } from './router_math.mjs';
import { EPOCH_SECONDS, calculateEpoch } from './legacy_epoch_engine.mjs';

const policyPath=path.resolve('../../worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json');
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
if(policy.assets.length!==10||LEGACY_MINTS.length!==10)throw new Error('legacy registry must contain 10 assets');

const exact=cumulativePartnerEntitlements(490_000n);
if(exact.entitlements.referrer!==170_000n)throw new Error('referrer route mismatch');
if(exact.entitlements.worldzLaunchPad!==85_000n||exact.entitlements.oneWorldzImpact!==85_000n)throw new Error('Worldz/Impact route mismatch');
for(let i=1;i<=10;i++){
  const k='legacy_'+String(i).padStart(2,'0');
  if(exact.entitlements[k]!==15_000n)throw new Error(k+' route mismatch');
}
if(exact.carryLamports!==0n)throw new Error('exact 490k route should have no carry');

const modeled=modelGrossFee(1_000_000_000n);
if(modeled.gross!==7_500_000n)throw new Error('75 bps gross mismatch');
if(modeled.protocol!==1_500_000n)throw new Error('20% protocol model mismatch');
if(modeled.creator!==3_060_000n)throw new Error('creator effective fee mismatch');
if(modeled.partner!==2_940_000n)throw new Error('partner effective fee mismatch');

const cumulativeA=deltaPartnerEntitlements(0n,2_940_000n);
const cumulativeB=deltaPartnerEntitlements(2_940_000n,5_880_013n);
for(const result of [cumulativeA,cumulativeB]){
  if(result.routedLamports+result.cumulativeCarryLamports > result.nextTotalPartnerLamports)throw new Error('route over-allocation');
}

function wallet(label){
  const seed=crypto.createHash('sha256').update('WORLDZ_HOLDER_FIXTURE_'+label).digest().subarray(0,32);
  return Keypair.fromSeed(seed).publicKey.toBase58();
}

const startsAtUnix=1_800_000_000;
const epochReports=[];
policy.assets.forEach((asset,index)=>{
  const min=BigInt(asset.minimumRaw);
  const a=wallet(asset.symbol+'_'+index+'_A');
  const b=wallet(asset.symbol+'_'+index+'_B');
  const drop=wallet(asset.symbol+'_'+index+'_DROP');
  const system=wallet(asset.symbol+'_'+index+'_SYSTEM');

  const report=calculateEpoch({
    startsAtUnix,
    endsAtUnix:startsAtUnix+EPOCH_SECONDS,
    fundedLamports:90_001n, // deliberately creates rounding dust in many fixtures
    minimumRaw:min,
    excludedWallets:[system],
    startBalances:{
      [a]:min.toString(),
      [b]:(min*9n).toString(),
      [drop]:(min*2n).toString(),
      [system]:(min*100n).toString(),
    },
    endBalances:{
      [a]:min.toString(),
      [b]:(min*9n).toString(),
      [drop]:(min-1n).toString(),
      [system]:(min*100n).toString(),
    },
  });

  if(report.eligibleWallets!==2)throw new Error(asset.symbol+' eligibility mismatch');
  if(report.entitlements.some(x=>x.wallet===drop||x.wallet===system))throw new Error(asset.symbol+' excluded/ineligible wallet leaked');
  const aReward=report.entitlements.find(x=>x.wallet===a);
  const bReward=report.entitlements.find(x=>x.wallet===b);
  if(!aReward||!bReward)throw new Error(asset.symbol+' eligible wallet missing');
  if(BigInt(bReward.rewardLamports)<=BigInt(aReward.rewardLamports))throw new Error(asset.symbol+' sqrt Equalizer mismatch');

  const funded=BigInt(report.fundedLamports);
  const allocated=BigInt(report.allocatedLamports);
  const carry=BigInt(report.roundingCarryLamports);
  if(allocated+carry!==funded)throw new Error(asset.symbol+' epoch reconciliation failed');
  if(carry<0n)throw new Error(asset.symbol+' negative rounding carry');

  epochReports.push({
    order:asset.order,
    symbol:asset.symbol,
    mint:asset.mint,
    minimumRaw:asset.minimumRaw,
    fundedLamports:report.fundedLamports,
    eligibleWallets:report.eligibleWallets,
    entitlements:report.entitlements,
    allocatedLamports:report.allocatedLamports,
    roundingCarryLamports:report.roundingCarryLamports,
  });
});

const out={
  proof:'REVIVE_STAGE_B_ROUTER_HOLDER_STATIC',
  grossFeeBps:75,
  modeledOneSolVolume:Object.fromEntries(Object.entries(modeled).map(([k,v])=>[k,v.toString()])),
  partnerRouter:{
    denominator:'490',
    exact490k:Object.fromEntries(Object.entries(exact.entitlements).map(([k,v])=>[k,v.toString()])),
    carryLamports:exact.carryLamports.toString(),
    rule:'cumulative entitlement deltas prevent long-run router rounding drift; remainder stays in router carry',
  },
  holderEpoch:{
    engine:'legacy_epoch_engine.mjs',
    seconds:EPOCH_SECONDS,
    split:'50% equal + 50% integer-sqrt weight',
    boundaryRule:'qualifying balance = min(start,end), and both boundaries must meet the minimum',
    roundingRule:'floor wallet entitlements to lamports; rounding dust remains in the legacy vault and rolls forward',
    reports:epochReports,
  },
  mainnetExecution:false,
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-stage-b-static-proof.json',JSON.stringify(out,null,2)+'\n');
console.log('REVIVE_STAGE_B_STATIC=PASS partner_weights=170/15x10/85/85 epoch=21600 holder_weight=50_equal_50_sqrt assets=10 unbiased_rounding_carry=ON');
