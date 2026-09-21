import {Connection,Keypair,PublicKey,clusterApiUrl} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {NATIVE_MINT} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {
  DynamicBondingCurveClient,deriveDbcPoolAddress,buildCurve,
  TokenType,TokenDecimal,TokenAuthorityOption,BaseFeeMode,CollectFeeMode,
  MigrationOption,MigrationFeeOption,MigratedCollectFeeMode,DammV2DynamicFeeMode,
  DammV2BaseFeeMode,ActivationType
} from 'https://esm.sh/@meteora-ag/dynamic-bonding-curve-sdk@1.5.12?bundle';

const $=s=>document.querySelector(s);
const connection=new Connection(clusterApiUrl('mainnet-beta'),'confirmed');
const DBC_PROGRAM=new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');
const REGISTER_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
let wallet=null,client=null,platform=null,treasuryVault=null,serverGate=false,curveConfig=null,preflight=false,baseMint=null,configKey=null,poolId='',launchTx='',registered=false;

function walletStandardCandidate(){
  try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.features?.['solana:signMessage']&&w.chains?.includes('solana:mainnet')).sort((a,b)=>Number(!/jupiter/i.test(a.name))-Number(!/jupiter/i.test(b.name)))[0]||null;}catch{return null}
}
function legacyProvider(){return [window.jupiter&&window.jupiter.solana,window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function'&&typeof p.signMessage==='function')||null;}
async function connectProvider(){
  const standard=walletStandardCandidate();
  if(standard){
    const out=await standard.features['standard:connect'].connect();
    const account=(out?.accounts||standard.accounts||[])[0];if(!account)throw new Error('Wallet returned no Solana account.');
    return {
      name:standard.name,publicKey:new PublicKey(account.address),
      async signTransaction(tx){
        const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false});
        const out=await standard.features['solana:signTransaction'].signTransaction({transaction:new Uint8Array(wire),account,chain:'solana:mainnet'});
        const bytes=out?.[0]?.signedTransaction;if(!bytes)throw new Error('Wallet returned no signed transaction.');return (await import('https://esm.sh/@solana/web3.js@1.98.4?bundle')).Transaction.from(bytes);
      },
      async signMessage(bytes){const out=await standard.features['solana:signMessage'].signMessage({message:bytes,account});const sig=out?.[0]?.signature;if(!sig)throw new Error('Wallet returned no message signature.');return {signature:new Uint8Array(sig)};}
    };
  }
  const p=legacyProvider();
  if(p){
    const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;if(!pk)throw new Error('Wallet returned no public key.');
    return {name:'Injected Solana Wallet',publicKey:pk,signTransaction:tx=>p.signTransaction(tx),signMessage:(bytes)=>p.signMessage(bytes,'utf8')};
  }
  const mod=await import('/mint/jupiter-mobile.js?v=20260921-reown-v1');
  const adapter=await mod.getJupiterMobileAdapter();
  await adapter.connect();
  if(!adapter.publicKey)throw new Error('Jupiter Mobile connected but returned no public key.');
  return {name:'Jupiter Mobile',publicKey:adapter.publicKey,signTransaction:tx=>adapter.signTransaction(tx),signMessage:async(bytes)=>({signature:await adapter.signMessage(bytes)})};
}
function setStatus(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text;el.className='status'+(type?' '+type:'');}
function meta(){return {description:$('#description').value.trim(),image:$('#image').value.trim(),website:$('#website').value.trim()};}
async function sha256(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function encodeSig(bytes){const mod=await import('https://esm.sh/bs58@6.0.0?bundle');const bs58=mod.default||mod;return bs58.encode(bytes);}
function gateOpen(){return !!(platform?.publicMainnetCreatorLaunchesEnabled&&serverGate&&treasuryVault);}
function values(){return {name:$('#name').value.trim(),symbol:$('#symbol').value.trim().toUpperCase(),supply:Number($('#supply').value),fee:Number($('#fee').value),threshold:Number($('#threshold').value),migrationPercent:Number($('#migration-percent').value),vestingPercent:Number($('#vesting-percent').value),cliffDays:Number($('#cliff-days').value),vestingMonths:Number($('#vesting-months').value)};}

async function loadGate(){
  try{
    const [a,b]=await Promise.all([
      fetch('/platform-config.json?v=20260921-public-v9',{cache:'no-store'}),
      fetch(REGISTER_URL,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'})
    ]);
    if(!a.ok||!b.ok)throw new Error('Gate data unavailable');
    platform=await a.json();const registry=await b.json();
    if(platform.publicLaunchPad!==true)throw new Error('Public LaunchPad contract mismatch');
    if(platform.feePolicy?.worldzLaunchPadShareOfCollectedProjectFeePercent!==10||platform.feePolicy?.projectRetainedShareOfCollectedProjectFeePercent!==90)throw new Error('90/10 fee contract mismatch');
    if(platform.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent!==0||platform.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent!==0)throw new Error('Zero supply/liquidity take contract mismatch');
    const v=String(platform.treasuryRouting?.vaultAddress||'');
    treasuryVault=/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(v)?new PublicKey(v):null;
    serverGate=registry.mainnetPublicLaunchEnabled===true&&registry.treasuryMultisigReady===true;
    const open=gateOpen();
    $('#wallet').disabled=!open;$('#wallet').textContent=open?'Connect Wallet':'Gate Locked';
    $('#gate').className='gate'+(open?' ready':'');
    $('#gate').textContent=open
      ?'MAINNET GATE OPEN ✅ Treasury Multisig registered; server and public configuration agree.'
      :'MAINNET GATE CLOSED 🔒 No production transaction can be built or broadcast until the verified Treasury Multisig vault is registered and the server-side release flag is enabled.';
    renderGate();renderProof();
  }catch(e){serverGate=false;treasuryVault=null;$('#gate').textContent='MAINNET GATE ERROR — treated as CLOSED. '+(e?.message||e);renderGate();renderProof();}
}
function renderGate(){
  const items=[
    ['Public LaunchPad contract',platform?.publicLaunchPad===true,'PUBLIC'],
    ['Worldz platform fee share',platform?.feePolicy?.worldzLaunchPadShareOfCollectedProjectFeePercent===10,'10% ONLY'],
    ['Project fee share',platform?.feePolicy?.projectRetainedShareOfCollectedProjectFeePercent===90,'90%'],
    ['Worldz token-supply take',platform?.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent===0,'0%'],
    ['Worldz initial-liquidity take',platform?.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent===0,'0%'],
    ['Treasury Multisig address',!!treasuryVault,treasuryVault?treasuryVault.toBase58():'NOT REGISTERED'],
    ['Server-side mainnet release',serverGate,serverGate?'ENABLED':'LOCKED']
  ];
  $('#gate-proof').innerHTML=items.map(([a,ok,b])=>'<div class="'+(ok?'pass':'block')+'"><b>'+(ok?'✓ ':'× ')+a+'</b><span>'+b+'</span></div>').join('');
}
async function connect(){
  if(!gateOpen())return setStatus('#status','MAINNET GATE CLOSED. Wallet execution remains disabled.','bad');
  try{
    wallet=await connectProvider();if(!wallet)return setStatus('#status','No compatible Solana wallet found. Jupiter Wallet is preferred when available; Wallet Standard, Phantom and Solflare-compatible wallets are supported.','bad');
    const pk=wallet.publicKey;$('#wallet').textContent=(/jupiter/i.test(wallet.name)?'JUP ':'')+pk.toString().slice(0,4)+'…'+pk.toString().slice(-4);client=new DynamicBondingCurveClient(connection,'confirmed');return true;
  }catch(e){setStatus('#status','Wallet connection failed: '+(e?.message||e),'bad');return false;}
}
function buildAndValidate(){
  const v=values(),errors=[];
  if(!gateOpen())errors.push('Production mainnet gate is closed.');
  if(v.name.length<2||v.name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(v.symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!Number.isSafeInteger(v.supply)||v.supply<1_000||v.supply>1_000_000_000_000)errors.push('Supply must be a whole number from 1,000 to 1 trillion.');
  if(!Number.isFinite(v.fee)||v.fee<0.5||v.fee>3)errors.push('Project trading fee must be 0.50%–3.00%.');
  if(!Number.isFinite(v.threshold)||v.threshold<1)errors.push('Migration threshold must be at least 1 SOL.');
  if(!Number.isInteger(v.migrationPercent)||v.migrationPercent<10||v.migrationPercent>90)errors.push('Migration supply percentage must be 10–90%.');
  if(!Number.isInteger(v.vestingPercent)||v.vestingPercent<0||v.vestingPercent>15)errors.push('Creator/team locked vesting must be 0–15%.');
  if(!Number.isInteger(v.cliffDays)||v.cliffDays<90||v.cliffDays>3650)errors.push('Vesting cliff must be 90–3650 days.');
  if(!Number.isInteger(v.vestingMonths)||v.vestingMonths<18||v.vestingMonths>120)errors.push('Vesting duration must be 18–120 months.');
  if(errors.length){curveConfig=null;preflight=false;$('#launch-btn').disabled=true;setStatus('#status','MAINNET PREFLIGHT BLOCKED\n• '+errors.join('\n• '),'bad');renderProof();return false;}
  try{
    const feeBps=Math.round(v.fee*100),vestingAmount=Math.floor(v.supply*v.vestingPercent/100);
    curveConfig=buildCurve({
      token:{tokenType:TokenType.SPLToken,tokenBaseDecimal:TokenDecimal.SIX,tokenQuoteDecimal:TokenDecimal.NINE,tokenAuthorityOption:TokenAuthorityOption.Immutable,totalTokenSupply:v.supply,leftover:0},
      fee:{baseFeeParams:{baseFeeMode:BaseFeeMode.FeeSchedulerExponential,feeSchedulerParam:{startingFeeBps:feeBps,endingFeeBps:feeBps,numberOfPeriod:0,totalDuration:0}},dynamicFeeEnabled:false,collectFeeMode:CollectFeeMode.QuoteToken,creatorTradingFeePercentage:90,poolCreationFee:0,enableFirstSwapWithMinFee:false},
      migration:{migrationOption:MigrationOption.MET_DAMM_V2,migrationFeeOption:MigrationFeeOption.Customizable,migrationFee:{feePercentage:0,creatorFeePercentage:90},migratedPoolFee:{collectFeeMode:MigratedCollectFeeMode.QuoteToken,dynamicFee:DammV2DynamicFeeMode.Enabled,poolFeeBps:Math.max(25,feeBps),baseFeeMode:DammV2BaseFeeMode.FeeTimeSchedulerLinear}},
      liquidityDistribution:{partnerLiquidityPercentage:0,partnerPermanentLockedLiquidityPercentage:10,creatorLiquidityPercentage:0,creatorPermanentLockedLiquidityPercentage:90},
      lockedVesting:{totalLockedVestingAmount:vestingAmount,numberOfVestingPeriod:v.vestingPercent>0?v.vestingMonths:0,cliffUnlockAmount:0,totalVestingDuration:v.vestingPercent>0?v.vestingMonths*30*86400:0,cliffDurationFromMigrationTime:v.vestingPercent>0?v.cliffDays*86400:0},
      activationType:ActivationType.Timestamp,percentageSupplyOnMigration:v.migrationPercent,migrationQuoteThreshold:v.threshold
    });
    preflight=true;$('#launch-btn').disabled=false;
    setStatus('#status','MAINNET PREFLIGHT PASS ✅\nNetwork: Solana mainnet-beta\nFee: '+v.fee.toFixed(2)+'%\nProject share: 90%\nWorldz Treasury Multisig share: 10%\nFee claimer: '+treasuryVault.toBase58()+'\nWorldz supply take: 0%\nWorldz initial-liquidity take: 0%\nGraduated LP: 100% permanently locked\nNo transaction has been signed or broadcast.','good');
    renderProof();return true;
  }catch(e){curveConfig=null;preflight=false;$('#launch-btn').disabled=true;setStatus('#status','METEORA SDK REJECTED MAINNET CONFIG\n'+(e?.message||e),'bad');renderProof();return false;}
}
async function sendTransaction(tx,signers=[]){
  if(!gateOpen())throw new Error('Mainnet gate closed before signing.');
  tx.feePayer=wallet.publicKey;const latest=await connection.getLatestBlockhash('confirmed');tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;if(signers.length)tx.partialSign(...signers);
  const signed=await wallet.signTransaction(tx);const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error('Mainnet simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-10).join('\n'):''));
  if(!gateOpen())throw new Error('Mainnet gate closed after simulation.');
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');if(conf.value.err)throw new Error('Mainnet confirmation failed: '+JSON.stringify(conf.value.err));return sig;
}
async function launch(){
  if(!buildAndValidate())return;if(!wallet||!wallet.publicKey){if(!await connect())return;}if(!gateOpen())return;
  $('#launch-btn').disabled=true;
  try{
    const v=values();baseMint=Keypair.generate();configKey=Keypair.generate();const uri='https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(baseMint.publicKey.toBase58());
    const tx=await client.partner.createConfigAndPool({config:configKey.publicKey,feeClaimer:treasuryVault,leftoverReceiver:wallet.publicKey,payer:wallet.publicKey,quoteMint:NATIVE_MINT,...curveConfig,preCreatePoolParam:{baseMint:baseMint.publicKey,name:v.name,symbol:v.symbol,uri,poolCreator:wallet.publicKey}});
    launchTx=await sendTransaction(tx,[configKey,baseMint]);const pool=deriveDbcPoolAddress(NATIVE_MINT,baseMint.publicKey,configKey.publicKey);poolId=pool.toBase58();
    const [poolInfo,configInfo,mintInfo]=await Promise.all([connection.getAccountInfo(pool,'confirmed'),client.state.getPoolConfig(configKey.publicKey),connection.getParsedAccountInfo(baseMint.publicKey,'confirmed')]);
    if(!poolInfo||!poolInfo.owner.equals(DBC_PROGRAM))throw new Error('DBC pool owner verification failed.');
    if(!configInfo)throw new Error('DBC config verification failed.');
    if(String(configInfo.feeClaimer)!==treasuryVault.toBase58())throw new Error('Treasury fee claimer mismatch after launch.');
    if(Number(configInfo.creatorTradingFeePercentage)!==90)throw new Error('90/10 fee-share mismatch after launch.');
    if(!mintInfo.value)throw new Error('Token mint verification failed.');
    $('#mint').textContent=baseMint.publicKey.toBase58();$('#config').textContent=configKey.publicKey.toBase58();$('#pool').textContent=poolId;$('#tx').textContent=launchTx;$('#result').classList.add('show');$('#register-btn').disabled=false;
    setStatus('#status','PUBLIC MAINNET LAUNCH VERIFIED ON-CHAIN ✅\nDBC config + pool confirmed.\nTreasury fee claimer = verified Worldz Multisig.\nCreator trading-fee share = 90%; Worldz partner share = 10%.','good');renderProof();
  }catch(e){launchTx='';poolId='';setStatus('#status','MAINNET LAUNCH FAILED\n'+(e?.message||e),'bad');$('#launch-btn').disabled=!preflight;}
}
async function register(){
  if(!launchTx||!poolId||!baseMint||!configKey||!gateOpen())return;if(typeof wallet.signMessage!=='function')return setStatus('#proof-status','Wallet message signing is required for Worldz Proof.','bad');
  $('#register-btn').disabled=true;
  try{
    const v=values(),mint=baseMint.publicKey.toBase58(),issuedAt=new Date().toISOString();
    const intent=await sha256(JSON.stringify({schema:'worldzlaunchpad.curve-pro.mainnet.v1',mint,poolId,config:configKey.publicKey.toBase58(),fee:v.fee,project:90,worldz:10,feeClaimer:treasuryVault.toBase58(),permanentLock:100}));
    const message=['WORLDZLAUNCHPAD_REGISTER_V1','intent_hash='+intent,'mint='+mint,'wallet='+wallet.publicKey.toBase58(),'issued_at='+issuedAt].join('\n');
    const signed=await wallet.signMessage(new TextEncoder().encode(message),'utf8'),signature=await encodeSig(signed?.signature||signed);
    const body={intent_hash:intent,mint,wallet:wallet.publicKey.toBase58(),issued_at:issuedAt,signature,environment:'mainnet-beta',network:'solana',engine:'curve-pro',quote_asset:'SOL',token_name:v.name,symbol:v.symbol,decimals:6,fixed_supply:String(v.supply),project_fee_percent:v.fee,fee_routes:{project:90,worldz:10},metadata:meta(),metadata_uri:'https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mint),mint_tx_signature:launchTx,pool_id:poolId,lp_mint:null,pool_tx_signature:launchTx,vesting_config:{lockedTokenPercent:v.vestingPercent,cliffDays:v.cliffDays,durationMonths:v.vestingMonths,enforcedInDbcConfig:v.vestingPercent>0},lock_config:{partnerPermanentLockedLiquidityPercent:10,creatorPermanentLockedLiquidityPercent:90,totalPermanentLockedLiquidityPercent:100,enforcedInDbcConfig:true},proof:{meteoraDbcNetworkVerified:true,dbcProgram:DBC_PROGRAM.toBase58(),dbcConfig:configKey.publicKey.toBase58(),treasuryFeeClaimer:treasuryVault.toBase58(),preGraduationTradingFeePercent:v.fee,projectTradingFeePercent:90,worldzPartnerTradingFeePercent:10,graduatedLiquidityPermanentLockPercent:100},stage:'locked'};
    const res=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),out=await res.json().catch(()=>({}));if(!res.ok||!out.ok)throw new Error(out.error||out.detail||('HTTP '+res.status));
    registered=true;setStatus('#proof-status','WORLDZ PROOF REGISTERED ✅\nRegistry ID: '+out.registry.id,'good');renderProof();
  }catch(e){setStatus('#proof-status','WORLDZ PROOF REGISTRATION FAILED\n'+(e?.message||e),'bad');$('#register-btn').disabled=false;}
}
function renderProof(){
  const items=[['Mainnet release gate',gateOpen(),gateOpen()?'OPEN':'LOCKED'],['Treasury Multisig fee claimer',!!treasuryVault,treasuryVault?treasuryVault.toBase58():'PENDING'],['90% project / 10% Worldz fee split',preflight,preflight?'SDK CONFIGURED':'PENDING'],['0% Worldz supply take',platform?.feePolicy?.worldzLaunchPadShareOfTokenSupplyPercent===0,'HARD RULE'],['0% Worldz initial-liquidity take',platform?.feePolicy?.worldzLaunchPadShareOfInitialLiquidityPercent===0,'HARD RULE'],['Mainnet config + pool',!!launchTx,launchTx?'ON-CHAIN':'NOT EXECUTED'],['Worldz Proof registry',registered,registered?'REGISTERED':'PENDING']];
  $('#proof-grid').innerHTML=items.map(([a,ok,b])=>'<div class="'+(ok?'pass':a==='Mainnet release gate'?'block':'wait')+'"><b>'+(ok?'✓ ':'! ')+a+'</b><span>'+b+'</span></div>').join('');
}
function loadQuery(){const q=new URLSearchParams(location.search);for(const [key,id] of [['name','#name'],['symbol','#symbol'],['supply','#supply'],['description','#description'],['fee','#fee']])if(q.get(key))$(id).value=q.get(key);}
loadQuery();$('#wallet').addEventListener('click',connect);$('#check-btn').addEventListener('click',buildAndValidate);$('#launch-btn').addEventListener('click',launch);$('#register-btn').addEventListener('click',register);['#name','#symbol','#supply','#fee','#threshold','#migration-percent','#vesting-percent','#cliff-days','#vesting-months'].forEach(id=>$(id).addEventListener('input',()=>{preflight=false;curveConfig=null;$('#launch-btn').disabled=true;renderProof();}));loadGate();renderProof();