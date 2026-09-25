import fs from 'node:fs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

const bytecode=JSON.parse(fs.readFileSync('artifacts/template-bytecode.json','utf8'));
if(!Array.isArray(bytecode.modules)||bytecode.modules.length<1)throw new Error('compiled modules missing');
if(!Array.isArray(bytecode.dependencies)||bytecode.dependencies.length<1)throw new Error('compiled dependencies missing');

const client=new SuiGrpcClient({
  network:'devnet',
  baseUrl:'https://fullnode.devnet.sui.io:443',
});
const keypair=new Ed25519Keypair();
const address=keypair.toSuiAddress();

let faucetError=null;
for(let attempt=1;attempt<=4;attempt++){
  try{
    await requestSuiFromFaucetV2({host:getFaucetHost('devnet'),recipient:address});
    faucetError=null;
    break;
  }catch(e){
    faucetError=e;
    await new Promise(r=>setTimeout(r,attempt*5000));
  }
}
if(faucetError)throw new Error('Sui devnet faucet unavailable after retries: '+faucetError.message);

let balance=0n;
for(let i=0;i<12;i++){
  const b=await client.getBalance({owner:address});
  balance=BigInt(b.balance?.balance??b.balance?.totalBalance??b.balance??0);
  if(balance>0n)break;
  await new Promise(r=>setTimeout(r,3000));
}
if(balance<=0n)throw new Error('testnet faucet request did not produce spendable SUI');

const publishTx=new Transaction();
const [upgradeCap]=publishTx.publish({modules:bytecode.modules,dependencies:bytecode.dependencies});
// Worldz public template package instances are immutable from publication.
publishTx.moveCall({target:'0x2::package::make_immutable',arguments:[upgradeCap]});

const publishResult=await client.signAndExecuteTransaction({
  transaction:publishTx,
  signer:keypair,
  include:{effects:true,objectTypes:true},
});
if(publishResult.FailedTransaction)throw new Error('publish failed: '+publishResult.FailedTransaction.status?.error?.message);
await client.waitForTransaction({result:publishResult});

const pub=publishResult.Transaction;
const objectTypes=pub.objectTypes||{};
let packageId=null;
let publisherCapId=null;

if(pub.effects?.changedObjects){
  for(const entry of pub.effects.changedObjects){
    const objectId=Array.isArray(entry)?entry[0]:entry.objectId;
    const change=Array.isArray(entry)?entry[1]:entry;
    const kind=change?.outputState;
    if(kind==='PackageWrite')packageId=objectId;
    const type=objectTypes[objectId];
    if(type?.endsWith('::worldz_token::PublisherCap'))publisherCapId=objectId;
  }
}
if(!publisherCapId){
  for(const [id,type] of Object.entries(objectTypes)){
    if(String(type).endsWith('::worldz_token::PublisherCap'))publisherCapId=id;
  }
}
if(!packageId){
  // Defensive fallback for future SDK response changes: package writes have no Move object type.
  const candidates=(pub.effects?.changedObjects||[])
    .filter(x=>x?.outputState==='PackageWrite')
    .map(x=>x.objectId)
    .filter(Boolean);
  if(candidates.length===1)packageId=candidates[0];
}
if(!packageId)throw new Error('published package id not found in transaction effects');
if(!publisherCapId)throw new Error('PublisherCap id not found in transaction effects');

const decimals=6;
const supplyTokens=100_000_000n;
const rawSupply=supplyTokens*1_000_000n;
const coinType=packageId+'::worldz_token::WorldzToken';

const initTx=new Transaction();
const [fullSupply]=initTx.moveCall({
  target:packageId+'::worldz_token::create_fixed_supply',
  arguments:[
    initTx.object(publisherCapId),
    initTx.object('0xc'),
    initTx.pure.u8(decimals),
    initTx.pure.string('WZSUI'),
    initTx.pure.string('Worldz Sui Testnet Proof'),
    initTx.pure.string('Disposable fixed-supply Worldz Sui native adapter proof'),
    initTx.pure.string('https://suiworldz.xyz/hero.jpg'),
    initTx.pure.u64(rawSupply),
  ],
});
initTx.transferObjects([fullSupply],address);

const initResult=await client.signAndExecuteTransaction({
  transaction:initTx,
  signer:keypair,
  include:{effects:true,balanceChanges:true,objectTypes:true},
});
if(initResult.FailedTransaction)throw new Error('currency initialization failed: '+initResult.FailedTransaction.status?.error?.message);
await client.waitForTransaction({result:initResult});

let observedRaw=0n;
for(let i=0;i<10;i++){
  const b=await client.getBalance({owner:address,coinType});
  observedRaw=BigInt(b.balance?.balance??b.balance?.totalBalance??b.balance??0);
  if(observedRaw===rawSupply)break;
  await new Promise(r=>setTimeout(r,2000));
}
if(observedRaw!==rawSupply)throw new Error('fixed supply balance mismatch expected='+rawSupply+' observed='+observedRaw);

const proof={
  proof:'WORLDZ_SUI_NATIVE_DEVNET_ONCHAIN',
  network:'sui-devnet',
  sdk:'@mysten/sui@2.31.3',
  packageId,
  coinType,
  publisherAddress:address,
  publishDigest:pub.digest,
  initializeDigest:initResult.Transaction.digest,
  decimals,
  supplyTokens:supplyTokens.toString(),
  rawSupply:rawSupply.toString(),
  observedPublisherBalanceRaw:observedRaw.toString(),
  packageImmutable:true,
  treasuryCapSurvives:false,
  metadataCapSurvives:false,
  regulated:false,
  walletTransferTax:false,
  mainnetExecution:false,
  note:'Disposable Devnet proof package and coin. The ephemeral proof key is not persisted. Testnet and mainnet remain separate release gates.',
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/sui-devnet-onchain-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log('WORLDZ_SUI_DEVNET=PASS package='+packageId+' coinType='+coinType+' publish='+pub.digest+' initialize='+initResult.Transaction.digest+' supply='+rawSupply+' immutable=YES mainnet=LOCKED');
