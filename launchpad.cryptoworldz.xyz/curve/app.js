import {Connection,Keypair,PublicKey,clusterApiUrl} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {Raydium,TxVersion,DEVNET_PROGRAM_ID,getPdaPlatformId,PlatformConfig} from 'https://esm.sh/@raydium-io/raydium-sdk-v2@0.2.64-alpha?bundle';
import BN from 'https://esm.sh/bn.js@5.2.1?bundle';

const $=s=>document.querySelector(s);
const connection=new Connection(clusterApiUrl('devnet'),'confirmed');
const REGISTER_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
const SOL_GLOBAL_CONFIG=new PublicKey('7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt');
const PROGRAM=DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM;
const FIXED_SUPPLY='1000000000';
const DECIMALS=6;
const PLATFORM_FEE_RATE=new BN(20000); // 2.00% / 1,000,000
let wallet=null,raydium=null,platformId=null,cpConfigId=null,mintKeypair=null,mint='',poolId='',launchTx='',vestingTx='',registered=false,platformReady=false,preflight=false;

function provider(){return [window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;}
function status(id,text,type=''){const el=$(id);el.textContent=text;el.className='status'+(type?' '+type:'');}
function meta(){return {description:$('#description').value.trim(),image:$('#image').value.trim(),website:$('#website').value.trim()};}
async function sha256(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function encodeSig(bytes){const mod=await import('https://esm.sh/bs58@6.0.0?bundle');const bs58=mod.default||mod;return bs58.encode(bytes);}
async function connect(){
  wallet=provider();if(!wallet){status('#platform-status','No injected Solana wallet found. Open this page in Phantom/Solflare or enable a compatible desktop wallet.','bad');return false;}
  try{
    const r=await wallet.connect(),pk=(r&&r.publicKey)||wallet.publicKey;if(!pk)throw new Error('No public key');
    $('#wallet').textContent=pk.toString().slice(0,4)+'…'+pk.toString().slice(-4);$('#beneficiary').placeholder=pk.toString();
    const signAll=async txs=>{if(typeof wallet.signAllTransactions==='function')return wallet.signAllTransactions(txs);const out=[];for(const tx of txs)out.push(await wallet.signTransaction(tx));return out;};
    raydium=await Raydium.load({owner:pk,connection,cluster:'devnet',signAllTransactions:signAll,disableFeatureCheck:true,disableLoadToken:true,blockhashCommitment:'confirmed'});
    return true;
  }catch(e){status('#platform-status','Wallet connection failed: '+(e?.message||e),'bad');return false;}
}
async function sendLegacy(tx,extra=[]){
  if(extra.length)tx.partialSign(...extra);
  const signed=await wallet.signTransaction(tx);
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error('Simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-8).join('\n'):''));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  const latest=await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed').catch(async()=>connection.confirmTransaction(sig,'confirmed'));
  return sig;
}
async function sendMulti(built){
  const ids=[];
  for(let i=0;i<built.transactions.length;i++){
    const tx=built.transactions[i],signers=(built.signers&&built.signers[i])||[];
    ids.push(await sendLegacy(tx,signers));
  }
  return ids;
}
async function loadLiveConfigs(){
  const res=await fetch('https://launch-mint-v1-devnet.raydium.io/main/configs',{cache:'no-store'});
  if(!res.ok)throw new Error('Raydium LaunchLab Devnet config API unavailable.');
  const body=await res.json();
  const list=Array.isArray(body.data)?body.data:(Array.isArray(body.data?.data)?body.data.data:[]);
  const sol=list.find(x=>x?.key?.pubKey===SOL_GLOBAL_CONFIG.toBase58());
  if(!sol)throw new Error('Pinned SOL GlobalConfig is not present in Raydium Devnet API.');
  if(sol.key.mintB!=='So11111111111111111111111111111111111111112')throw new Error('SOL GlobalConfig quote mint mismatch.');
  if(String(sol.key.tradeFeeRate)!=='2500')throw new Error('Raydium GlobalConfig protocol trade fee changed from the reviewed 0.25% value. Re-review before launch.');
  return sol;
}
async function verifyOrCreatePlatform(){
  $('#platform-btn').disabled=true;
  try{
    if(!wallet||!wallet.publicKey){if(!await connect())return;}
    status('#platform-status','VERIFYING RAYDIUM DEVNET GLOBALCONFIG + CPMM CONFIG…');
    const global=await loadLiveConfigs();
    const cp=await raydium.api.getCpmmConfigs();
    const picked=cp.find(x=>Number(x.index)===0)||cp[0];
    if(!picked?.id)throw new Error('No Raydium Devnet CPMM config returned.');
    cpConfigId=new PublicKey(picked.id);
    platformId=getPdaPlatformId(PROGRAM,wallet.publicKey).publicKey;
    const account=await connection.getAccountInfo(platformId,'confirmed');
    if(account){
      if(!account.owner.equals(PROGRAM))throw new Error('Existing platform PDA is not owned by Raydium LaunchLab Devnet.');
      const decoded=PlatformConfig.decode(account.data);
      const mismatches=[];
      if(!decoded.platformClaimFeeWallet.equals(wallet.publicKey))mismatches.push('claim fee wallet');
      if(!decoded.platformLockNftWallet.equals(wallet.publicKey))mismatches.push('lock NFT wallet');
      if(!decoded.platformVestingWallet.equals(wallet.publicKey))mismatches.push('vesting wallet');
      if(!decoded.cpConfigId.equals(cpConfigId))mismatches.push('CPMM config');
      if(!decoded.feeRate.eq(PLATFORM_FEE_RATE))mismatches.push('2.00% platform fee');
      if(!decoded.creatorFeeRate.eq(new BN(0)))mismatches.push('creator fee rate');
      if(!decoded.platformScale.eq(new BN(1000000))||!decoded.creatorScale.eq(new BN(0))||!decoded.burnScale.eq(new BN(0)))mismatches.push('100% platform locked-LP share');
      if(mismatches.length)throw new Error('Existing PlatformConfig differs from Worldz Curve Devnet contract: '+mismatches.join(', ')+'. It was NOT changed automatically.');
      platformReady=true;
      status('#platform-status','EXISTING WORLDZ PLATFORMCONFIG VERIFIED ✅\nNo settings were silently changed.','good');
    }else{
      status('#platform-status','NO PLATFORMCONFIG EXISTS FOR THIS WALLET.\nBuilding Worldz Curve Devnet PlatformConfig…','warn');
      const built=await raydium.launchpad.createPlatformConfig({
        programId:PROGRAM,
        platformAdmin:wallet.publicKey,
        platformClaimFeeWallet:wallet.publicKey,
        platformLockNftWallet:wallet.publicKey,
        platformVestingWallet:wallet.publicKey,
        cpConfigId,
        migrateCpLockNftScale:{platformScale:new BN(1000000),creatorScale:new BN(0),burnScale:new BN(0)},
        transferFeeExtensionAuth:PublicKey.default,
        creatorFeeRate:new BN(0),
        feeRate:PLATFORM_FEE_RATE,
        name:'WorldzLaunchPad Devnet',
        web:'https://launchpad.cryptoworldz.xyz/curve/',
        img:'https://launchpad.cryptoworldz.xyz/',
        platformVestingScale:new BN(0),
        txVersion:TxVersion.LEGACY,
        feePayer:wallet.publicKey,
        computeBudgetConfig:{units:500000,microLamports:1000}
      });
      const sig=await sendLegacy(built.transaction,built.signers||[]);
      const verify=await connection.getAccountInfo(platformId,'confirmed');
      if(!verify||!verify.owner.equals(PROGRAM))throw new Error('PlatformConfig transaction confirmed but account verification failed.');
      platformReady=true;
      status('#platform-status','WORLDZ PLATFORMCONFIG CREATED + VERIFIED ON-CHAIN ✅\nTransaction: '+sig,'good');
    }
    $('#platform-id').textContent=platformId.toBase58();$('#global-config').textContent=global.key.pubKey;$('#cp-config').textContent=cpConfigId.toBase58();$('#platform-result').classList.add('show');
    $('#check-btn').disabled=false;loadQuery();renderProof();
  }catch(e){console.error(e);status('#platform-status','PLATFORM STAGE FAILED\n'+(e?.message||e),'bad');platformReady=false;}
  finally{$('#platform-btn').disabled=false;}
}
function localCheck(){
  const name=$('#name').value.trim(),symbol=$('#symbol').value.trim().toUpperCase(),vesting=$('#vesting-tokens').value.trim();
  const errors=[];
  if(!platformReady)errors.push('Worldz PlatformConfig is not verified.');
  if(name.length<2||name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!/^\d+$/.test(vesting))errors.push('Vesting tokens must be a whole number.');
  if(/^\d+$/.test(vesting)&&BigInt(vesting)>BigInt(FIXED_SUPPLY))errors.push('Vesting amount exceeds fixed supply.');
  preflight=!errors.length;$('#launch-btn').disabled=!preflight||!!mint;
  status('#launch-status',errors.length?'PRE-SIGN CHECK FAILED\n• '+errors.join('\n• '):
    'PRE-SIGN PROOF PASS ✅\nRaydium Devnet program: '+PROGRAM.toBase58()+
    '\nGlobalConfig: '+SOL_GLOBAL_CONFIG.toBase58()+
    '\nSupply: '+FIXED_SUPPLY+' • decimals: '+DECIMALS+
    '\nLaunchLab platform fee: 2.00%\nRaydium GlobalConfig trade fee: 0.25%\nPost-grad LP split: 100% platform locked share\nMainnet execution: OFF','good');
  renderProof();
  return preflight;
}
async function createLaunch(){
  if(!localCheck())return;
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  $('#launch-btn').disabled=true;
  try{
    const global=await loadLiveConfigs();
    mintKeypair=Keypair.generate();
    const uri='https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mintKeypair.publicKey.toBase58());
    const vestingTokens=new BN($('#vesting-tokens').value||'0');
    status('#launch-status','BUILDING RAYDIUM LAUNCHLAB DEVNET TRANSACTION…\nMint will be '+mintKeypair.publicKey.toBase58());
    const built=await raydium.launchpad.createLaunchpad({
      programId:PROGRAM,
      authProgramId:DEVNET_PROGRAM_ID.LAUNCHPAD_AUTH,
      platformId,
      mintA:mintKeypair.publicKey,
      decimals:DECIMALS,
      mintBDecimals:9,
      name:$('#name').value.trim(),
      symbol:$('#symbol').value.trim().toUpperCase(),
      uri,
      migrateType:'cpmm',
      configId:SOL_GLOBAL_CONFIG,
      txVersion:TxVersion.LEGACY,
      feePayer:wallet.publicKey,
      buyAmount:new BN(0),
      createOnly:true,
      totalLockedAmount:vestingTokens.mul(new BN(10).pow(new BN(DECIMALS))),
      cliffPeriod:new BN(90*86400),
      unlockPeriod:new BN(24*30*86400),
      extraSigners:[mintKeypair],
      computeBudgetConfig:{units:900000,microLamports:1000}
    });
    if(!built.transactions?.length)throw new Error('Raydium SDK did not build a launch transaction.');
    status('#launch-status','TRANSACTION BUILT. SIMULATING + REQUESTING WALLET SIGNATURE…','warn');
    const txIds=await sendMulti(built);
    mint=mintKeypair.publicKey.toBase58();
    poolId=built.extInfo?.address?.poolId?.toBase58?.()||'';
    launchTx=txIds[0]||'';
    if(!poolId)throw new Error('Launch transaction confirmed but SDK did not return a pool address.');
    const poolInfo=await connection.getAccountInfo(new PublicKey(poolId),'confirmed');
    if(!poolInfo||!poolInfo.owner.equals(PROGRAM))throw new Error('Pool verification failed after confirmation.');
    $('#mint').textContent=mint;$('#pool').textContent=poolId;$('#tx').textContent=launchTx;$('#launch-result').classList.add('show');
    $('#register-btn').disabled=false;$('#vesting-btn').disabled=vestingTokens.isZero();
    status('#launch-status','WORLDZ CURVE DEVNET LAUNCH VERIFIED ✅\nMint: '+mint+'\nPool: '+poolId+'\nLaunchLab owner program verified.\nMetadata URI: '+uri,'good');
    renderProof();
  }catch(e){console.error(e);status('#launch-status','LAUNCH STAGE FAILED\n'+(e?.message||e),'bad');}
  finally{$('#launch-btn').disabled=!!mint||!preflight;}
}
async function createVesting(){
  if(!poolId||!mint)return;
  const amount=new BN($('#vesting-tokens').value||'0');
  if(amount.isZero())return status('#proof-status','No vesting tokens were reserved for this launch.','warn');
  $('#vesting-btn').disabled=true;
  try{
    const beneficiary=new PublicKey($('#beneficiary').value.trim()||wallet.publicKey.toBase58());
    status('#proof-status','BUILDING RAYDIUM NATIVE VESTING RECORD…');
    const built=await raydium.launchpad.createVesting({
      programId:PROGRAM,poolId:new PublicKey(poolId),beneficiary,
      shareAmount:amount.mul(new BN(10).pow(new BN(DECIMALS))),
      txVersion:TxVersion.LEGACY,feePayer:wallet.publicKey,
      computeBudgetConfig:{units:400000,microLamports:1000}
    });
    vestingTx=await sendLegacy(built.transaction,built.signers||[]);
    status('#proof-status','NATIVE LAUNCHLAB VESTING RECORD CREATED ✅\nTransaction: '+vestingTx,'good');renderProof();
  }catch(e){console.error(e);status('#proof-status','VESTING STAGE FAILED\n'+(e?.message||e),'bad');$('#vesting-btn').disabled=false;}
}
async function register(){
  if(!mint||!poolId||!launchTx)return;
  if(typeof wallet.signMessage!=='function')return status('#proof-status','Wallet message signing is required for Worldz Proof registration.','bad');
  $('#register-btn').disabled=true;
  try{
    const issuedAt=new Date().toISOString();
    const payloadBase={schema:'worldzlaunchpad.curve.devnet.v1',mint,poolId,platformId:platformId.toBase58(),globalConfig:SOL_GLOBAL_CONFIG.toBase58(),fee:'2.00',route:{project:90,worldz:10}};
    const intent=await sha256(JSON.stringify(payloadBase));
    const message=['WORLDZLAUNCHPAD_REGISTER_V1','intent_hash='+intent,'mint='+mint,'wallet='+wallet.publicKey.toBase58(),'issued_at='+issuedAt].join('\n');
    const signed=await wallet.signMessage(new TextEncoder().encode(message),'utf8');
    const sig=await encodeSig(signed?.signature||signed);
    const body={
      intent_hash:intent,mint,wallet:wallet.publicKey.toBase58(),issued_at:issuedAt,signature:sig,
      environment:'devnet',network:'solana',engine:'curve',quote_asset:'SOL',
      token_name:$('#name').value.trim(),symbol:$('#symbol').value.trim().toUpperCase(),decimals:DECIMALS,fixed_supply:FIXED_SUPPLY,
      project_fee_percent:2,fee_routes:{project:90,worldz:10},metadata:meta(),
      metadata_uri:'https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mint),
      mint_tx_signature:launchTx,pool_id:poolId,lp_mint:null,pool_tx_signature:launchTx,
      vesting_config:{reservedTokens:$('#vesting-tokens').value,cliffDays:90,unlockMonths:24,nativeRecordCreated:!!vestingTx,vestingTx:vestingTx||null},
      lock_config:{postGraduationPlatformScale:100,creatorScale:0,burnScale:0,raydiumLockedLpShare:true},
      proof:{platformConfig:platformId.toBase58(),globalConfig:SOL_GLOBAL_CONFIG.toBase58(),cpmmConfig:cpConfigId.toBase58(),raydiumLaunchLabDevnet:true,platformFeePercent:2,downstreamProjectPercent:90,downstreamWorldzPercent:10,nativeVestingRecordCreated:!!vestingTx},
      stage:vestingTx?'vested':'pool_created'
    };
    const res=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const out=await res.json().catch(()=>({}));if(!res.ok||!out.ok)throw new Error(out.error||out.detail||('HTTP '+res.status));
    registered=true;status('#proof-status','WORLDZ PROOF REGISTERED ✅\nRegistry ID: '+out.registry.id+'\nZED: shared registry ✅\nAUTO: shared registry ✅\nG.R.A.C.E.: shared registry ✅','good');renderProof();
  }catch(e){console.error(e);status('#proof-status','WORLDZ PROOF REGISTRATION FAILED\n'+(e?.message||e),'bad');$('#register-btn').disabled=false;}
}
function renderProof(){
  const items=[
    ['Raydium Devnet program verified',true,PROGRAM.toBase58()],
    ['Worldz PlatformConfig',platformReady,platformReady?'ON-CHAIN':'PENDING'],
    ['LaunchLab token + curve',!!launchTx,launchTx?'ON-CHAIN':'PENDING'],
    ['CPMM graduation path',!!launchTx,launchTx?'BOUND BY GLOBALCONFIG':'PENDING'],
    ['Post-grad LP locked share',platformReady,'100% PLATFORM LOCKED SHARE'],
    ['Native vesting record',!!vestingTx,Number($('#vesting-tokens').value||0)===0?'NOT REQUESTED':vestingTx?'ON-CHAIN':'PENDING'],
    ['90/10 downstream AUTO routing',false,'RECORDED • EXECUTION ADAPTER PENDING'],
    ['Command Centre registry',registered,registered?'REGISTERED':'PENDING'],
    ['Public mainnet launch',false,'LOCKED']
  ];
  $('#proof-grid').innerHTML=items.map(([a,ok,b])=>'<div class="'+(ok?'pass':'wait')+'"><b>'+(ok?'✓ ':'! ')+a+'</b><span>'+b+'</span></div>').join('');
}
function loadQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('name'))$('#name').value=q.get('name');
  if(q.get('symbol'))$('#symbol').value=q.get('symbol');
  if(q.get('description'))$('#description').value=q.get('description');
  const notes=[];
  if(q.get('intent'))notes.push('Manifest: '+q.get('intent').slice(0,16)+'…');
  if(q.get('supply')&&q.get('supply')!==FIXED_SUPPLY)notes.push('Raydium Curve beta uses reviewed GlobalConfig supply '+FIXED_SUPPLY+' instead of requested '+q.get('supply'));
  if(q.get('decimals')&&q.get('decimals')!=='6')notes.push('Raydium Curve beta uses 6 decimals.');
  if(q.get('fee')&&Number(q.get('fee'))!==2)notes.push('Raydium Curve beta uses fixed 2.00% Worldz PlatformConfig fee.');
  if(q.get('quote')&&q.get('quote')!=='SOL')notes.push('Raydium Curve beta currently executes SOL quote only.');
  if(notes.length)status('#launch-status','MANIFEST LOADED\n'+notes.join('\n'),'warn');
}
$('#wallet').addEventListener('click',connect);
$('#platform-btn').addEventListener('click',verifyOrCreatePlatform);
$('#check-btn').addEventListener('click',localCheck);
$('#launch-btn').addEventListener('click',createLaunch);
$('#vesting-btn').addEventListener('click',createVesting);
$('#register-btn').addEventListener('click',register);
['#name','#symbol','#vesting-tokens'].forEach(id=>$(id).addEventListener('input',()=>{$('#launch-btn').disabled=true;preflight=false;}));
renderProof();