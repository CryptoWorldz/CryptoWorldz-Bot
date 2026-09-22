import {
  Connection,Keypair,SystemProgram,Transaction,PublicKey,clusterApiUrl,LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,MINT_SIZE,AuthorityType,
  createInitializeMintInstruction,createAssociatedTokenAccountInstruction,
  createMintToInstruction,createSetAuthorityInstruction,getAssociatedTokenAddress
} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';
import {createCreateMetadataAccountV3Instruction} from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@2.13.0?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';

const $=s=>document.querySelector(s);
const ENDPOINT='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-genesis-console';
const DEV_WALLET='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const METADATA_PROGRAM=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const WORLDZ_RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(WORLDZ_RPC,'confirmed');

let wallet=null;
let walletName='';
let authSession=null;
let privateConfig=null;
let tokens=[];

const walletRegistry=getWallets();

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
function injectedProvider(){
  return [jupiterInjectedProvider(),window?.phantom?.solana,window?.solflare,window?.solana]
    .filter(Boolean).find(usableInjectedProvider)||null;
}
function walletStandardCandidates(){
  return walletRegistry.get().filter(w=>
    w.chains?.some(c=>String(c).startsWith('solana:')) &&
    w.features?.['standard:connect'] &&
    w.features?.['solana:signMessage'] &&
    w.features?.['solana:signTransaction']
  ).sort((a,b)=>Number(!/jupiter/i.test(String(a.name||'')))-Number(!/jupiter/i.test(String(b.name||''))));
}
function walletStandardAdapter(ws,account){
  const publicKey=new PublicKey(account.address);
  const encodeTx=tx=>new Uint8Array(tx.serialize({requireAllSignatures:false,verifySignatures:false}));
  const decodeSigned=out=>{
    const bytes=out?.signedTransaction;
    if(!bytes)throw new Error('Wallet returned no signed transaction.');
    return Transaction.from(bytes);
  };
  return {
    publicKey,
    connected:true,
    connecting:false,
    name:ws.name||'Solana Wallet',
    connect:async()=>({publicKey}),
    disconnect:async()=>{try{await ws.features?.['standard:disconnect']?.disconnect?.();}catch{}},
    signMessage:async message=>{
      const out=await ws.features['solana:signMessage'].signMessage({account,message});
      const signed=out?.[0];
      if(!signed?.signature)throw new Error('Wallet returned no message signature.');
      return {signature:signed.signature,publicKey};
    },
    signTransaction:async tx=>{
      const out=await ws.features['solana:signTransaction'].signTransaction({
        account,transaction:encodeTx(tx)
      });
      return decodeSigned(out?.[0]);
    },
    signAllTransactions:async txs=>{
      const inputs=txs.map(tx=>({
        account,transaction:encodeTx(tx)
      }));
      const out=await ws.features['solana:signTransaction'].signTransaction(...inputs);
      if(!out||out.length!==txs.length)throw new Error('Wallet returned an incomplete transaction batch.');
      return out.map(decodeSigned);
    }
  };
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
  wallet=null;walletName='';
  const failures=[];
  setStatus('CONNECTING TO JUPITER…\nNo blockchain transaction is being sent.','warn');

  const accept=async(candidate,name)=>{
    if(!candidate||!candidate.publicKey)throw new Error(name+' returned no public key.');
    const address=candidate.publicKey.toString();
    if(address!==DEV_WALLET){
      try{await candidate.disconnect?.();}catch{}
      throw new Error(name+' connected the wrong wallet: '+address);
    }
    wallet=candidate;walletName=name;
    $('#wallet').textContent=short(address);$('#wallet').classList.add('connected');
    $('#auth').disabled=false;
    setStatus('JUPITER CONNECTED ✅\n'+address+'\n\nNow tap Authenticate Genesis Console. No transaction has been sent.','good');
    return true;
  };

  // 1) Jupiter Wallet Standard — same direct path that already connected in WorldzMINT.
  for(const ws of walletStandardCandidates()){
    try{
      const out=await ws.features['standard:connect'].connect();
      const account=(out?.accounts||ws.accounts||[])[0];
      if(!account)throw new Error('no Solana account');
      await accept(walletStandardAdapter(ws,account),ws.name||'Jupiter Wallet');
      return true;
    }catch(e){failures.push((ws.name||'Wallet Standard')+': '+(e?.message||String(e)));}
  }

  // 2) Jupiter's in-app injected provider.
  try{
    const jup=jupiterInjectedProvider();
    if(jup){
      const out=await jup.connect();
      const pk=(out&&out.publicKey)||jup.publicKey;
      if(!pk)throw new Error('no public key');
      jup.publicKey=pk;
      await accept(jup,'Jupiter In-App Wallet');
      return true;
    }
  }catch(e){failures.push('Jupiter In-App: '+(e?.message||String(e)));}

  // 3) Official Jupiter Mobile/Reown adapter used by WorldzMINT.
  try{
    const mod=await import('/mint/jupiter-mobile.js?v=20260922-genesis-reown-v2');
    mod.resetJupiterMobileConnectionState?.();
    const adapter=await mod.getJupiterMobileAdapter();
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('connection timed out')),25000));
    await Promise.race([adapter.connect(),timeout]);
    await accept(adapter,'Jupiter Mobile');
    return true;
  }catch(e){failures.push('Jupiter Mobile: '+(e?.message||String(e)));}

  // 4) Phantom/Solflare remain fallback only.
  try{
    const injected=injectedProvider();
    if(injected){
      const out=await injected.connect();
      const pk=(out&&out.publicKey)||injected.publicKey;
      if(!pk)throw new Error('no public key');
      injected.publicKey=pk;
      await accept(injected,injected.isPhantom?'Phantom':(injected.isSolflare?'Solflare':'Injected Solana Wallet'));
      return true;
    }
  }catch(e){failures.push('Fallback wallet: '+(e?.message||String(e)));}

  setStatus('JUPITER CONNECTION FAILED\n'+failures.join('\n')+'\n\nNo transaction was sent.','bad');
  return false;
}
async function authenticate(){
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  if(typeof wallet.signMessage!=='function')return setStatus('This wallet does not expose Solana message signing. Use Jupiter Wallet, Phantom or Solflare with signing support.','bad');
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
    setTimeout(()=>$('#private-area')?.scrollIntoView({behavior:'smooth',block:'start'}),150);
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
    await checkLaunchProposal();
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
  const external=t.launch_order===1?'<button class="btn secondary" data-action="copy-pack" data-symbol="'+esc(t.symbol)+'">COPY JUPITER LAUNCH PACK</button><a class="btn secondary" href="https://studio.jup.ag/launch" target="_blank" rel="noopener">OPEN JUPITER STUDIO ↗</a>':'';
  return '<article class="token-card" id="card-'+esc(t.symbol)+'">'+
    '<div class="token-top">'+img+'<div><div class="token-symbol">$'+esc(t.symbol)+'</div><h2>'+esc(t.token_name)+'</h2><div style="font-size:.64rem;color:'+(done?'#72e6b4':'#ae94bb')+'">'+esc(stateLabel(t))+'</div></div></div>'+
    '<p class="token-desc">'+esc(t.description)+'</p>'+
    '<div class="facts"><div><small>Fixed supply</small><b>'+Number(t.fixed_supply).toLocaleString()+'</b></div><div><small>Decimals</small><b>'+esc(t.decimals)+'</b></div><div><small>Genesis signer</small><b>'+short(t.dev_wallet)+'</b></div><div><small>Supply vault</small><b>'+short(t.treasury_vault)+'</b></div></div>'+
    (!done?'<label class="file">Allocated profile image (JPG/PNG/WebP ≤5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" data-file="'+esc(t.symbol)+'"></label>':'')+
    '<div class="actions">'+(!done?'<button class="btn secondary" data-action="upload" data-symbol="'+esc(t.symbol)+'">UPLOAD / REPLACE IMAGE</button>':'')+primary+recovery+external+'</div>'+
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
function bytesToBase64(bytes){
  let binary='';const step=0x8000;
  for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,i+step));
  return btoa(binary);
}
function base64ToBytes(s){
  const raw=atob(String(s||''));
  const out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function launchProposalStatus(text,type=''){
  const el=$('#launch-proposal-status');if(!el)return;
  el.textContent=text;el.className='status'+(type?' '+type:'');
}
async function checkLaunchProposal(){
  if(!authSession)return;
  try{
    const out=await api('launch_proposal_payload');
    if(out.fundingReady){
      launchProposalStatus(
        'PROPOSAL PAYLOAD VERIFIED ✅\nTreasury: '+Number(out.vaultSol).toFixed(6)+' SOL\nProposal: '+short(out.proposalAddress)+'\nPayload: '+out.byteLength+' bytes\n2-of-3 approvals remain required.',
        'good'
      );
    }else{
      launchProposalStatus(
        'TREASURY FUNDING REQUIRED\nCurrent: '+Number(out.vaultSol).toFixed(6)+' SOL\nMinimum proven total: '+Number(out.minimumVaultSol).toFixed(4)+' SOL\nRecommended top-up now: '+Number(out.recommendedTopupSol).toFixed(4)+' SOL\nVault: '+out.treasuryVault,
        'warn'
      );
    }
    return out;
  }catch(e){
    const msg=e?.message||String(e);
    if(msg.includes('launch_proposal_already_exists')){
      launchProposalStatus('SQUADS PROPOSAL ALREADY EXISTS ✅\nOpen Squads for the remaining approvals.','good');
      return null;
    }
    launchProposalStatus('Proposal check failed: '+msg,'bad');
    return null;
  }
}
async function createLaunchProposal(){
  if(!wallet||wallet.publicKey?.toString()!==DEV_WALLET)throw new Error('Authorised dev wallet is not connected.');
  const out=await api('launch_proposal_payload');
  if(!out.fundingReady){
    launchProposalStatus(
      'TREASURY FUNDING REQUIRED BEFORE PROPOSAL CREATION\nRecommended top-up: '+Number(out.recommendedTopupSol).toFixed(4)+' SOL\nVault: '+out.treasuryVault,
      'warn'
    );
    return;
  }
  const ok=confirm('CREATE SQUADS PROPOSAL\n\nThis signs and creates the governance proposal only. It does NOT execute the launch. The existing 2-of-3 Squads approval threshold remains required.');
  if(!ok)return;
  const tx=Transaction.from(base64ToBytes(out.wire));
  tx.lastValidBlockHeight=out.lastValidBlockHeight;
  launchProposalStatus('Wallet approval: CREATE SQUADS PROPOSAL\nNo launch execution occurs in this transaction.','warn');
  const signed=await wallet.signTransaction(tx);
  const sent=await api('broadcast_transaction',{wire:bytesToBase64(signed.serialize())});
  launchProposalStatus(
    'SQUADS PROPOSAL CREATED ON-CHAIN ✅\nProposal: '+out.proposalAddress+'\nTransaction: '+sent.signature+'\nNext gate: 2-of-3 Squads approvals.',
    'good'
  );
}
async function chainContext(){return api('chain_context');}
async function signAndSend(tx,signers=[],ctx=null){
  const latest=ctx||await chainContext();
  tx.recentBlockhash=latest.blockhash;
  tx.lastValidBlockHeight=latest.lastValidBlockHeight;
  tx.feePayer=wallet.publicKey;
  if(signers.length)tx.partialSign(...signers);
  const signed=await wallet.signTransaction(tx);
  const wire=signed.serialize();
  const out=await api('broadcast_transaction',{wire:bytesToBase64(wire)});
  if(!out?.signature)throw new Error('Backend returned no transaction signature.');
  return out.signature;
}
async function mintGenesis(symbol){
  const t=token(symbol);
  if(t.status!=='image_ready')throw new Error('Profile image must be uploaded before minting.');
  if(!wallet||wallet.publicKey?.toString()!==DEV_WALLET)throw new Error('Authorised dev wallet is not connected.');
  const ok=confirm('MAINNET + IRREVERSIBLE\n\nCreate '+t.token_name+' ($'+t.symbol+') with fixed supply '+Number(t.fixed_supply).toLocaleString()+'?\n\n100% of supply will mint directly to the verified Team Zed Squads Treasury vault. Freeze authority is temporary only and both mint + freeze authority will be permanently revoked after metadata.');
  if(!ok)return;
  tokenStatus(symbol,'Building MAINNET genesis transaction…\nNo transaction has been signed yet.','warn');
  const owner=wallet.publicKey,mintKeypair=Keypair.generate(),vault=new PublicKey(privateConfig.treasuryVault);
  const ctx=await chainContext();
  const rent=Number(ctx.mintRent);
  if(!Number.isFinite(rent)||rent<=0)throw new Error('Backend did not return valid mint rent.');
  const ata=await getAssociatedTokenAddress(mintKeypair.publicKey,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const amount=BigInt(String(t.fixed_supply).split('.')[0])*(10n**BigInt(t.decimals));
  const tx=new Transaction().add(
    SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mintKeypair.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(mintKeypair.publicKey,t.decimals,owner,owner,TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(owner,ata,vault,mintKeypair.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(mintKeypair.publicKey,ata,owner,amount,[],TOKEN_PROGRAM_ID)
  );
  tokenStatus(symbol,'Wallet signature 1/3: CREATE MINT + issue exact fixed supply directly to Team Zed Treasury.\nSolana RPC preflight checks the exact signed transaction before broadcast.','warn');
  const sig=await signAndSend(tx,[mintKeypair],ctx);
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
  const mint=new PublicKey(t.mint_address),owner=wallet.publicKey;
  const [metadata]=PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('metadata'),METADATA_PROGRAM.toBytes(),mint.toBytes()],
    METADATA_PROGRAM
  );
  const uri=privateConfig.metadataBase+encodeURIComponent(t.mint_address);
  const metadataIx=createCreateMetadataAccountV3Instruction({
    metadata,mint,mintAuthority:owner,payer:owner,updateAuthority:owner
  },{
    createMetadataAccountArgsV3:{
      data:{name:t.token_name,symbol:t.symbol,uri,sellerFeeBasisPoints:0,creators:null,collection:null,uses:null},
      isMutable:true,collectionDetails:null
    }
  },METADATA_PROGRAM);
  const tx=new Transaction().add(metadataIx);
  tokenStatus(symbol,'Wallet signature 2/3: CREATE VERIFIED METADATA\nSolana RPC preflight checks the exact signed transaction before broadcast.','warn');
  const sig=await signAndSend(tx);
  await api('register_metadata',{symbol,metadata_tx_signature:sig});
  tokenStatus(symbol,'METADATA VERIFIED ON-CHAIN ✅\nMetadata account exists and transaction confirmation is recorded.\nNext: permanently revoke Mint + Freeze authority.','good');
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
  tokenStatus(symbol,'Wallet signature 3/3: FINAL authority revocation.\nSolana RPC preflight checks the exact signed transaction before broadcast.','warn');
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
    else if(action==='copy-pack'){
      const t=token(symbol);
      const pack=['Name: '+t.token_name,'Symbol: '+t.symbol,'Fixed supply target: '+Number(t.fixed_supply).toLocaleString(),'Decimals target: '+t.decimals,'Creator / dev wallet: '+t.dev_wallet,'Treasury vault: '+t.treasury_vault,'Description: '+t.description,'Image: use the allocated profile image shown on this card','IMPORTANT: before signing in Jupiter Studio, confirm its preview exactly matches the intended fixed supply and authority settings.'].join('\n');
      await navigator.clipboard.writeText(pack);
      tokenStatus(symbol,'JUPITER LAUNCH PACK COPIED ✅\nOpen Jupiter Studio inside Jupiter Wallet and verify every field before signing.','good');
    }
  }catch(e){console.error(e);tokenStatus(symbol,'ACTION FAILED\n'+(e?.message||String(e)),'bad');}
  finally{const b=document.querySelector('[data-action="'+action+'"][data-symbol="'+symbol+'"]');if(b)b.disabled=false;}
}

$('#wallet').addEventListener('click',connect);
$('#auth').addEventListener('click',authenticate);
$('#refresh').addEventListener('click',refreshPrivate);
$('#launch-proposal').addEventListener('click',async()=>{
  const b=$('#launch-proposal');if(b)b.disabled=true;
  try{await createLaunchProposal();}catch(e){launchProposalStatus('Proposal action failed: '+(e?.message||String(e)),'bad');}
  finally{if(b)b.disabled=false;}
});
walletRegistry.on('register',()=>{
  if(!wallet){
    const names=walletStandardCandidates().map(w=>w.name).filter(Boolean);
    setStatus((names.length?names.join(', ')+' detected ✅':'Solana wallet detected ✅')+'\nTap Connect Dev Wallet — connection + Genesis authentication will run in one flow.','good');
  }
});
setStatus('READY ✅\nTap Connect Dev Wallet. Jupiter Mobile, Jupiter in-app, Phantom and Solflare are supported.','good');
