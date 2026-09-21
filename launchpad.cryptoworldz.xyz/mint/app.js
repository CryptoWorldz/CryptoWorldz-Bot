import {
  Connection,Keypair,PublicKey,SystemProgram,Transaction,clusterApiUrl
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,MINT_SIZE,AuthorityType,
  createInitializeMintInstruction,createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,createSetAuthorityInstruction,getAssociatedTokenAddress
} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {createCreateMetadataAccountV3Instruction} from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@2.13.0?bundle';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-mint-register';
const METADATA_PROGRAM=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const STANDARD_VERSION='WORLDZMINT-1';
let connection=new Connection(clusterApiUrl('devnet'),'confirmed');
let walletCtx=null,preflightOk=false,busy=false,pending=null;

function setStatus(text,type=''){const el=$('#status');el.textContent=text;el.className='status'+(type?' '+type:'');}
function short(v){const s=String(v||'');return s.length>15?s.slice(0,7)+'…'+s.slice(-7):s;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function network(){return $('#network').value;}
function chain(){return network()==='mainnet-beta'?'solana:mainnet':'solana:devnet';}
function refreshConnection(){connection=new Connection(clusterApiUrl(network()),'confirmed');}
function allocations(){const o={};$$('.allocation').forEach(x=>o[x.dataset.key]=Number(x.value));return o;}
function recipients(){return {
  creator:$('#creator-wallet').value.trim(),liquidity:$('#liquidity-wallet').value.trim(),
  community:$('#community-wallet').value.trim(),treasury:$('#treasury-wallet').value.trim(),
  growth:$('#growth-wallet').value.trim()
};}
function values(){return {
  environment:network(),token_name:$('#name').value.trim(),symbol:$('#symbol').value.trim().toUpperCase(),
  fixed_supply:$('#supply').value.trim(),decimals:6,description:$('#description').value.trim(),
  image_url:$('#image').value.trim(),website:$('#website').value.trim(),
  allocations:allocations(),recipients:recipients()
};}
function bpsMap(a){const out={};for(const [k,v] of Object.entries(a))out[k]=Math.round(Number(v)*100);return out;}
function allocationMath(){
  const a=allocations(),total=Object.values(a).reduce((n,v)=>n+(Number.isFinite(v)?v:0),0);
  $('#allocation-total').textContent=total.toFixed(1).replace('.0','')+'%';
  $('#allocation-total').style.color=Math.abs(total-100)<.001?'#7be8b8':'#ff9caf';
  preflightOk=false;if(!busy)$('#mint-btn').disabled=true;
}
function isPk(s){try{new PublicKey(s);return true}catch{return false}}
function validate(){
  const v=values(),e=[],a=v.allocations,r=v.recipients;
  if(!walletCtx)e.push('Connect a wallet first.');
  if(v.token_name.length<2||v.token_name.length>32)e.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(v.symbol))e.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!/^\d+$/.test(v.fixed_supply)||BigInt(v.fixed_supply)<1000n||BigInt(v.fixed_supply)>1000000000000n)e.push('Supply must be a whole number from 1,000 to 1,000,000,000,000.');
  if(v.description.length>700)e.push('Description is too long.');
  if(!/^https:\/\//i.test(v.image_url))e.push('An HTTPS token image URL is required.');
  if(v.website&&!/^https:\/\//i.test(v.website))e.push('Website must use HTTPS.');
  if(Object.values(a).some(x=>!Number.isFinite(x)||x<0||x>100))e.push('Every allocation must be 0–100%.');
  const total=Object.values(a).reduce((n,x)=>n+x,0);
  if(Math.abs(total-100)>.001)e.push('Genesis allocations must total exactly 100%.');
  if(a.creator>5)e.push('Creator liquid allocation cannot exceed 5%.');
  if(a.liquidity<25||a.liquidity>60)e.push('Liquidity reserve must be 25–60%.');
  if(a.community<20)e.push('Community allocation must be at least 20%.');
  if(a.treasury>15)e.push('Treasury allocation cannot exceed 15%.');
  for(const [k,x] of Object.entries(r))if(!isPk(x))e.push(k+' recipient is not a valid Solana address.');
  if(Object.values(r).filter(isPk).length===5&&new Set(Object.values(r)).size!==5)e.push('All five genesis destination wallets must be distinct.');
  if(walletCtx&&r.creator!==walletCtx.address)e.push('Creator wallet must equal the connected wallet.');
  const bp=bpsMap(a);if(Object.values(bp).reduce((n,x)=>n+x,0)!==10000)e.push('Allocations must resolve to exactly 10,000 basis points.');
  if(pending&&pending.config?.environment!==v.environment)e.push('Pending mint network does not match the selected network.');
  return {ok:!e.length,errors:e,v};
}
function renderProof(extra={}){
  const p=pending||{},items=[
    ['Wallet connected',!!walletCtx,walletCtx?short(walletCtx.address):'PENDING'],
    ['Safe tokenomics preflight',preflightOk,preflightOk?'PASS':'PENDING'],
    ['Mint account created',!!p.createSig,p.createSig?short(p.mint):'PENDING'],
    ['Exact supply distributed',!!p.distributeSig,p.distributeSig?'ON-CHAIN':'PENDING'],
    ['Metadata + authorities finalised',!!p.finalizeSig,p.finalizeSig?'ON-CHAIN':'PENDING'],
    ['WorldzMINT proof registered',!!extra.registered||p.registered,extra.registered||p.registered?'VERIFIED':'PENDING']
  ];
  $('#proofs').innerHTML=items.map(([a,ok,b])=>'<div class="proof '+(ok?'pass':'wait')+'">'+(ok?'✓ ':'! ')+esc(a)+' — '+esc(b)+'</div>').join('');
}
function walletStandardCandidates(){
  try{
    return getWallets().get()
      .filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.features?.['solana:signMessage']&&Array.isArray(w.chains)&&w.chains.some(c=>String(c).startsWith('solana:')))
      .sort((a,b)=>Number(!/jupiter/i.test(a.name))-Number(!/jupiter/i.test(b.name))||String(a.name).localeCompare(String(b.name)));
  }catch{return []}
}
function legacyProvider(){
  return [window?.jupiter?.solana,window?.phantom?.solana,window?.solflare,window?.solana]
    .filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function'&&typeof p.signMessage==='function')||null;
}
function renderWallets(){
  const select=$('#wallet-choice'),list=walletStandardCandidates();
  select.innerHTML='';
  const mobile=document.createElement('option');
  mobile.value='jupiter-mobile';
  mobile.textContent='Jupiter Mobile ⭐';
  select.appendChild(mobile);
  list.forEach((w,i)=>{
    const o=document.createElement('option');
    o.value='standard:'+String(i);
    o.textContent=w.name+(/jupiter/i.test(w.name)?' ⭐':'');
    select.appendChild(o);
  });
  if(legacyProvider()){
    const o=document.createElement('option');
    o.value='legacy';
    o.textContent='Injected Solana wallet';
    select.appendChild(o);
  }
  select.value='jupiter-mobile';
}
async function connectWallet(){
  if(busy)return;
  try{
    const list=walletStandardCandidates(),choice=$('#wallet-choice').value;
    if(choice==='jupiter-mobile'){
      setStatus('OPENING JUPITER MOBILE…\nApprove the WorldzLaunchPad connection in Jupiter Wallet.','warn');
      const mod=await import('/mint/jupiter-mobile.js?v=20260921-reown-v1');
      const adapter=await mod.getJupiterMobileAdapter();
      await adapter.connect();
      const pk=adapter.publicKey;if(!pk)throw new Error('Jupiter Mobile connected but returned no public key.');
      walletCtx={kind:'adapter',provider:adapter,address:pk.toString(),name:'Jupiter Mobile'};
    }else if(choice.startsWith('standard:')){
      const idx=Number(choice.split(':')[1]),w=list[idx];
      if(!w)throw new Error('Selected Wallet Standard wallet is no longer available.');
      const out=await w.features['standard:connect'].connect();
      const account=(out?.accounts||w.accounts||[])[0];if(!account)throw new Error('Wallet returned no Solana account.');
      walletCtx={kind:'standard',wallet:w,account,address:account.address,name:w.name};
    }else{
      const p=legacyProvider();if(!p)throw new Error('No compatible injected Solana wallet found.');
      const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;if(!pk)throw new Error('Wallet returned no public key.');
      walletCtx={kind:'legacy',provider:p,address:pk.toString(),name:'Injected Solana Wallet'};
    }
    $('#creator-wallet').value=walletCtx.address;
    $('#wallet-btn').textContent=short(walletCtx.address);$('#wallet-btn').classList.add('connected');
    setStatus((/jupiter/i.test(walletCtx.name)?'JUPITER WALLET':'SOLANA WALLET')+' CONNECTED ✅\n'+walletCtx.address+'\nNetwork selection: '+network()+'\nNo transaction has been requested.','good');
    preflightOk=false;$('#mint-btn').disabled=true;renderProof();
  }catch(e){setStatus('WALLET CONNECTION FAILED\n'+(e?.message||String(e))+'\n\nIf Jupiter Wallet opened, return here after approving the connection.','bad');}
}
async function signMessage(message){
  const bytes=new TextEncoder().encode(message);
  if(walletCtx.kind==='standard'){
    const out=await walletCtx.wallet.features['solana:signMessage'].signMessage({message:bytes,account:walletCtx.account});
    const sig=out?.[0]?.signature;if(!sig)throw new Error('Wallet returned no message signature.');
    return new Uint8Array(sig);
  }
  const out=walletCtx.kind==='adapter'?await walletCtx.provider.signMessage(bytes):await walletCtx.provider.signMessage(bytes,'utf8');
  return new Uint8Array(out?.signature||out);
}
async function bs58encode(bytes){const mod=await import('https://esm.sh/bs58@6.0.0?bundle');const bs58=mod.default||mod;return bs58.encode(bytes);}
async function signTransaction(tx,partialSigners=[]){
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.feePayer=new PublicKey(walletCtx.address);tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;
  if(partialSigners.length)tx.partialSign(...partialSigners);
  let signed;
  if(walletCtx.kind==='standard'){
    const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false});
    const out=await walletCtx.wallet.features['solana:signTransaction'].signTransaction({
      transaction:new Uint8Array(wire),account:walletCtx.account,chain:chain()
    });
    const bytes=out?.[0]?.signedTransaction;if(!bytes)throw new Error('Wallet returned no signed transaction.');
    signed=Transaction.from(bytes);
  }else signed=await walletCtx.provider.signTransaction(tx);
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error('Simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-7).join('\n'):''));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)throw new Error('Transaction confirmation failed: '+JSON.stringify(conf.value.err));
  return sig;
}
async function authBody(action,mint){
  const issued_at=new Date().toISOString();
  const message=['WORLDZMINT_'+action+'_V1','mint='+mint,'wallet='+walletCtx.address,'environment='+network(),'issued_at='+issued_at].join('\n');
  const signature=await bs58encode(await signMessage(message));
  return {wallet:walletCtx.address,mint,environment:network(),issued_at,signature};
}
async function api(body){
  const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw new Error(out.error||('HTTP '+r.status));return out;
}
function savePending(){if(pending)localStorage.setItem('worldzmint-pending-v1',JSON.stringify(pending));else localStorage.removeItem('worldzmint-pending-v1');}
function restorePending(){
  try{
    const raw=localStorage.getItem('worldzmint-pending-v1');if(!raw)return;
    const p=JSON.parse(raw);if(!p?.mint||!p?.config)return;pending=p;
    const v=p.config;$('#network').value=v.environment;refreshConnection();$('#name').value=v.token_name;$('#symbol').value=v.symbol;$('#supply').value=v.fixed_supply;$('#description').value=v.description||'';$('#image').value=v.image_url||'';$('#website').value=v.website||'';
    for(const [k,val] of Object.entries(v.allocations||{})){const el=$('[data-key="'+k+'"]');if(el)el.value=String(val);}
    for(const [k,id] of Object.entries({creator:'#creator-wallet',liquidity:'#liquidity-wallet',community:'#community-wallet',treasury:'#treasury-wallet',growth:'#growth-wallet'}))$(id).value=v.recipients?.[k]||'';
    allocationMath();$('#mint-btn').textContent=p.distributeSig?'Finish Metadata + Revoke':'Continue Pending Mint';setStatus('PENDING WORLDZMINT RECOVERED\nMint: '+p.mint+'\nReconnect the same creator wallet, run preflight and continue.','warn');renderProof();
  }catch{}
}
async function runPreflight(){
  refreshConnection();const check=validate();preflightOk=check.ok;
  if(!check.ok){$('#mint-btn').disabled=true;setStatus('WORLDZMINT PREFLIGHT BLOCKED\n• '+check.errors.join('\n• '),'bad');renderProof();return false;}
  if(network()==='mainnet-beta'){
    setStatus('WORLDZMINT MAINNET PREFLIGHT PASS ✅\nFixed supply: '+Number(check.v.fixed_supply).toLocaleString()+'\nCreator liquid: '+check.v.allocations.creator+'%\nLiquidity reserve: '+check.v.allocations.liquidity+'%\nCommunity: '+check.v.allocations.community+'%\nTreasury: '+check.v.allocations.treasury+'%\nWorldz supply take: 0%\nWallet-transfer tax: 0%\n\nMAINNET is real and irreversible. No transaction has been signed yet.','good');
  }else setStatus('WORLDZMINT DEVNET PREFLIGHT PASS ✅\nRehearsal network only. No transaction has been signed yet.','good');
  $('#mint-btn').disabled=false;renderProof();return true;
}
async function createMintStage(v){
  const mintKp=Keypair.generate(),mint=mintKp.publicKey.toBase58();
  tokenBusy('Preparing WorldzMINT metadata record. Sign the harmless proof message first…');
  const auth=await authBody('PREPARE',mint);
  const prep=await api({action:'PREPARE',...auth,...v,mint});
  const rent=await connection.getMinimumBalanceForRentExemption(MINT_SIZE),owner=new PublicKey(walletCtx.address);
  const tx=new Transaction().add(
    SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mintKp.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(mintKp.publicKey,6,owner,owner,TOKEN_PROGRAM_ID)
  );
  tokenBusy('Wallet approval 1/3 — CREATE FIXED-SUPPLY MINT\nA simulation runs before broadcast.');
  const createSig=await signTransaction(tx,[mintKp]);
  pending={standard:STANDARD_VERSION,mint,metadataUri:prep.metadataUri,createSig,distributeSig:null,finalizeSig:null,registered:false,config:v};
  savePending();renderProof();
}
async function distributeStage(){
  const v=pending.config,mint=new PublicKey(pending.mint),owner=new PublicKey(walletCtx.address),a=v.allocations,r=v.recipients,bps=bpsMap(a);
  const total=BigInt(v.fixed_supply)*1000000n,amounts={},atas={};let allocated=0n;
  for(const k of ['creator','liquidity','community','treasury']){amounts[k]=total*BigInt(bps[k])/10000n;allocated+=amounts[k];}
  amounts.growth=total-allocated;
  const tx=new Transaction();
  for(const k of ['creator','liquidity','community','treasury','growth']){
    const recipient=new PublicKey(r[k]),ata=await getAssociatedTokenAddress(mint,recipient,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
    atas[k]=ata.toBase58();
    tx.add(createAssociatedTokenAccountIdempotentInstruction(owner,ata,recipient,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
    tx.add(createMintToInstruction(mint,ata,owner,amounts[k],[],TOKEN_PROGRAM_ID));
  }
  tokenBusy('Wallet approval 2/3 — DISTRIBUTE EXACT GENESIS SUPPLY\nSupply goes directly to the five disclosed destination wallets. A simulation runs first.');
  pending.distributeSig=await signTransaction(tx);pending.atas=atas;savePending();renderProof();
}
async function registerFinalProof(){
  tokenBusy('On-chain finalisation confirmed. Sign one harmless WorldzMINT proof message while the server independently verifies supply, allocations and revoked authorities…');
  const auth=await authBody('FINALIZE',pending.mint);
  const out=await api({action:'FINALIZE',...auth,
    create_mint_tx_signature:pending.createSig,distribute_tx_signature:pending.distributeSig,finalize_tx_signature:pending.finalizeSig
  });
  pending.registered=true;savePending();renderProof({registered:true});
  setStatus('WORLDZMINT VERIFIED ✅\nMint: '+pending.mint+'\nExact fixed supply verified.\nGenesis allocations verified.\nMint authority: NONE.\nFreeze authority: NONE.\n\nTrust Passport: '+out.trustPassport,'good');
  $('#mint-btn').disabled=true;$('#mint-btn').textContent='WorldzMINT Verified ✅';
  loadRegistry();
}
async function finalizeStage(){
  const v=pending.config,mint=new PublicKey(pending.mint),owner=new PublicKey(walletCtx.address);
  const [metadata]=PublicKey.findProgramAddressSync([new TextEncoder().encode('metadata'),METADATA_PROGRAM.toBytes(),mint.toBytes()],METADATA_PROGRAM);
  const metadataIx=createCreateMetadataAccountV3Instruction({
    metadata,mint,mintAuthority:owner,payer:owner,updateAuthority:owner
  },{
    createMetadataAccountArgsV3:{
      data:{name:v.token_name,symbol:v.symbol,uri:pending.metadataUri,sellerFeeBasisPoints:0,creators:null,collection:null,uses:null},
      isMutable:false,collectionDetails:null
    }
  },METADATA_PROGRAM);
  const tx=new Transaction().add(
    metadataIx,
    createSetAuthorityInstruction(mint,owner,AuthorityType.MintTokens,null,[],TOKEN_PROGRAM_ID),
    createSetAuthorityInstruction(mint,owner,AuthorityType.FreezeAccount,null,[],TOKEN_PROGRAM_ID)
  );
  tokenBusy('Wallet approval 3/3 — METADATA + PERMANENT AUTHORITY REVOCATION\nAfter this succeeds, no additional supply can ever be minted and the freeze authority is gone.');
  pending.finalizeSig=await signTransaction(tx);savePending();renderProof();
  await registerFinalProof();
}
function tokenBusy(text){setStatus(text,'warn');}
async function mintFlow(){
  if(busy)return;if(!await runPreflight())return;
  if(network()==='mainnet-beta'&&!pending){
    const ok=confirm('REAL SOLANA MAINNET\n\nWorldzMINT will create a permanent fixed-supply token and send its full genesis supply directly to the disclosed wallets. Mint and Freeze authority will be permanently revoked after metadata.\n\nContinue?');
    if(!ok)return;
  }
  busy=true;$('#mint-btn').disabled=true;
  try{
    const v=values();
    if(!pending)await createMintStage(v);
    if(!pending.distributeSig)await distributeStage();
    if(!pending.finalizeSig)await finalizeStage();
    else if(!pending.registered)await registerFinalProof();
  }catch(e){
    console.error(e);setStatus('WORLDZMINT ACTION STOPPED\n'+(e?.message||String(e))+'\n\nNo hidden retry was attempted. If an earlier transaction succeeded, this page keeps the pending mint locally so you can reconnect and continue.','bad');
  }finally{busy=false;if(!pending?.registered)$('#mint-btn').disabled=!preflightOk;}
}
async function loadRegistry(){
  try{
    const r=await fetch(API,{cache:'no-store'}),out=await r.json();if(!r.ok||!out.ok)throw new Error();
    const rows=out.mints||[],target=$('#registry');
    if(!rows.length){target.innerHTML='<div class="mint-row"><div class="num">#001?</div><div><b>First verified WorldzMINT slot is open</b><small>Fixed-supply proof only — market launch is separate.</small></div><span>→</span></div>';return;}
    target.innerHTML=rows.slice(0,10).map((x,i)=>'<a class="mint-row" href="/trust/?mint='+encodeURIComponent(x.mint)+'"><div class="num">#'+String(i+1).padStart(3,'0')+'</div><div><b>'+esc(x.token_name)+' • $'+esc(x.symbol)+'</b><small>'+Number(x.fixed_supply).toLocaleString()+' fixed supply • '+esc(String(x.environment).toUpperCase())+'</small></div><span>TRUST →</span></a>').join('');
  }catch{$('#registry').innerHTML='<div class="mint-row"><div>!</div><div><b>Mint registry unavailable</b><small>Treated as unknown — never silently green.</small></div></div>';}
}
$('#wallet-btn').addEventListener('click',connectWallet);
$('#preflight').addEventListener('click',runPreflight);
$('#mint-btn').addEventListener('click',mintFlow);
$('#network').addEventListener('change',()=>{refreshConnection();preflightOk=false;$('#mint-btn').disabled=true;if(pending&&pending.config?.environment!==network())setStatus('Pending mint exists on '+pending.config.environment+'. Switch back to that network to continue.','warn');});
$$('input,textarea,select').forEach(x=>{if(!['wallet-choice','network'].includes(x.id))x.addEventListener('input',()=>{allocationMath();});});
renderWallets();getWallets().on('register',renderWallets);restorePending();allocationMath();renderProof();loadRegistry();
import('/mint/jupiter-mobile.js?v=20260921-reown-v1').catch(error=>console.warn('Jupiter Mobile bridge preload failed',error));
