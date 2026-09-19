import {Connection,Keypair,PublicKey,clusterApiUrl} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {NATIVE_MINT} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';
import BN from 'https://esm.sh/bn.js@5.2.1?bundle';
import {
  DynamicBondingCurveClient,deriveDbcPoolAddress,buildCurve,
  TokenType,TokenDecimal,TokenAuthorityOption,BaseFeeMode,CollectFeeMode,
  MigrationOption,MigrationFeeOption,MigratedCollectFeeMode,DammV2DynamicFeeMode,
  DammV2BaseFeeMode,ActivationType
} from 'https://esm.sh/@meteora-ag/dynamic-bonding-curve-sdk@1.5.12?bundle';

const $=s=>document.querySelector(s);
const connection=new Connection(clusterApiUrl('devnet'),'confirmed');
const DBC_PROGRAM=new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');
const REGISTER_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
let wallet=null,client=null,curveConfig=null,preflight=false,baseMint=null,configKey=null,poolId='',launchTx='',registered=false;

function provider(){return [window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;}
function setStatus(id,text,type=''){const el=$(id);el.textContent=text;el.className='status'+(type?' '+type:'');}
function meta(){return {description:$('#description').value.trim(),image:$('#image').value.trim(),website:$('#website').value.trim()};}
async function sha256(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function encodeSig(bytes){const mod=await import('https://esm.sh/bs58@6.0.0?bundle');const bs58=mod.default||mod;return bs58.encode(bytes);}
async function connect(){
  wallet=provider();if(!wallet){setStatus('#status','No injected Solana wallet found. Open this page in Phantom/Solflare or enable a compatible desktop wallet.','bad');return false;}
  try{
    const r=await wallet.connect(),pk=(r&&r.publicKey)||wallet.publicKey;if(!pk)throw new Error('No public key');
    $('#wallet').textContent=pk.toString().slice(0,4)+'…'+pk.toString().slice(-4);
    client=new DynamicBondingCurveClient(connection,'confirmed');
    return true;
  }catch(e){setStatus('#status','Wallet connection failed: '+(e?.message||e),'bad');return false;}
}
function values(){
  return {
    name:$('#name').value.trim(),symbol:$('#symbol').value.trim().toUpperCase(),
    supply:Number($('#supply').value),fee:Number($('#fee').value),threshold:Number($('#threshold').value),
    migrationPercent:Number($('#migration-percent').value),vestingPercent:Number($('#vesting-percent').value),
    cliffDays:Number($('#cliff-days').value),vestingMonths:Number($('#vesting-months').value)
  };
}
function buildAndValidate(){
  const v=values(),errors=[];
  if(v.name.length<2||v.name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(v.symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!Number.isSafeInteger(v.supply)||v.supply<=0||v.supply>1_000_000_000_000)errors.push('Supply must be a positive safe whole number up to 1 trillion.');
  if(!Number.isFinite(v.fee)||v.fee<0.5||v.fee>4)errors.push('Project trading fee must be 0.50%–4.00%.');
  if(!Number.isFinite(v.threshold)||v.threshold<1)errors.push('Migration threshold must be at least 1 SOL for this Devnet adapter.');
  if(!Number.isInteger(v.migrationPercent)||v.migrationPercent<10||v.migrationPercent>90)errors.push('Migration supply percentage must be 10–90%.');
  if(!Number.isInteger(v.vestingPercent)||v.vestingPercent<0||v.vestingPercent>50)errors.push('Locked vesting must be 0–50%.');
  if(!Number.isInteger(v.cliffDays)||v.cliffDays<0||v.cliffDays>3650)errors.push('Vesting cliff is invalid.');
  if(!Number.isInteger(v.vestingMonths)||v.vestingMonths<1||v.vestingMonths>120)errors.push('Vesting duration is invalid.');
  if(errors.length){curveConfig=null;preflight=false;$('#launch-btn').disabled=true;setStatus('#status','CURVE VALIDATION FAILED\n• '+errors.join('\n• '),'bad');renderProof();return false;}

  try{
    const feeBps=Math.round(v.fee*100);
    const vestingAmount=Math.floor(v.supply*v.vestingPercent/100);
    curveConfig=buildCurve({
      token:{
        tokenType:TokenType.SPLToken,
        tokenBaseDecimal:TokenDecimal.SIX,
        tokenQuoteDecimal:TokenDecimal.NINE,
        tokenAuthorityOption:TokenAuthorityOption.Immutable,
        totalTokenSupply:v.supply,
        leftover:0
      },
      fee:{
        baseFeeParams:{
          baseFeeMode:BaseFeeMode.FeeSchedulerExponential,
          feeSchedulerParam:{startingFeeBps:feeBps,endingFeeBps:feeBps,numberOfPeriod:0,totalDuration:0}
        },
        dynamicFeeEnabled:false,
        collectFeeMode:CollectFeeMode.QuoteToken,
        creatorTradingFeePercentage:90,
        poolCreationFee:0,
        enableFirstSwapWithMinFee:false
      },
      migration:{
        migrationOption:MigrationOption.MET_DAMM_V2,
        migrationFeeOption:MigrationFeeOption.Customizable,
        migrationFee:{feePercentage:0,creatorFeePercentage:90},
        migratedPoolFee:{
          collectFeeMode:MigratedCollectFeeMode.QuoteToken,
          dynamicFee:DammV2DynamicFeeMode.Enabled,
          poolFeeBps:Math.max(10,feeBps),
          baseFeeMode:DammV2BaseFeeMode.FeeTimeSchedulerLinear
        }
      },
      liquidityDistribution:{
        partnerLiquidityPercentage:0,
        partnerPermanentLockedLiquidityPercentage:10,
        creatorLiquidityPercentage:0,
        creatorPermanentLockedLiquidityPercentage:90
      },
      lockedVesting:{
        totalLockedVestingAmount:vestingAmount,
        numberOfVestingPeriod:v.vestingPercent>0?v.vestingMonths:0,
        cliffUnlockAmount:0,
        totalVestingDuration:v.vestingPercent>0?v.vestingMonths*30*86400:0,
        cliffDurationFromMigrationTime:v.vestingPercent>0?v.cliffDays*86400:0
      },
      activationType:ActivationType.Timestamp,
      percentageSupplyOnMigration:v.migrationPercent,
      migrationQuoteThreshold:v.threshold
    });
    preflight=true;$('#launch-btn').disabled=!!launchTx;
    setStatus('#status','METEORA DBC CURVE VALIDATION PASS ✅\nProgram: '+DBC_PROGRAM.toBase58()+
      '\nSupply: '+v.supply.toLocaleString()+' • decimals: 6'+
      '\nPre-graduation trading fee: '+v.fee.toFixed(2)+'%'+
      '\nFee allocation: 90% creator / 10% Worldz partner'+
      '\nMigration: DAMM V2 at '+v.threshold+' SOL threshold'+
      '\nGraduated liquidity: 10% Worldz partner locked + 90% creator locked = 100% permanent lock'+
      '\nLocked token vesting: '+v.vestingPercent+'%'+
      '\nPublic mainnet execution: OFF','good');
    renderProof();return true;
  }catch(e){console.error(e);curveConfig=null;preflight=false;$('#launch-btn').disabled=true;setStatus('#status','METEORA SDK REJECTED THIS CURVE\n'+(e?.message||e),'bad');renderProof();return false;}
}
async function sendTransaction(tx,signers=[]){
  tx.feePayer=wallet.publicKey;
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;
  if(signers.length)tx.partialSign(...signers);
  const signed=await wallet.signTransaction(tx);
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error('DBC simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-10).join('\n'):''));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)throw new Error('DBC transaction confirmation failed: '+JSON.stringify(conf.value.err));
  return sig;
}
async function launch(){
  if(!buildAndValidate())return;
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  $('#launch-btn').disabled=true;
  try{
    const v=values();
    baseMint=Keypair.generate();configKey=Keypair.generate();
    const uri='https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(baseMint.publicKey.toBase58());
    setStatus('#status','BUILDING METEORA DBC CONFIG + POOL…\nMint: '+baseMint.publicKey.toBase58()+'\nConfig: '+configKey.publicKey.toBase58(),'warn');
    const tx=await client.partner.createConfigAndPool({
      config:configKey.publicKey,
      feeClaimer:wallet.publicKey,
      leftoverReceiver:wallet.publicKey,
      payer:wallet.publicKey,
      quoteMint:NATIVE_MINT,
      ...curveConfig,
      preCreatePoolParam:{
        baseMint:baseMint.publicKey,
        name:v.name,
        symbol:v.symbol,
        uri,
        poolCreator:wallet.publicKey
      }
    });
    launchTx=await sendTransaction(tx,[configKey,baseMint]);
    const pool=deriveDbcPoolAddress(NATIVE_MINT,baseMint.publicKey,configKey.publicKey);
    poolId=pool.toBase58();
    const [poolInfo,mintInfo]=await Promise.all([
      connection.getAccountInfo(pool,'confirmed'),
      connection.getParsedAccountInfo(baseMint.publicKey,'confirmed')
    ]);
    if(!poolInfo||!poolInfo.owner.equals(DBC_PROGRAM))throw new Error('DBC pool exists but owner program verification failed.');
    if(!mintInfo.value)throw new Error('DBC mint account not found after confirmation.');
    $('#mint').textContent=baseMint.publicKey.toBase58();$('#config').textContent=configKey.publicKey.toBase58();$('#pool').textContent=poolId;$('#tx').textContent=launchTx;$('#result').classList.add('show');
    $('#register-btn').disabled=false;
    setStatus('#status','WORLDZ CURVE PRO DEVNET LAUNCH VERIFIED ✅\nMeteora config + pool created in one wallet-signed transaction.\nDBC pool owner program verified.\nMetadata URI: '+uri,'good');
    renderProof();
  }catch(e){console.error(e);launchTx='';poolId='';setStatus('#status','CURVE PRO LAUNCH FAILED\n'+(e?.message||e),'bad');$('#launch-btn').disabled=false;}
}
async function register(){
  if(!launchTx||!poolId||!baseMint||!configKey)return;
  if(typeof wallet.signMessage!=='function')return setStatus('#proof-status','Wallet message signing is required for Worldz Proof registration.','bad');
  $('#register-btn').disabled=true;
  try{
    const v=values(),mint=baseMint.publicKey.toBase58(),issuedAt=new Date().toISOString();
    const intent=await sha256(JSON.stringify({schema:'worldzlaunchpad.curve-pro.devnet.v1',mint,poolId,config:configKey.publicKey.toBase58(),fee:v.fee,creator:90,worldz:10,permanentLock:100}));
    const message=['WORLDZLAUNCHPAD_REGISTER_V1','intent_hash='+intent,'mint='+mint,'wallet='+wallet.publicKey.toBase58(),'issued_at='+issuedAt].join('\n');
    const signed=await wallet.signMessage(new TextEncoder().encode(message),'utf8');
    const signature=await encodeSig(signed?.signature||signed);
    const body={
      intent_hash:intent,mint,wallet:wallet.publicKey.toBase58(),issued_at:issuedAt,signature,
      environment:'devnet',network:'solana',engine:'curve-pro',quote_asset:'SOL',
      token_name:v.name,symbol:v.symbol,decimals:6,fixed_supply:String(v.supply),
      project_fee_percent:v.fee,fee_routes:{project:90,worldz:10},metadata:meta(),
      metadata_uri:'https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mint),
      mint_tx_signature:launchTx,pool_id:poolId,lp_mint:null,pool_tx_signature:launchTx,
      vesting_config:{lockedTokenPercent:v.vestingPercent,cliffDays:v.cliffDays,durationMonths:v.vestingMonths,enforcedInDbcConfig:v.vestingPercent>0},
      lock_config:{partnerPermanentLockedLiquidityPercent:10,creatorPermanentLockedLiquidityPercent:90,totalPermanentLockedLiquidityPercent:100,enforcedInDbcConfig:true},
      proof:{
        meteoraDbcDevnet:true,dbcProgram:DBC_PROGRAM.toBase58(),dbcConfig:configKey.publicKey.toBase58(),
        migrationOption:'DAMM_V2',migrationQuoteThresholdSol:v.threshold,percentageSupplyOnMigration:v.migrationPercent,
        preGraduationTradingFeePercent:v.fee,creatorTradingFeePercent:90,worldzPartnerTradingFeePercent:10,
        graduatedLiquidityPermanentLockPercent:100
      },
      stage:'locked'
    };
    const res=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const out=await res.json().catch(()=>({}));if(!res.ok||!out.ok)throw new Error(out.error||out.detail||('HTTP '+res.status));
    registered=true;setStatus('#proof-status','WORLDZ PROOF REGISTERED ✅\nRegistry ID: '+out.registry.id+'\nZED: shared registry ✅\nAUTO: shared registry ✅\nG.R.A.C.E.: shared registry ✅','good');renderProof();
  }catch(e){console.error(e);setStatus('#proof-status','WORLDZ PROOF REGISTRATION FAILED\n'+(e?.message||e),'bad');$('#register-btn').disabled=false;}
}
function renderProof(){
  const v=values();
  const items=[
    ['Meteora DBC Devnet program',true,DBC_PROGRAM.toBase58()],
    ['Per-launch curve validated',preflight,preflight?'SDK VALIDATED':'PENDING'],
    ['DBC config + token + pool',!!launchTx,launchTx?'ON-CHAIN':'PENDING'],
    ['90/10 pre-grad fee allocation',preflight,preflight?'NATIVE DBC CONFIG':'PENDING'],
    ['DAMM V2 graduation config',preflight,preflight?'CONFIGURED':'PENDING'],
    ['100% permanent LP lock',preflight,preflight?'10% PARTNER + 90% CREATOR LOCKED':'PENDING'],
    ['Locked token vesting',preflight,v.vestingPercent>0?(preflight?'ENCODED IN DBC CONFIG':'PENDING'):'NOT REQUESTED'],
    ['Command Centre registry',registered,registered?'REGISTERED':'PENDING'],
    ['Public mainnet launch',false,'LOCKED']
  ];
  $('#proof-grid').innerHTML=items.map(([a,ok,b])=>'<div class="'+(ok?'pass':'wait')+'"><b>'+(ok?'✓ ':'! ')+a+'</b><span>'+b+'</span></div>').join('');
}
function loadQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('name'))$('#name').value=q.get('name');
  if(q.get('symbol'))$('#symbol').value=q.get('symbol');
  if(q.get('supply'))$('#supply').value=q.get('supply');
  if(q.get('description'))$('#description').value=q.get('description');
  if(q.get('fee'))$('#fee').value=q.get('fee');
  const notes=[];
  if(q.get('intent'))notes.push('Manifest: '+q.get('intent').slice(0,16)+'…');
  if(q.get('decimals')&&q.get('decimals')!=='6')notes.push('Curve Pro Devnet beta currently executes 6-decimal DBC launches.');
  if(q.get('quote')&&q.get('quote')!=='SOL')notes.push('Curve Pro Devnet beta currently executes SOL quote only.');
  if(notes.length)setStatus('#status','MANIFEST LOADED\n'+notes.join('\n'),'warn');
}
loadQuery();
$('#wallet').addEventListener('click',connect);
$('#check-btn').addEventListener('click',buildAndValidate);
$('#launch-btn').addEventListener('click',launch);
$('#register-btn').addEventListener('click',register);
['#name','#symbol','#supply','#fee','#threshold','#migration-percent','#vesting-percent','#cliff-days','#vesting-months'].forEach(id=>$(id).addEventListener('input',()=>{preflight=false;curveConfig=null;$('#launch-btn').disabled=true;renderProof();}));
renderProof();