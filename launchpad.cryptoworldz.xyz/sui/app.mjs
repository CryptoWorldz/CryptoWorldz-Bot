import { createDAppKit } from 'https://esm.sh/@mysten/dapp-kit-core@1.6.31?bundle';
import 'https://esm.sh/@mysten/dapp-kit-core@1.6.31/web?bundle';
import { SuiGrpcClient } from 'https://esm.sh/@mysten/sui@2.31.3/grpc?bundle';
import { Transaction } from 'https://esm.sh/@mysten/sui@2.31.3/transactions?bundle';

const DEVNET_GRPC='https://fullnode.devnet.sui.io:443';
const COIN_REGISTRY='0xc';
const U64_MAX=18446744073709551615n;
const template=await fetch('/sui/template-bytecode.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Template bytecode unavailable');return r.json();});

const dAppKit=createDAppKit({
  networks:['devnet'],
  defaultNetwork:'devnet',
  autoConnect:true,
  createClient(network){return new SuiGrpcClient({network,baseUrl:DEVNET_GRPC});},
});
document.querySelector('mysten-dapp-kit-connect-button').instance=dAppKit;

const $=s=>document.querySelector(s);
let published=null;

function status(message,isError=false){
  const el=$('#status');el.textContent=message;el.style.borderLeftColor=isError?'#ff7272':'var(--sui)';
}
function connection(){
  const c=dAppKit.stores.$connection.get();
  if(!c?.isConnected||!c.account)throw new Error('Connect a Sui wallet first.');
  return c;
}
function formData(){
  const name=$('#name').value.trim();
  const symbol=$('#symbol').value.trim().toUpperCase();
  const description=$('#description').value.trim();
  const icon=$('#icon').value.trim();
  const supplyText=$('#supply').value.trim();
  const decimals=Number($('#decimals').value);
  if(name.length<2||name.length>64)throw new Error('Token name must be 2–64 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(symbol))throw new Error('Symbol must be 2–10 characters: A–Z, 0–9, _ or $.');
  if(!/^\d+$/.test(supplyText)||BigInt(supplyText)<=0n)throw new Error('Supply must be a positive whole number.');
  if(!Number.isInteger(decimals)||decimals<0||decimals>9)throw new Error('Decimals must be 0–9.');
  const raw=BigInt(supplyText)*(10n**BigInt(decimals));
  if(raw>U64_MAX)throw new Error('Supply × decimals exceeds Sui u64 maximum.');
  if(icon && !/^https:\/\//i.test(icon))throw new Error('Icon URL must use https://');
  return {name,symbol,description,icon,decimals,supplyTokens:BigInt(supplyText),raw};
}
async function fullTx(digest){
  const client=dAppKit.getClient('devnet');
  const r=await client.getTransaction({digest,include:{effects:true,objectTypes:true}});
  if(r.FailedTransaction)throw new Error(r.FailedTransaction.status?.error?.message||'Transaction failed.');
  return r.Transaction;
}
async function publish(){
  try{
    const c=connection();
    status('Preparing immutable Worldz Sui package publication…');
    const tx=new Transaction();
    const [upgradeCap]=tx.publish({modules:template.modules,dependencies:template.dependencies});
    tx.moveCall({target:'0x2::package::make_immutable',arguments:[upgradeCap]});
    const out=await dAppKit.signAndExecuteTransaction({transaction:tx,network:'devnet'});
    if(out.FailedTransaction)throw new Error(out.FailedTransaction.status?.error?.message||'Package publication failed.');
    const digest=out.Transaction.digest;
    status('Publication confirmed. Reading package and PublisherCap from Devnet…');
    const pub=await fullTx(digest);
    const packageId=pub.effects?.changedObjects?.find(x=>x.outputState==='PackageWrite')?.objectId;
    const publisherCapId=Object.entries(pub.objectTypes||{}).find(([,type])=>String(type).endsWith('::worldz_token::PublisherCap'))?.[0];
    if(!packageId||!publisherCapId)throw new Error('Published package proof could not be decoded. No second transaction was sent.');
    published={packageId,publisherCapId,publishDigest:digest,address:c.account.address};
    sessionStorage.setItem('worldz-sui-devnet-publish',JSON.stringify(published));
    $('#package-id').textContent=packageId;
    $('#publish-digest').textContent=digest;
    $('#receipt').classList.add('show');
    $('#initialize').disabled=false;
    $('#publish').disabled=true;
    status('Step 1 proven ✅ Package is immutable. Review the package ID, then approve Step 2 to initialize fixed supply.');
  }catch(e){status(e?.message||String(e),true);}
}
async function initialize(){
  try{
    const c=connection();
    if(!published)throw new Error('Publish the immutable package first.');
    if(c.account.address!==published.address)throw new Error('Reconnect the same wallet that published this package.');
    const f=formData();
    status('Preparing fixed-supply Currency initialization…');
    const tx=new Transaction();
    const [fullSupply]=tx.moveCall({
      target:published.packageId+'::worldz_token::create_fixed_supply',
      arguments:[
        tx.object(published.publisherCapId),
        tx.object(COIN_REGISTRY),
        tx.pure.u8(f.decimals),
        tx.pure.string(f.symbol),
        tx.pure.string(f.name),
        tx.pure.string(f.description),
        tx.pure.string(f.icon),
        tx.pure.u64(f.raw),
      ],
    });
    tx.transferObjects([fullSupply],c.account.address);
    const out=await dAppKit.signAndExecuteTransaction({transaction:tx,network:'devnet'});
    if(out.FailedTransaction)throw new Error(out.FailedTransaction.status?.error?.message||'Currency initialization failed.');
    const digest=out.Transaction.digest;
    await fullTx(digest);
    const coinType=published.packageId+'::worldz_token::WorldzToken';
    const client=dAppKit.getClient('devnet');
    let observed=0n;
    for(let i=0;i<8;i++){
      const b=await client.getBalance({owner:c.account.address,coinType});
      observed=BigInt(b.balance?.balance??b.balance?.totalBalance??b.balance??0);
      if(observed>=f.raw)break;
      await new Promise(r=>setTimeout(r,1200));
    }
    if(observed<f.raw)throw new Error('Initialization succeeded, but balance indexing has not yet verified the full genesis supply. Recheck the receipt shortly.');
    $('#coin-type').textContent=coinType;
    $('#init-digest').textContent=digest;
    $('#balance').textContent=observed.toString();
    $('#receipt').classList.add('show');
    $('#initialize').disabled=true;
    sessionStorage.removeItem('worldz-sui-devnet-publish');
    status('WORLDZ SUI DEVNET PROOF ✅ Fixed supply initialized. Package immutable. TreasuryCap absent. Metadata immutable. Full genesis balance verified.');
  }catch(e){status(e?.message||String(e),true);}
}

dAppKit.stores.$connection.subscribe(c=>{
  if(c?.isConnected&&c.account){
    status('Connected: '+c.account.address+' • Sui Devnet');
    const saved=sessionStorage.getItem('worldz-sui-devnet-publish');
    if(saved&&!published){
      try{
        const x=JSON.parse(saved);
        if(x.address===c.account.address){
          published=x;$('#package-id').textContent=x.packageId;$('#publish-digest').textContent=x.publishDigest;
          $('#receipt').classList.add('show');$('#initialize').disabled=false;$('#publish').disabled=true;
        }
      }catch{}
    }
  } else status('Connect a compatible Sui wallet. Devnet only.');
});
$('#publish').addEventListener('click',publish);
$('#initialize').addEventListener('click',initialize);
