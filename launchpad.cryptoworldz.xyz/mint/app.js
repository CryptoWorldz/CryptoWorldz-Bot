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
const WORLDZ_MAINNET_RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
let connection=new Connection(clusterApiUrl('devnet'),'confirmed');
let walletCtx=null,preflightOk=false,busy=false,pending=null;
const DRAFT_KEY='worldzmint-draft-v1';
let restoringDraft=false;

function setStatus(text,type=''){const el=$('#status');el.textContent=text;el.className='status'+(type?' '+type:'');}
function short(v){const s=String(v||'');return s.length>15?s.slice(0,7)+'…'+s.slice(-7):s;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function network(){return $('#network').value;}
function chain(){return network()==='mainnet-beta'?'solana:mainnet':'solana:devnet';}
function refreshConnection(){connection=new Connection(network()==='mainnet-beta'?WORLDZ_MAINNET_RPC:clusterApiUrl('devnet'),'confirmed');}
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
function draftSnapshot(){
  return {
    version:1,saved_at:new Date().toISOString(),
    environment:network(),
    token_name:$('#name').value,
    symbol:$('#symbol').value,
    fixed_supply:$('#supply').value,
    description:$('#description').value,
    image_url:$('#image').value,
    website:$('#website').value,
    allocations:allocations(),
    recipients:recipients()
  };
}
function saveDraft(){
  if(restoringDraft)return;
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draftSnapshot()));}catch(error){console.warn('WorldzMINT draft save failed',error);}
}
function restoreDraft(){
  let restored=false;
  try{
    const raw=localStorage.getItem(DRAFT_KEY);if(!raw)return false;
    const d=JSON.parse(raw);if(!d||d.version!==1)return false;
    restoringDraft=true;
    if(['devnet','mainnet-beta'].includes(d.environment))$('#network').value=d.environment;
    $('#name').value=d.token_name||'';
    $('#symbol').value=d.symbol||'';
    $('#supply').value=d.fixed_supply||'';
    $('#description').value=d.description||'';
    $('#image').value=d.image_url||'';
    const preview=$('#image-preview');if(preview&&d.image_url){preview.src=d.image_url;preview.hidden=false;}
    $('#website').value=d.website||'';
    for(const [k,val] of Object.entries(d.allocations||{})){const el=$('[data-key="'+k+'"]');if(el&&val!==null&&val!==undefined)el.value=String(val);}
    for(const [k,id] of Object.entries({creator:'#creator-wallet',liquidity:'#liquidity-wallet',community:'#community-wallet',treasury:'#treasury-wallet',growth:'#growth-wallet'})){
      if(d.recipients?.[k])$(id).value=String(d.recipients[k]);
    }
    refreshConnection();restored=true;
  }catch(error){console.warn('WorldzMINT draft restore failed',error);}
  finally{restoringDraft=false;}
  return restored;
}
function applyPrivatePreset(v){
  if(!v||typeof v!=='object')throw new Error('Invalid private launch preset.');
  restoringDraft=true;
  try{
    if(['devnet','mainnet-beta'].includes(v.environment))$('#network').value=v.environment;
    refreshConnection();
    $('#name').value=String(v.token_name||'');
    $('#symbol').value=String(v.symbol||'');
    $('#supply').value=String(v.fixed_supply||'');
    $('#description').value=String(v.description||'');
    $('#image').value=String(v.image_url||'');
    $('#website').value=String(v.website||'');
    const preview=$('#image-preview');
    if(preview&&v.image_url){preview.src=String(v.image_url);preview.hidden=false;}
    for(const [k,val] of Object.entries(v.allocations||{})){
      const el=$('[data-key="'+k+'"]');if(el)el.value=String(val);
    }
    for(const [k,id] of Object.entries({creator:'#creator-wallet',liquidity:'#liquidity-wallet',community:'#community-wallet',treasury:'#treasury-wallet',growth:'#growth-wallet'})){
      if(v.recipients?.[k])$(id).value=String(v.recipients[k]);
    }
  }finally{restoringDraft=false;}
  allocationMath();saveDraft();
}
async function loadWalletPreset(){
  if(!walletCtx?.address)return false;
  const r=await fetch(API+'?walletPreset='+encodeURIComponent(walletCtx.address),{cache:'no-store'});
  if(r.status===404)return false;
  const out=await r.json().catch(()=>({}));
  if(!r.ok||!out.ok||!out.config)throw new Error(out.error||'Saved WorldzMINT launch could not be loaded.');
  applyPrivatePreset(out.config);
  $('#creator-wallet').value=walletCtx.address;
  saveDraft();
  setStatus('WORLDZ READY ✅\nAll saved launch details loaded automatically. Press START WORLDZMINT™.','good');
  return true;
}
async function loadPrivatePreset(){
  const params=new URLSearchParams(location.search),code=params.get('launch');
  if(!code)return false;
  setStatus('LOADING PRIVATE WORLDZMINT PRESET…\nNo wallet action is being requested.','warn');
  const r=await fetch(API+'?preset='+encodeURIComponent(code),{cache:'no-store'});
  const out=await r.json().catch(()=>({}));
  if(!r.ok||!out.ok||!out.config)throw new Error(out.error||'Private launch preset could not be loaded.');
  applyPrivatePreset(out.config);
  const clean=new URL(location.href);
  clean.searchParams.delete('launch');clean.searchParams.set('ready','1');
  history.replaceState({},'',clean.pathname+clean.search+clean.hash);
  setStatus('WORLDZMINT READY ✅\nAll launch details are loaded. Press START WORLDZMINT™.','good');
  return true;
}
function bpsMap(a){const out={};for(const [k,v] of Object.entries(a))out[k]=Math.round(Number(v)*100);return out;}
function allocationMath(){
  const a=allocations(),total=Object.values(a).reduce((n,v)=>n+(Number.isFinite(v)?v:0),0);
  $('#allocation-total').textContent=total.toFixed(1).replace('.0','')+'%';
  $('#allocation-total').style.color=Math.abs(total-100)<.001?'#7be8b8':'#ff9caf';
  preflightOk=false;if(!busy&& !pending?.registered)$('#mint-btn').disabled=false;
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
function usableInjectedProvider(p){
  return !!p&&typeof p.connect==='function'&&typeof p.signTransaction==='function'&&typeof p.signMessage==='function';
}
function jupiterInjectedProvider(){
  const candidates=[
    window?.jupiter?.solana,
    usableInjectedProvider(window?.jupiter)?window.jupiter:null,
    window?.solana?.isJupiter?window.solana:null
  ];
  return candidates.find(usableInjectedProvider)||null;
}
function legacyProvider(){
  return [jupiterInjectedProvider(),window?.phantom?.solana,window?.solflare,window?.solana]
    .filter(Boolean).find(usableInjectedProvider)||null;
}
function renderWallets(){
  const select=$('#wallet-choice'),list=walletStandardCandidates(),jupInjected=jupiterInjectedProvider();
  const previous=select.value;
  select.innerHTML='';

  list.forEach((w,i)=>{
    const o=document.createElement('option');
    o.value='standard:'+String(i);
    o.textContent=w.name+(/jupiter/i.test(w.name)?' ⭐':'');
    select.appendChild(o);
  });

  if(jupInjected){
    const inApp=document.createElement('option');
    inApp.value='jupiter-inapp';
    inApp.textContent='Jupiter In-App Wallet ⭐';
    select.appendChild(inApp);
  }

  const generic=legacyProvider();
  if(generic&&generic!==jupInjected){
    const o=document.createElement('option');
    o.value='legacy';
    o.textContent='Injected Solana wallet';
    select.appendChild(o);
  }

  const mobile=document.createElement('option');
  mobile.value='jupiter-mobile';
  mobile.textContent='Jupiter Mobile via WalletConnect';
  select.appendChild(mobile);

  const jupiterStandardIndex=list.findIndex(w=>/jupiter/i.test(String(w.name||'')));
  if(jupiterStandardIndex>=0){
    // In Jupiter's in-app browser, Wallet Standard is authoritative.
    // Never let a stale legacy selection override a detected Jupiter wallet.
    select.value='standard:'+String(jupiterStandardIndex);
  }else if(jupInjected)select.value='jupiter-inapp';
  else if(list.length)select.value='standard:0';
  else if(generic)select.value='legacy';
  else select.value='jupiter-mobile';

  if(jupiterStandardIndex<0&&previous&&[...select.options].some(o=>o.value===previous)&&previous!=='jupiter-mobile')select.value=previous;
}
async function connectWallet(){
  if(busy)return;
  const button=$('#wallet-btn');
  const originalButtonText=button.textContent;
  button.disabled=true;
  button.textContent='Opening Jupiter…';
  try{
    const list=walletStandardCandidates();
    let choice=$('#wallet-choice').value;
    const jupiterStandardIndex=list.findIndex(w=>/jupiter/i.test(String(w.name||'')));

    // If Jupiter Wallet Standard is present, always use it. This prevents a stale
    // "legacy/injected" selector value from sending Jupiter into the wrong branch.
    if(jupiterStandardIndex>=0){
      choice='standard:'+String(jupiterStandardIndex);
      $('#wallet-choice').value=choice;
    }else if(choice==='jupiter-mobile'&&jupiterInjectedProvider()){
      choice='jupiter-inapp';
      $('#wallet-choice').value=choice;
    }else if(choice==='jupiter-mobile'&&list.length){
      choice='standard:0';
      $('#wallet-choice').value=choice;
    }

    if(choice==='jupiter-inapp'){
      const p=jupiterInjectedProvider();
      if(!p)throw new Error('Jupiter in-app provider disappeared. Reload the page inside Jupiter Wallet.');
      setStatus('CONNECTING DIRECTLY TO JUPITER WALLET…\nUsing Jupiter\'s in-app injected wallet — no WalletConnect hand-off is required.','warn');
      const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;
      if(!pk)throw new Error('Jupiter connected but returned no public key.');
      walletCtx={kind:'legacy',provider:p,address:pk.toString(),name:'Jupiter In-App Wallet'};
    }else if(choice==='jupiter-mobile'){
      setStatus('OPENING JUPITER MOBILE…\nUsing the Jupiter/Reown WalletConnect bridge. Approve only the connection — no mint transaction is being requested.','warn');
      const mod=await import('/mint/jupiter-mobile.js?v=20260921-reown-v3');
      mod.resetJupiterMobileConnectionState?.();
      const adapter=await mod.getJupiterMobileAdapter();
      const connectTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Jupiter Mobile did not finish connecting within 20 seconds. The stale WalletConnect state has been cleared; reload once if this message appears.')),20000));
      await Promise.race([adapter.connect(),connectTimeout]);
      const pk=adapter.publicKey;if(!pk)throw new Error('Jupiter Mobile connected but returned no public key.');
      walletCtx={kind:'adapter',provider:adapter,address:pk.toString(),name:'Jupiter Mobile'};
    }else if(choice.startsWith('standard:')){
      const idx=Number(choice.split(':')[1]),w=list[idx];
      if(!w)throw new Error('Selected Wallet Standard wallet is no longer available.');
      setStatus('CONNECTING '+(/jupiter/i.test(String(w.name||''))?'JUPITER':'SOLANA')+' WALLET…\nUsing Wallet Standard. No blockchain transaction is being sent.','warn');
      const out=await w.features['standard:connect'].connect();
      const account=(out?.accounts||w.accounts||[])[0];if(!account)throw new Error('Wallet returned no Solana account.');
      walletCtx={kind:'standard',wallet:w,account,address:account.address,name:w.name};
    }else{
      const p=legacyProvider();if(!p)throw new Error('No compatible injected Solana wallet found.');
      const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;if(!pk)throw new Error('Wallet returned no public key.');
      walletCtx={kind:'legacy',provider:p,address:pk.toString(),name:'Injected Solana Wallet'};
    }
    $('#creator-wallet').value=walletCtx.address;
    saveDraft();
    $('#wallet-btn').textContent=short(walletCtx.address);$('#wallet-btn').classList.add('connected');
    try{await loadWalletPreset();}catch(error){console.warn('Saved WorldzMINT preset load failed',error);}
    setStatus((/jupiter/i.test(walletCtx.name)?'JUPITER WALLET':'SOLANA WALLET')+' CONNECTED ✅\n'+walletCtx.address+'\nNetwork selection: '+network()+'\nNo transaction has been requested.','good');
    preflightOk=false;if(!pending?.registered)$('#mint-btn').disabled=false;renderProof();
  }catch(e){
    console.error('WorldzMINT wallet connection failed',e);
    button.textContent='Connect Wallet';
    const detected=walletStandardCandidates().map(w=>String(w.name||'Unnamed')).join(', ')||'none';
    const injected=jupiterInjectedProvider()?'yes':'no';
    setStatus('WALLET CONNECTION FAILED\n'+(e?.message||String(e))+'\n\nDetected Wallet Standard: '+detected+'\nDirect Jupiter provider: '+injected+'\n\nNo transaction was sent.','bad');
    alert('WorldzMINT wallet connection failed: '+(e?.message||String(e))+'\n\nDetected wallets: '+detected+'\nDirect Jupiter: '+injected);
  }finally{
    button.disabled=false;
    if(!walletCtx&&button.textContent==='Opening Jupiter…')button.textContent=originalButtonText||'Connect Wallet';
  }
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
function fileDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(reader.error||new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Could not decode image.'));
    img.src=src;
  });
}
async function resizeTokenImage(file){
  if(!file)throw new Error('Choose an image first.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG or WebP.');
  if(file.size>12*1024*1024)throw new Error('Source image is too large.');
  const src=await fileDataUrl(file),img=await loadImage(src);
  const max=768,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
  const height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.');
  ctx.drawImage(img,0,0,width,height);
  const dataUrl=canvas.toDataURL('image/jpeg',0.9);
  const base64=dataUrl.split(',')[1]||'';
  if(!base64)throw new Error('Image conversion failed.');
  return {image_base64:base64,mime_type:'image/jpeg',width,height};
}
async function uploadTokenImage(file){
  setStatus('PREPARING TOKEN IMAGE…\nNo wallet connection or signature is required.','warn');
  const image=await resizeTokenImage(file);
  setStatus('UPLOADING TOKEN IMAGE…\nNo signing. No blockchain transaction.','warn');
  const out=await api({action:'UPLOAD_IMAGE',...image});
  $('#image').value=out.imageUrl;
  const preview=$('#image-preview');if(preview){preview.src=out.imageUrl;preview.hidden=false;}
  saveDraft();
  preflightOk=false;if(!pending?.registered)$('#mint-btn').disabled=false;
  setStatus('TOKEN IMAGE READY ✅\n'+out.imageUrl+'\n\nNo wallet signature and no blockchain transaction were used.','good');
  return out.imageUrl;
}
function removeTokenImage(){
  $('#image').value='';
  const preview=$('#image-preview');if(preview){preview.removeAttribute('src');preview.hidden=true;}
  const file=$('#image-file');if(file)file.value='';
  saveDraft();preflightOk=false;if(!pending?.registered)$('#mint-btn').disabled=false;
  setStatus('TOKEN IMAGE REMOVED. Upload another image whenever you want — no signing required.','good');
}
async function signTransaction(tx,partialSigners=[]){
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.feePayer=new PublicKey(walletCtx.address);tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;
  if(partialSigners.length)tx.partialSign(...partialSigners);
  let signed;
  if(walletCtx.kind==='standard'){
    const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false});
    // Wallet Standard's direct signTransaction path takes account + serialized
    // transaction. Do not pass a chain hint here; the official adapter omits it
    // for signTransaction and some mobile wallets reject the extra argument.
    const out=await walletCtx.wallet.features['solana:signTransaction'].signTransaction({
      account:walletCtx.account,
      transaction:new Uint8Array(wire)
    });
    const bytes=out?.[0]?.signedTransaction;if(!bytes)throw new Error('Wallet returned no signed transaction.');
    signed=Transaction.from(bytes);
  }else signed=await walletCtx.provider.signTransaction(tx);
  // IMPORTANT: signed is a legacy Transaction. web3.js v1.98.x rejects a
  // SimulateTransactionConfig object for legacy Transaction and throws
  // "Invalid arguments". sendRawTransaction(skipPreflight:false) already runs
  // Solana RPC preflight against the exact signed wire transaction.
  const wire=signed.serialize();
  const sig=await connection.sendRawTransaction(wire,{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
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
    const v=p.config;$('#network').value=v.environment;refreshConnection();$('#name').value=v.token_name;$('#symbol').value=v.symbol;$('#supply').value=v.fixed_supply;$('#description').value=v.description||'';$('#image').value=v.image_url||'';const preview=$('#image-preview');if(preview&&v.image_url){preview.src=v.image_url;preview.hidden=false;}$('#website').value=v.website||'';
    for(const [k,val] of Object.entries(v.allocations||{})){const el=$('[data-key="'+k+'"]');if(el)el.value=String(val);}
    for(const [k,id] of Object.entries({creator:'#creator-wallet',liquidity:'#liquidity-wallet',community:'#community-wallet',treasury:'#treasury-wallet',growth:'#growth-wallet'}))$(id).value=v.recipients?.[k]||'';
    allocationMath();$('#mint-btn').textContent=p.distributeSig?'Finish Metadata + Revoke':'Continue Pending Mint';setStatus('PENDING WORLDZMINT RECOVERED\nMint: '+p.mint+'\nReconnect the same creator wallet, run preflight and continue.','warn');renderProof();
  }catch{}
}
async function runPreflight(){
  refreshConnection();const check=validate();preflightOk=check.ok;
  if(!check.ok){$('#mint-btn').disabled=false;setStatus('WORLDZMINT PREFLIGHT BLOCKED\n• '+check.errors.join('\n• '),'bad');renderProof();return false;}
  if(network()==='mainnet-beta'){
    setStatus('WORLDZMINT MAINNET PREFLIGHT PASS ✅\nFixed supply: '+Number(check.v.fixed_supply).toLocaleString()+'\nCreator liquid: '+check.v.allocations.creator+'%\nLiquidity reserve: '+check.v.allocations.liquidity+'%\nCommunity: '+check.v.allocations.community+'%\nTreasury: '+check.v.allocations.treasury+'%\nWorldz supply take: 0%\nWallet-transfer tax: 0%\n\nMAINNET is real and irreversible. No transaction has been signed yet.','good');
  }else setStatus('WORLDZMINT DEVNET PREFLIGHT PASS ✅\nRehearsal network only. No transaction has been signed yet.','good');
  $('#mint-btn').disabled=false;renderProof();return true;
}
async function prepareRegistryStage(){
  if(!pending?.mint||!pending?.createSig)throw new Error('Created mint proof is missing.');
  tokenBusy('VERIFYING CREATED MINT…\nWorldzMINT is checking the on-chain creator signature and mint authorities. No extra wallet signature is required.');
  const prep=await api({
    action:'PREPARE',
    wallet:walletCtx.address,
    mint:pending.mint,
    environment:network(),
    create_mint_tx_signature:pending.createSig,
    ...pending.config
  });
  pending.metadataUri=prep.metadataUri;
  pending.prepared=true;
  savePending();renderProof();
}
async function createMintStage(v){
  const mintKp=Keypair.generate(),mint=mintKp.publicKey.toBase58();
  const rent=await connection.getMinimumBalanceForRentExemption(MINT_SIZE),owner=new PublicKey(walletCtx.address);
  const tx=new Transaction().add(
    SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mintKp.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(mintKp.publicKey,6,owner,owner,TOKEN_PROGRAM_ID)
  );
  tokenBusy('Wallet approval 1/3 — CREATE FIXED-SUPPLY MINT\nSolana RPC preflight checks the exact signed transaction before broadcast.');
  const createSig=await signTransaction(tx,[mintKp]);
  pending={standard:STANDARD_VERSION,mint,metadataUri:null,createSig,prepared:false,distributeSig:null,finalizeSig:null,registered:false,config:v};
  savePending();renderProof();
  await prepareRegistryStage();
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
  tokenBusy('Wallet approval 2/3 — DISTRIBUTE EXACT GENESIS SUPPLY\nSupply goes directly to the five disclosed destination wallets. Solana RPC preflight checks the exact signed transaction before broadcast.');
  pending.distributeSig=await signTransaction(tx);pending.atas=atas;savePending();renderProof();
}
async function registerFinalProof(){
  tokenBusy('ON-CHAIN FINALISATION CONFIRMED.\nWorldzMINT is independently verifying supply, allocations and revoked authorities. No extra wallet signature is required.');
  const out=await api({
    action:'FINALIZE',
    wallet:walletCtx.address,
    mint:pending.mint,
    environment:network(),
    create_mint_tx_signature:pending.createSig,
    distribute_tx_signature:pending.distributeSig,
    finalize_tx_signature:pending.finalizeSig
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
  if(busy)return;
  // One-button flow: connect wallet if needed, restore the saved owner preset if
  // the form is incomplete, then run preflight automatically.
  if(!walletCtx){
    await connectWallet();
    if(!walletCtx)return;
  }
  const current=values();
  const missing=current.token_name.length<2||current.symbol.length<2||!/^\d+$/.test(current.fixed_supply)||!/^https:\/\//i.test(current.image_url)||
    ['liquidity','community','treasury','growth'].some(k=>!isPk(current.recipients[k]));
  if(missing){
    try{await loadWalletPreset();}catch(error){
      setStatus('WORLDZMINT SETUP COULD NOT LOAD\n'+(error?.message||String(error)),'bad');return;
    }
  }
  if(!await runPreflight())return;
  if(network()==='mainnet-beta'&&!pending){
    const ok=confirm('REAL SOLANA MAINNET\n\nWorldzMINT will create a permanent fixed-supply token and send its full genesis supply directly to the disclosed wallets. Mint and Freeze authority will be permanently revoked after metadata.\n\nContinue?');
    if(!ok)return;
  }
  busy=true;$('#mint-btn').disabled=true;
  try{
    const v=values();
    if(!pending)await createMintStage(v);
    if(!pending.prepared)await prepareRegistryStage();
    if(!pending.distributeSig)await distributeStage();
    if(!pending.finalizeSig)await finalizeStage();
    else if(!pending.registered)await registerFinalProof();
  }catch(e){
    console.error(e);setStatus('WORLDZMINT ACTION STOPPED\n'+(e?.message||String(e))+'\n\nNo hidden retry was attempted. If an earlier transaction succeeded, this page keeps the pending mint locally so you can reconnect and continue.','bad');
  }finally{busy=false;if(!pending?.registered)$('#mint-btn').disabled=false;}
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
$('#image-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    await uploadTokenImage(file);
    e.target.value='';
  }catch(err){
    console.error(err);
    setStatus('TOKEN IMAGE UPLOAD FAILED\n'+(err?.message||String(err))+'\n\nNo signature and no transaction were used.','bad');
    e.target.value='';
  }
});
$('#image-remove')?.addEventListener('click',removeTokenImage);
$('#preflight').addEventListener('click',runPreflight);
$('#mint-btn').addEventListener('click',mintFlow);
$('#network').addEventListener('change',()=>{refreshConnection();saveDraft();preflightOk=false;if(!pending?.registered)$('#mint-btn').disabled=false;if(pending&&pending.config?.environment!==network())setStatus('Pending mint exists on '+pending.config.environment+'. Switch back to that network to continue.','warn');});
$('input,textarea,select').forEach(x=>{
  if(x.id==='image-file')return;
  const persist=()=>{if(!['wallet-choice'].includes(x.id))saveDraft();if(!['wallet-choice','network'].includes(x.id))allocationMath();};
  x.addEventListener('input',persist);
  x.addEventListener('change',persist);
});
window.addEventListener('pagehide',saveDraft);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft();});
renderWallets();
getWallets().on('register',()=>{
  const before=$('#wallet-choice').value;
  renderWallets();
  const after=$('#wallet-choice').value;
  if(!walletCtx&&after!==before&&after!=='jupiter-mobile'){
    setStatus('JUPITER / SOLANA WALLET DETECTED ✅\n'+($('#wallet-choice').selectedOptions[0]?.textContent||after)+'\nTap Connect Wallet.','good');
  }
});
const privatePresetCode=new URLSearchParams(location.search).get('launch');
let draftRestored=false;
if(privatePresetCode){
  try{await loadPrivatePreset();draftRestored=true;}
  catch(error){setStatus('PRIVATE WORLDZMINT PRESET FAILED\n'+(error?.message||String(error)),'bad');}
}else{
  draftRestored=restoreDraft();
}
restorePending();
allocationMath();renderProof();loadRegistry();
if(draftRestored&&!pending&&!privatePresetCode){
  setStatus('WORLDZMINT DRAFT RESTORED ✅\nYour token details were saved on this device. Reconnect the wallet and continue where you left off.','good');
}
// Reown is lazy-loaded only if no native/Wallet Standard Solana wallet is available.
