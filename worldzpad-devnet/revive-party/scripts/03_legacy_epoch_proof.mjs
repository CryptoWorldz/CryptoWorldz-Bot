import fs from 'node:fs';
import path from 'node:path';
import { calculateEpoch, canonicalEpochHash } from './legacy_epoch_engine.mjs';

const minimum='100000';
const start={
  small:'100000',
  medium:'1000000',
  large:'100000000',
  below:'99999',
  system:'999999999'
};
const end={
  small:'100000',
  medium:'900000',
  large:'120000000',
  below:'200000',
  system:'999999999'
};
const funded=90_000_000n; // 0.09 SOL example for one legacy vault.
const out=calculateEpoch({
  fundedLamports:funded,
  minimumRaw:minimum,
  startBalances:start,
  endBalances:end,
  excludedWallets:['system']
});
if(out.eligibleWallets!==3)throw new Error('eligible wallet count mismatch');
if(BigInt(out.allocatedLamports)!==funded)throw new Error('funding reconciliation mismatch');
if(out.entitlements.some(x=>x.wallet==='below'||x.wallet==='system'))throw new Error('ineligible wallet leaked into rewards');
const small=out.entitlements.find(x=>x.wallet==='small');
const medium=out.entitlements.find(x=>x.wallet==='medium');
const large=out.entitlements.find(x=>x.wallet==='large');
if(!(BigInt(large.rewardLamports)>BigInt(medium.rewardLamports)&&BigInt(medium.rewardLamports)>BigInt(small.rewardLamports)))throw new Error('absolute ordering failed');

const proof={
  proof:'LEGACY_6H_EPOCH_ENGINE',
  epochSeconds:21600,
  model:'50% equal + 50% sqrt qualifying balance',
  qualifyingBalance:'min(start,end), both >= published minimum',
  excluded:['system/project/liquidity/reward/distribution wallets'],
  fundedLamports:funded.toString(),
  result:out,
  hash:canonicalEpochHash(out),
  tokenMovement:false,
  mainnetExecution:false
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(path.join('artifacts','legacy-6h-epoch-proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('LEGACY_6H_ENGINE=PASS eligible=3 allocated='+out.allocatedLamports+' excluded=2 weighting=50_equal_50_sqrt movement=OFF');
