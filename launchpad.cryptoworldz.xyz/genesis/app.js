import {
  Connection,Keypair,SystemProgram,Transaction,PublicKey,clusterApiUrl,LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,MINT_SIZE,AuthorityType,
  createInitializeMintInstruction,createAssociatedTokenAccountInstruction,
  createMintToInstruction,createSetAuthorityInstruction,getAssociatedTokenAddress
} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';

const $=s=>document.querySelector(s);
const ENDPOINT='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-genesis-console';
const DEV_WALLET='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const connection=new Connection(clusterApiUrl('mainnet-beta'),'confirmed');

let wallet=null;
let authSession=null;
let privateConfig=null;
let tokens=[];

function provider(){
  return [window.phantom&&window.phantom.solana,window.solflare,window.solana]
    .filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
function setStatus(text,type=''){
  const el=$('#auth-status');el.textContent=text;el.className='status'+(type?' '+type:'');
}
function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function short(v){const s=String(v||'');return s.length>14?s.slice(0,7)+'…'+s.slice(-7):s;}
async function bs58encode(bytes){
  const mod=await import('https://esm.sh/bs58@6.0.0?bundle');const bs58=mod.default||mod;return bs58.encode(bytes);
}
async function connect(){
  wallet=provider();
  if(!wallet){setStatus('No compatible Solana wallet detected. Open this exact page inside Phantom or Solflare.','bad');return false;}
  try{
    const r=await wallet.connect(),pk=(r&&r.publicKey)||wallet.publicKey;
    if(!pk)throw new Error('No public key returned');
    const address=pk.toString();
    if(address!==DEV_WALLET){
      setStatus('WRONG WALLET\nConnected: '+address+'\nThis private console only accepts the authorised genesis dev wallet.','bad');
      $('#auth').disabled=true;return false;
    }
    const balance=await connection.getBalance(pk,'confirmed');
    $('#wallet').textContent=short(address);$('#wallet').classList.add('connected');
    $('#auth').disabled=false;
    setStatus('AUTHORISED DEV WALLET CONNECTED ✅\n'+address+'\nBalance: '+(balance/LAMPORTS_PER_SOL).toFixed(5)+' SOL\nNo transaction has been requested.','good');
    return true;
  }catch(e){setStatus('Wallet connection failed: '+(e?.message||String(e)),'bad');return false;}
}
async function authenticate(){
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  if(typeof wallet.signMessage!=='function')return setStatus('This wallet does not expose message signing. Use Phantom or Solflare with signMessage support.','bad');
  $('#auth').disabled=true;
  try{
    const issued_at=new Date().toISOString();
    const message=['WORLDZ_GENESIS_AUTH_V1','wallet='+DEV_WALLET,'issued_at='+issued_at].join('\n');
    setStatus('Sign the harmless Genesis Console authentication message. This is NOT a transaction.','warn');
    const signed=await wallet.signMessage(new TextEncoder().encode(message),'utf8');
    const sigBytes=signed?.signature||signed;
    const signature=await bs58encode(sigBytes);
    authSession={wallet:DEV_WALLET,issued_at,signature};
    await refreshPrivate();
  }catch(e){setStatus('Genesis authentication failed: '+(e?.message||String(e)),'bad');}
  finally{$('#auth').disabled=false;}
}
async function api(action,payload={}){
  if(!authSession)throw new Error('Private wallet authentication required.');
  const res=await fetch(ENDPOINT,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...authSession,action,...payload}),cache:'no-store'
  });
  const out=await res.json().catch(()=>({}));
  if(!res.ok||!out.ok)throw new Error(out.detail||out.error||('HTTP '+res.status));
  return out;
}
async function refreshPrivate(){
  try{
    const out=await api('config');
    privateConfig=out;tokens=out.tokens||[];
    $('#private-area').classList.remove('hidden');$('#refresh').disabled=false;
    setStatus('PRIVATE GENESIS CONFIG UNLOCKED ✅\nNetwork: Solana mainnet-beta\nSupply destination: Team Zed Treasury '+short(out.treasuryVault)+'\nFull token details are now visible only in this authenticated session.','good');
    render();
  }catch(e){
    if(String(e?.message||e).includes('authorization_expired')){
      authSession=null;$('#private-area').classList.add('hidden');$('#refresh').disabled=true;
      setStatus('Private session expired. Sign the authentication message again.','warn');
    }else setStatus('Private state refresh failed: '+(e?.message||String(e)),'bad');
  }
}
function stateLabel(t){
  const map={prepared:'PROFILE IMAGE REQUIRED',image_ready:'READY TO MINT',minted:'MINTED • METADATA NEXT',metadata_created:'METADATA LIVE • REVOKE AUTHORITIES',authorities_revoked:'VERIFYING',verified_fixed_supply:'GENESIS VERIFIED'};
  return map[t.status]||String(t.status||'UNKNOWN').toUpperCase();
}
function cardHtml(t){
  const img=t.image_url?'<img class="token-art" src="'+esc(t.image_url)+'" alt="">':'<div class="token-art" style="display:grid;place-items:center;color:#7f6c89;font-size:.62rem;text-align:center">PROFILE<br>IMAGE</div>';
  const proof=t.verification||{};
  const done=t.status==='verified_fixed_supply';
  const local=localStorage.getItem('worldz-genesis-pending-'+t.symbol);
  let primary='';
  if(t.status==='image_ready') primary='<button class="btn primary" data-action="mint" data-symbol="'+esc(t.symbol)+'">MINT FIXED SUPPLY</button>';
  else if(t.status==='minted') primary='<button class="btn primary" data-action="metadata" data-symbol="'+esc(t.symbol)+'">CREATE METADATA</button>';
  else if(t.status==='metadata_created') primary='<button class="btn primary" data-action="revoke" data-symbol="'+esc(t.symbol)+'">REVOKE MINT + FREEZE</button>';
  else if(done) primary='<a class="btn secondary" target="_blank" rel="noopener" href="https://solscan.io/token/'+esc(t.mint_address)+'">OPEN MINT ↗</a>';
  const recovery=(local&&t.status==='image_ready')?'<button class="btn secondary" data-action="recover" data-symbol="'+esc(t.symbol)+'">RECOVER PENDING MINT</button>':'';
  return '<article class="token-card" id="card-'+esc(t.symbol)+'">'+
    '<div class="token-top">'+img+'<div><div class="token-symbol">$'+esc(t.symbol)+'</div><h2>'+esc(t.token_name)+'</h2><div style="font-size:.64rem;color:'+(done?'#72e6b4':'#ae94bb')+'">'+esc(stateLabel(t))+'</div></div></div>'+
    '<p class="token-desc">'+esc(t.description)+'</p>'+
    '<div class="facts"><div><small>Fixed supply</small><b>'+Number(t.fixed_supply).toLocaleString()+'</b></div><div><small>Decimals</small><b>'+esc(t.decimals)+'</b></div><div><small>Genesis signer</small><b>'+short(t.dev_wallet)+'</b></div><div><small>Supply vault</small><b>'+short(t.treasury_vault)+'</b></div></div>'+
    (!done?'<label class="file">Allocated profile image (JPG/PNG/WebP ≤5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" data-file="'+esc(t.symbol)+'"></label>':'')+
    '<div class="actions">'+(!done?'<button class="btn secondary" data-action="upload" data-symbol="'+esc(t.symbol)+'">UPLOAD / REPLACE IMAGE</button>':'')+primary+recovery+'</div>'+
    '<div class="proof">'+
      '<div class="'+(t.image_url?'pass':'wait')+'">'+(t.image_url?'✓':'!')+' Profile image '+(t.image_url?'stored':'required')+'</div>'+
      '<div class="'+(t.mint_address?'pass':'wait')+'">'+(t.mint_address?'✓ Mint '+short(t.mint_address):'! Mint not created')+'</div>'+
      '<div class="'+(t.metadata_tx_signature?'pass':'wait')+'">'+(t.metadata_tx_signature?'✓ Metadata on-chain':'! Metadata pending')+'</div>'+
      '<div class="'+(proof.mintAuthorityRevoked?'pass':'wait')+'">'+(proof.mintAuthorityRevoked?'✓ Mint authority revoked':'! Mint authority finalisation pending')+'</div>'+
      '<div class="'+(proof.freezeAuthorityRevoked?'pass':'wait')+'">'+(proof.freezeAuthorityRevoked?'✓ Freeze authority revoked':'! Freeze authority finalisation pending')+'</div>'+
      '<div class="'+(proof.exactTreasuryBalance?'pass':'wait')+'">'+(proof.exactTreasuryBalance?'✓ 100% fixed supply verified in Squads Treasury':'! Treasury supply proof pending')+'</div>'+
    '</div><div class="status" id="status-'+esc(t.symbol)+'">No action in progress.</div></article>';
}
function render(){
  $('#token-grid').innerHTML=tokens.map(cardHtml).join('');
  $('#token-grid').querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>handleAction(b.dataset.action,b.dataset.symbol)));
}
function token(symbol){const t=tokens.find(x=>x.symbol===symbol);if(!t)throw new Error('Private token config unavailable.');return t;}
function tokenStatus(symbol,text,type=''){
  const el=$('#status-'+symbol);if(!el)return;el.textContent=text;el.className='status'+(type?' '+type:'');
}
async function fileToUpload(file){
  if(!file)throw new Error('Choose the allocated profile image first.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG or WebP.');
  if(file.size>5*1024*1024)throw new Error('Image must be 5 MB or smaller.');
  const bitmap=await createImageBitmap(file);
  const max=768,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image conversion failed')),'image/jpeg',0.9));
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,i+step));
  return {mime:'image/jpeg',data:btoa(binary),size:bytes.length};
}
async function uploadImage(symbol){
  const input=$('[data-file="'+symbol+'"]'),file=input?.files?.[0];
  tokenStatus(symbol,'Preparing profile image…','warn');
  const prepared=await fileToUpload(file);
  tokenStatus(symbol,'Uploading '+Math.round(prepared.size/1024)+' KB image to private Genesis asset pipeline…','warn');
  const out=await api('upload_image',{symbol,mime:prepared.mime,data:prepared.data});
  tokenStatus(symbol,'PROFILE IMAGE READY ✅\n'+out.imageUrl,'good');
  await refreshPrivate();
}
async function signAndSend(tx,signers=[]){
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;tx.feePayer=wallet.publicKey;
  if(signers.length)tx.partialSign(...signers);
  const signed=await wallet.signTransaction(tx);
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error('Simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-8).join('\n'):''));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)throw new Error('Confirmation failed: '+JSON.stringify(conf.value.err));
  return sig;
}
async function mintGenesis(symbol){
  const t=token(symbol);
  if(t.status!=='image_ready')throw new Error('Profile image must be uploaded before minting.');
  if(!wallet||wallet.publicKey?.toString()!==DEV_WALLET)throw new Error('Authorised dev wallet is not connected.');
  const ok=confirm('MAINNET + IRREVERSIBLE\n\nCreate '+t.token_name+' ($'+t.symbol+') with fixed supply '+Number(t.fixed_supply).toLocaleString()+'?\n\n100% of supply will mint directly to the verified Team Zed Squads Treasury vault. Freeze authority is temporary only and both mint + freeze authority will be permanently revoked after metadata.');
  if(!ok)return;
  tokenStatus(symbol,'Building MAINNET genesis transaction…\nNo transaction has been signed yet.','warn');
  const owner=wallet.publicKey,mintKeypair=Keypair.generate(),vault=new PublicKey(privateConfig.treasuryVault);
  const rent=await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const ata=await getAssociatedTokenAddress(mintKeypair.publicKey,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const amount=BigInt(String(t.fixed_supply).split('.')[0])*(10n**BigInt(t.decimals));
  const tx=new Transaction().add(
    SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mintKeypair.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(mintKeypair.publicKey,t.decimals,owner,owner,TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(owner,ata,vault,mintKeypair.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(mintKeypair.publicKey,ata,owner,amount,[],TOKEN_PROGRAM_ID)
  );
  tokenStatus(symbol,'Wallet signature 1/3: CREATE MINT + issue exact fixed supply directly to Team Zed Treasury.\nA simulation runs before broadcast.','warn');
  const sig=await signAndSend(tx,[mintKeypair]);
  const pending={mint_address:mintKeypair.publicKey.toBase58(),treasury_token_account:ata.toBase58(),mint_tx_signature:sig};
  localStorage.setItem('worldz-genesis-pending-'+symbol,JSON.stringify(pending));
  tokenStatus(symbol,'GENESIS MINT ON-CHAIN ✅\nRegistering exact supply + Treasury ownership before metadata…','good');
  await api('register_mint',{symbol,...pending});
  localStorage.removeItem('worldz-genesis-pending-'+symbol);
  await refreshPrivate();
}
async function recoverMint(symbol){
  const raw=localStorage.getItem('worldz-genesis-pending-'+symbol);
  if(!raw)throw new Error('No pending local mint record found.');
  const pending=JSON.parse(raw);
  tokenStatus(symbol,'Recovering and independently verifying pending mainnet mint…','warn');
  await api('register_mint',{symbol,...pending});
  localStorage.removeItem('worldz-genesis-pending-'+symbol);
  await refreshPrivate();
}
async function createMetadata(symbol){
  const t=token(symbol);if(t.status!=='minted'||!t.mint_address)throw new Error('Mint stage is not ready for metadata.');
  tokenStatus(symbol,'Wallet signature 2/3: creating on-chain Metaplex metadata using the allocated profile image…','warn');
  const [{createUmi},{walletAdapterIdentity},{mplTokenMetadata,createV1,TokenStandard},{mplToolbox},{publicKey,percentAmount}]=await Promise.all([
    import('https://esm.sh/@metaplex-foundation/umi-bundle-defaults@1.6.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/umi-signer-wallet-adapters@1.6.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.4.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/mpl-toolbox@0.10.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/umi@1.6.0?bundle')
  ]);
  const umi=createUmi(clusterApiUrl('mainnet-beta')).use(walletAdapterIdentity(wallet)).use(mplTokenMetadata()).use(mplToolbox());
  const uri=privateConfig.metadataBase+encodeURIComponent(t.mint_address);
  const result=await createV1(umi,{
    mint:publicKey(t.mint_address),authority:umi.identity,payer:umi.identity,updateAuthority:umi.identity,
    name:t.token_name,symbol:t.symbol,uri,sellerFeeBasisPoints:percentAmount(0),tokenStandard:TokenStandard.Fungible,isMutable:true
  }).sendAndConfirm(umi,{confirm:{commitment:'confirmed'}});
  const sig=await bs58encode(result.signature);
  await api('register_metadata',{symbol,metadata_tx_signature:sig});
  tokenStatus(symbol,'METADATA ON-CHAIN ✅\nProfile image + mission description attached.\nNext and final signature permanently revokes Mint + Freeze authority.','good');
  await refreshPrivate();
}
async function revokeAuthorities(symbol){
  const t=token(symbol);if(t.status!=='metadata_created'||!t.mint_address)throw new Error('Metadata stage is not ready for final authority revocation.');
  const ok=confirm('FINAL IRREVERSIBLE STEP\n\nPermanently revoke BOTH Mint Authority and Freeze Authority for '+t.token_name+' ($'+t.symbol+')?\n\nAfter this, the fixed supply can NEVER be increased and token accounts cannot be frozen by a mint authority.');
  if(!ok)return;
  const mint=new PublicKey(t.mint_address);
  const tx=new Transaction().add(
    createSetAuthorityInstruction(mint,wallet.publicKey,AuthorityType.MintTokens,null,[],TOKEN_PROGRAM_ID),
    createSetAuthorityInstruction(mint,wallet.publicKey,AuthorityType.FreezeAccount,null,[],TOKEN_PROGRAM_ID)
  );
  tokenStatus(symbol,'Wallet signature 3/3: FINAL authority revocation.\nSimulation must pass before broadcast.','warn');
  const sig=await signAndSend(tx);
  tokenStatus(symbol,'AUTHORITIES REVOKED ON-CHAIN ✅\nRunning independent server verification of supply, Treasury balance, mint authority and freeze authority…','good');
  const out=await api('verify_final',{symbol,authority_revoke_tx_signature:sig});
  tokenStatus(symbol,'GENESIS VERIFIED ✅\nMint: '+out.mint+'\nTreasury token account: '+out.treasuryTokenAccount+'\nMint authority: NONE\nFreeze authority: NONE\nExact fixed supply verified in Team Zed Treasury.','good');
  await refreshPrivate();
}
async function handleAction(action,symbol){
  try{
    const button=document.querySelector('[data-action="'+action+'"][data-symbol="'+symbol+'"]');if(button)button.disabled=true;
    if(action==='upload')await uploadImage(symbol);
    else if(action==='mint')await mintGenesis(symbol);
    else if(action==='recover')await recoverMint(symbol);
    else if(action==='metadata')await createMetadata(symbol);
    else if(action==='revoke')await revokeAuthorities(symbol);
  }catch(e){console.error(e);tokenStatus(symbol,'ACTION FAILED\n'+(e?.message||String(e)),'bad');}
  finally{const b=document.querySelector('[data-action="'+action+'"][data-symbol="'+symbol+'"]');if(b)b.disabled=false;}
}

$('#wallet').addEventListener('click',connect);
$('#auth').addEventListener('click',authenticate);
$('#refresh').addEventListener('click',refreshPrivate);
connect();
