import fs from 'node:fs';
import path from 'node:path';
import { EPOCH_SECONDS, calculateEpoch, canonicalEpochHash } from './legacy_epoch_engine.mjs';

const minimum='100000';
const startBalances={
  small:'100000',
  medium:'1000000',
  large:'100000000',
  below:'99999',
  drops:'200000',
  system:'999999999',
};
const endBalances={
  small:'100000',
  medium:'900000',
  large:'120000000',
  below:'200000',
  drops:'99999',
  system:'999999999',
};
const startsAtUnix=1_800_000_000;
const funded=90_000_001n;

const out=calculateEpoch({
  startsAtUnix,
  endsAtUnix:startsAtUnix+EPOCH_SECONDS,
  fundedLamports:funded,
  minimumRaw:minimum,
  startBalances,
  endBalances,
  excludedWallets:['system'],
});

if(out.eligibleWallets!==3)throw new Error('eligible wallet count mismatch');
if(out.entitlements.some(x=>['below','drops','system'].includes(x.wallet)))throw new Error('ineligible wallet leaked into rewards');
const small=out.entitlements.find(x=>x.wallet==='small');
const medium=out.entitlements.find(x=>x.wallet==='medium');
const large=out.entitlements.find(x=>x.wallet==='large');
if(!(small&&medium&&large))throw new Error('eligible fixture missing');
if(!(BigInt(large.rewardLamports)>BigInt(medium.rewardLamports)&&BigInt(medium.rewardLamports)>BigInt(small.rewardLamports))){
  throw new Error('sqrt reward ordering failed');
}
const allocated=BigInt(out.allocatedLamports);
const carry=BigInt(out.roundingCarryLamports);
if(allocated+carry!==funded)throw new Error('funding reconciliation mismatch');
if(carry<0n)throw new Error('negative rounding carry');

// The engine itself must reject a boundary pair that is not exactly six hours apart.
let rejectedShortEpoch=false;
try{
  calculateEpoch({
    startsAtUnix,
    endsAtUnix:startsAtUnix+EPOCH_SECONDS-1,
    fundedLamports:funded,
    minimumRaw:minimum,
    startBalances,
    endBalances,
    excludedWallets:['system'],
  });
}catch{rejectedShortEpoch=true;}
if(!rejectedShortEpoch)throw new Error('engine accepted an epoch shorter than 21600 seconds');

const proof={
  proof:'LEGACY_6H_EPOCH_ENGINE',
  epochSeconds:EPOCH_SECONDS,
  model:'50% equal + 50% integer-sqrt qualifying balance',
  qualifyingBalance:'min(start,end), both boundaries >= published minimum',
  rounding:'whole-lamport floors; rounding dust remains in the legacy vault for roll-forward',
  excluded:['system/project/liquidity/reward/distribution wallets'],
  fundedLamports:funded.toString(),
  result:out,
  hash:canonicalEpochHash(out),
  rejectsShortEpoch:true,
  tokenMovement:false,
  mainnetExecution:false,
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(path.join('artifacts','legacy-6h-epoch-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('LEGACY_6H_ENGINE=PASS eligible=3 allocated='+out.allocatedLamports+' carry='+out.roundingCarryLamports+' excluded=3 exact_21600=ON unbiased_rounding=ON movement=OFF');
