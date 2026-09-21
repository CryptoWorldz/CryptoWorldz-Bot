import {
  Connection,Keypair,SystemProgram,Transaction,PublicKey,clusterApiUrl
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,MINT_SIZE,AuthorityType,NATIVE_MINT,
  createInitializeMintInstruction,createAssociatedTokenAccountInstruction,
  createMintToInstruction,createSetAuthorityInstruction,getAssociatedTokenAddress
} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const connection=new Connection(clusterApiUrl('devnet'),'confirmed');
const REGISTER_URL='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-launch-register';
const U64_MAX=18446744073709551615n;

let wallet=null;
let checked=false;
let intentHash='';
let selectedQuote='SOL';
let mintAddress='';
let mintTxSignature='';
let metadataTxSignature='';
let authorityTxSignature='';
let poolId='';
let lpMint='';
let poolTxSignature='';
let feeSaved=false;
let lockPlanSaved=false;
let commandRegistered=false;

function provider(){
  return [window.phantom&&window.phantom.solana,window.solflare,window.solana]
    .filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
function setStatus(id,text,type=''){
  const el=$(id); if(!el)return;
  el.textContent=text;el.className='lab-status'+(type?' '+type:'');
}
function setStage(id,text,type=''){
  const el=$(id);if(!el)return;el.textContent=text;el.className='stage-state'+(type?' '+type:'');
}
function params(){
  return {
    name:$('#name').value.trim(),
    symbol:$('#symbol').value.trim().toUpperCase(),
    supply:$('#supply').value.trim(),
    decimals:Number($('#decimals').value),
    fixed:$('#fixed').checked
  };
}
function metadata(){
  return {
    description:$('#description').value.trim(),
    image:$('#image-url').value.trim(),
    website:$('#website-url').value.trim(),
    x:$('#x-url').value.trim(),
    telegram:$('#telegram-url').value.trim(),
    image_type:'image/png'
  };
}
function routes(){
  const out={};$$('.route-input').forEach(x=>out[x.dataset.route]=Number(x.value)||0);return out;
}
function routeTotal(){return Object.values(routes()).reduce((a,b)=>a+b,0);}
const SAFE={
  feeMin:.5,feeMax:3,creatorFeeMax:20,treasuryFeeMax:20,lpFeeMin:20,publicBenefitFeeMin:60,
  supplyMin:1000n,supplyMax:1000000000000n,founderMax:15,founderCliffMinDays:90,founderVestingMinMonths:18,lpLockMinMonths:12
};
function feePolicyErrors(){
  const r=routes(),fee=Number($('#project-fee').value),errors=[];
  if(!Number.isFinite(fee)||fee<SAFE.feeMin||fee>SAFE.feeMax)errors.push('Trading fee must be 0.50%–3.00%.');
  if(!Object.values(r).every(v=>Number.isFinite(v)&&v>=0&&v<=100))errors.push('Fee routes must each be between 0% and 100%.');
  if(Math.abs(routeTotal()-100)>.001)errors.push('Fee routes must total exactly 100%.');
  if((r.creator||0)>SAFE.creatorFeeMax)errors.push('Creator fee route cannot exceed 20%.');
  if((r.treasury||0)>SAFE.treasuryFeeMax)errors.push('Treasury fee route cannot exceed 20%.');
  if((r.lp||0)<SAFE.lpFeeMin)errors.push('LP Growth fee route must be at least 20%.');
  if((r.holders||0)+(r.lp||0)+(r.community||0)<SAFE.publicBenefitFeeMin)errors.push('Holders + LP + Community must receive at least 60% of project fee routing.');
  return errors;
}
function lockPolicyErrors(){
  const l=lockPlan(),v=vestingPlan(),errors=[];
  if(l.lpLockTargetMonths<SAFE.lpLockMinMonths)errors.push('LP lock target must be at least 12 months.');
  if(v.founderCliffDays<SAFE.founderCliffMinDays)errors.push('Founder cliff must be at least 90 days.');
  if(v.founderVestingMonths<SAFE.founderVestingMinMonths)errors.push('Founder vesting must be at least 18 months.');
  if(v.founderAllocationPercent>SAFE.founderMax)errors.push('Founder/team allocation cannot exceed 15%.');
  return errors;
}
function lockPlan(){
  return {
    lpLockTargetMonths:Number($('#lp-lock-months').value)||0,
    enforcement:false,
    status:'planned_not_enforced'
  };
}
function vestingPlan(){
  return {
    founderCliffDays:Number($('#vesting-cliff-days').value)||0,
    founderVestingMonths:Number($('#vesting-months').value)||0,
    founderAllocationPercent:Number($('#vesting-percent').value)||0,
    enforcement:false,
    status:'planned_not_enforced'
  };
}
function validate(){
  const p=params(),errors=[];
  if(p.name.length<2||p.name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(p.symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!/^\d+$/.test(p.supply)||BigInt(p.supply)<SAFE.supplyMin||BigInt(p.supply)>SAFE.supplyMax)errors.push('Supply must be a whole number from 1,000 to 1,000,000,000,000.');
  if(!p.fixed)errors.push('Fixed supply is compulsory on WorldzLaunchPad.');
  if(!Number.isInteger(p.decimals)||p.decimals<0||p.decimals>9)errors.push('Decimals must be 0–9.');
  if(!errors.length){
    const amount=BigInt(p.supply)*(10n**BigInt(p.decimals));
    if(amount>U64_MAX)errors.push('Supply × decimals exceeds the SPL Token u64 mint limit.');
  }
  checked=!errors.length;
  $('#launch').disabled=!checked||!!mintAddress;
  setStatus('#status',errors.length?'CHECK FAILED\n• '+errors.join('\n• '):
    'LOCAL CHECKS PASS ✅\nNetwork: Solana Devnet\nToken: '+p.name+' ($'+p.symbol+')\nSupply: '+p.supply+
    '\nDecimals: '+p.decimals+'\nFreeze authority: NONE\nMint authority: TEMPORARY ONLY — compulsory revoke after metadata\nWallet-transfer tax: 0%','');
  return checked;
}
async function connect(){
  wallet=provider();
  if(!wallet){setStatus('#status','No compatible injected Solana wallet found. Open this page inside Phantom/Solflare on mobile or enable a wallet extension on desktop.','bad');return false;}
  try{
    const r=await wallet.connect(),key=(r&&r.publicKey)||wallet.publicKey;
    if(!key)throw new Error('No public key returned');
    $('#wallet-button').textContent=key.toString().slice(0,4)+'…'+key.toString().slice(-4);
    $('#wallet-button').classList.add('connected');
    return true;
  }catch(e){setStatus('#status','Wallet connection cancelled or unavailable.','bad');return false;}
}
async function sha256(text){
  const bytes=new TextEncoder().encode(text);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function ensureIntent(){
  if(/^[0-9a-f]{64}$/.test(intentHash))return intentHash;
  const p=params();
  intentHash=await sha256(JSON.stringify({
    schema:'worldzlaunchpad.flash.devnet.v1',network:'solana',engine:'flash',
    quote:selectedQuote,token:{name:p.name,symbol:p.symbol,supply:p.supply,decimals:p.decimals,fixed:p.fixed},
    fee:Number($('#project-fee').value)||2,routes:routes()
  }));
  return intentHash;
}
async function createDevnetToken(){
  if(!validate())return;
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  const p=params(),owner=wallet.publicKey,mintKeypair=Keypair.generate();
  $('#launch').disabled=true;$('#check').disabled=true;
  setStatus('#status','BUILDING DEVNET TOKEN TRANSACTION…\nNo transaction has been broadcast.','');
  try{
    await ensureIntent();
    const rent=await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const ata=await getAssociatedTokenAddress(mintKeypair.publicKey,owner,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
    const amount=BigInt(p.supply)*(10n**BigInt(p.decimals));
    const tx=new Transaction().add(
      SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mintKeypair.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
      createInitializeMintInstruction(mintKeypair.publicKey,p.decimals,owner,null,TOKEN_PROGRAM_ID),
      createAssociatedTokenAccountInstruction(owner,ata,owner,mintKeypair.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
      createMintToInstruction(mintKeypair.publicKey,ata,owner,amount,[],TOKEN_PROGRAM_ID)
    );
    const latest=await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;tx.feePayer=owner;tx.partialSign(mintKeypair);

    setStatus('#status','WAITING FOR WALLET SIGNATURE…\nDEVNET only. Mint authority remains temporarily with your wallet so metadata can be created.','');
    const signed=await wallet.signTransaction(tx);
    const sim=await connection.simulateTransaction(signed,{sigVerify:true});
    if(sim.value.err)throw new Error('Devnet simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-6).join('\n'):''));

    setStatus('#status','TOKEN SIMULATION PASS ✅\nBroadcasting to Solana Devnet…','good');
    const signature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
    const confirmation=await connection.confirmTransaction({signature,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
    if(confirmation.value.err)throw new Error('Token confirmation failed: '+JSON.stringify(confirmation.value.err));

    mintAddress=mintKeypair.publicKey.toString();mintTxSignature=signature;
    $('#mint').textContent=mintAddress;$('#signature').textContent=signature;
    $('#explorer').href='https://explorer.solana.com/address/'+mintAddress+'?cluster=devnet';
    $('#token-result').classList.add('show');
    setStage('#state-token','ON-CHAIN','pass');
    setStage('#state-metadata','READY','wait');
    setStage('#state-pool','WAITING FOR METADATA','wait');
    $('#metadata-button').disabled=false;$('#save-fees').disabled=false;$('#save-locks').disabled=false;$('#register-button').disabled=false;
    setStatus('#status','WORLDZ FLASH TOKEN STAGE ✅\nMint: '+mintAddress+'\nSupply minted to: '+ata.toString()+'\nFreeze authority: NONE\nMint authority: TEMPORARILY RETAINED FOR METADATA','good');
    renderProof();
  }catch(e){
    console.error(e);setStatus('#status','TOKEN STAGE FAILED\n'+(e&&e.message?e.message:String(e)),'bad');
  }finally{$('#check').disabled=false;$('#launch').disabled=!!mintAddress||!checked;}
}
async function encodeSignature(bytes){
  const mod=await import('https://esm.sh/bs58@6.0.0?bundle');
  const bs58=mod.default||mod;
  return bs58.encode(bytes);
}
async function registerLaunch(stage='registered',extra={}){
  if(!mintAddress)throw new Error('Create the Devnet token first.');
  if(!wallet||!wallet.publicKey){if(!await connect())throw new Error('Wallet connection required.');}
  if(typeof wallet.signMessage!=='function')throw new Error('This wallet does not expose signMessage. Use Phantom/Solflare with message signing enabled.');
  const p=params(),hash=await ensureIntent(),issuedAt=new Date().toISOString(),walletAddress=wallet.publicKey.toString();
  const message=['WORLDZLAUNCHPAD_REGISTER_V1','intent_hash='+hash,'mint='+mintAddress,'wallet='+walletAddress,'issued_at='+issuedAt].join('\n');
  const signed=await wallet.signMessage(new TextEncoder().encode(message),'utf8');
  const sigBytes=signed&&signed.signature?signed.signature:signed;
  const signature=await encodeSignature(sigBytes);
  const fee=Number($('#project-fee').value)||1;
  const body={
    intent_hash:hash,mint:mintAddress,wallet:walletAddress,issued_at:issuedAt,signature,
    environment:'devnet',network:'solana',engine:'flash',quote_asset:selectedQuote,
    token_name:p.name,symbol:p.symbol,decimals:p.decimals,fixed_supply:p.supply,
    project_fee_percent:fee,fee_routes:routes(),metadata:metadata(),
    metadata_uri:mintAddress?'https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mintAddress):null,
    mint_tx_signature:mintTxSignature||null,pool_id:poolId||null,lp_mint:lpMint||null,pool_tx_signature:poolTxSignature||null,
    vesting_config:vestingPlan(),lock_config:lockPlan(),
    safe_launch_policy:{version:'WORLDZ-SAFE-LAUNCH-1',fixedSupplyMandatory:true,mintAuthorityRevocationMandatory:true,freezeAuthorityNone:true,walletTransferTaxPercent:0,feePolicyErrors:feePolicyErrors(),lockPolicyErrors:lockPolicyErrors()},
    proof:{
      tokenCreated:!!mintTxSignature,metadataCreated:!!metadataTxSignature,mintAuthorityFinalized:!!authorityTxSignature||!p.fixed,
      poolCreated:!!poolTxSignature,feeRouterConfigured:feeSaved,feeRouterExecuting:false,
      lpLockEnforced:false,vestingEnforced:false,quote:selectedQuote,...(extra.proof||{})
    },
    stage,...extra
  };
  const res=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const out=await res.json().catch(()=>({}));
  if(!res.ok||!out.ok)throw new Error(out.error||out.detail||('Registry HTTP '+res.status));
  commandRegistered=true;
  ['#zed-badge','#auto-badge','#grace-badge'].forEach(id=>$(id).classList.add('pass'));
  $('#zed-badge').textContent='ZED • SHARED REGISTRY ✅';
  $('#auto-badge').textContent='AUTO • SHARED REGISTRY ✅';
  $('#grace-badge').textContent='G.R.A.C.E. • SHARED REGISTRY ✅';
  setStatus('#registry-status','COMMAND CENTRE SHARED REGISTRY UPDATED ✅\nRegistry ID: '+out.registry.id+'\nStage: '+out.registry.stage+'\nWallet-control signature verified.','good');
  renderProof();
  return out;
}
async function writeOnChainMetadata(){
  if(!mintAddress)throw new Error('Create the token first.');
  const p=params();
  await registerLaunch('token_created',{proof:{metadataRegistrationPrepared:true}});
  const uri='https://launchpad.cryptoworldz.xyz/metadata.php?mint='+encodeURIComponent(mintAddress);
  setStatus('#metadata-status','WORLDZ REGISTRY READY ✅\nBuilding Metaplex Token Metadata transaction…','good');

  const [{createUmi},{walletAdapterIdentity},{mplTokenMetadata,createV1,TokenStandard},{mplToolbox},{publicKey,percentAmount}]=await Promise.all([
    import('https://esm.sh/@metaplex-foundation/umi-bundle-defaults@1.6.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/umi-signer-wallet-adapters@1.6.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.4.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/mpl-toolbox@0.10.0?bundle'),
    import('https://esm.sh/@metaplex-foundation/umi@1.6.0?bundle')
  ]);
  const umi=createUmi(clusterApiUrl('devnet')).use(walletAdapterIdentity(wallet)).use(mplTokenMetadata()).use(mplToolbox());
  const result=await createV1(umi,{
    mint:publicKey(mintAddress),
    authority:umi.identity,
    payer:umi.identity,
    updateAuthority:umi.identity,
    name:p.name,
    symbol:p.symbol,
    uri,
    sellerFeeBasisPoints:percentAmount(0),
    tokenStandard:TokenStandard.Fungible,
    isMutable:true
  }).sendAndConfirm(umi,{confirm:{commitment:'confirmed'}});
  metadataTxSignature=await encodeSignature(result.signature);

  if(!p.fixed)throw new Error('Safe Launch Standard requires fixed supply and mint-authority revocation.');
  {
    setStatus('#metadata-status','METADATA ON-CHAIN ✅\nFinalizing fixed supply by revoking mint authority…','good');
    const tx=new Transaction().add(createSetAuthorityInstruction(new PublicKey(mintAddress),wallet.publicKey,AuthorityType.MintTokens,null,[],TOKEN_PROGRAM_ID));
    const latest=await connection.getLatestBlockhash('confirmed');tx.recentBlockhash=latest.blockhash;tx.feePayer=wallet.publicKey;
    const signed=await wallet.signTransaction(tx);
    const sim=await connection.simulateTransaction(signed,{sigVerify:true});
    if(sim.value.err)throw new Error('Mint-authority revoke simulation failed: '+JSON.stringify(sim.value.err));
    authorityTxSignature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
    await connection.confirmTransaction(authorityTxSignature,'confirmed');
  }

  $('#metadata-uri').textContent=uri;$('#metadata-signature').textContent=metadataTxSignature;
  $('#authority-final').textContent='REVOKED ✅';
  $('#metadata-result').classList.add('show');
  setStage('#state-metadata','ON-CHAIN','pass');setStage('#state-pool',selectedQuote==='SOL'?'READY':'CROSSPAIR MAINNET ONLY','wait');
  $('#pool-button').disabled=selectedQuote!=='SOL';
  setStatus('#metadata-status','METADATA STAGE COMPLETE ✅\nMetaplex metadata: ON-CHAIN\nWorldz metadata URI: '+uri+'\nMint authority: REVOKED ✅\nFreeze authority: NONE ✅','good');
  await registerLaunch('metadata_created',{proof:{metadataUriVerified:true}});
  renderProof();
}
async function metadataFlow(){
  $('#metadata-button').disabled=true;
  try{
    if(!wallet||!wallet.publicKey){if(!await connect())return;}
    await writeOnChainMetadata();
  }catch(e){console.error(e);setStatus('#metadata-status','METADATA STAGE FAILED\n'+(e&&e.message?e.message:String(e)),'bad');}
  finally{$('#metadata-button').disabled=!!metadataTxSignature||!mintAddress;}
}
function toRawDecimal(value,decimals){
  const s=String(value).trim();
  if(!/^\d+(\.\d+)?$/.test(s))throw new Error('Invalid decimal amount: '+s);
  const [whole,frac='']=s.split('.');
  if(frac.length>decimals)throw new Error('Too many decimal places for amount '+s);
  return BigInt(whole)*(10n**BigInt(decimals))+BigInt((frac+'0'.repeat(decimals)).slice(0,decimals)||'0');
}
async function createRaydiumPool(){
  if(!mintAddress||!metadataTxSignature)throw new Error('Complete token + metadata first.');
  if(selectedQuote!=='SOL')throw new Error('Official wXRP is a verified MAINNET quote asset. WorldzLaunchPad will not invent a fake wXRP Devnet mint.');
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  $('#pool-button').disabled=true;
  setStatus('#pool-status','LOADING PINNED RAYDIUM DEVNET ADAPTER…','');
  try{
    const [{Raydium,TxVersion,DEVNET_PROGRAM_ID},bnMod]=await Promise.all([
      import('https://esm.sh/@raydium-io/raydium-sdk-v2@0.2.64-alpha?bundle'),
      import('https://esm.sh/bn.js@5.2.1?bundle')
    ]);
    const BN=bnMod.default||bnMod;
    const p=params();
    const tokenRaw=toRawDecimal($('#pool-token-amount').value,p.decimals);
    const solRaw=toRawDecimal($('#pool-quote-amount').value,9);
    if(tokenRaw<=0n||solRaw<=0n)throw new Error('Both initial LP amounts must be greater than zero.');

    const projectAta=await getAssociatedTokenAddress(new PublicKey(mintAddress),wallet.publicKey);
    const bal=await connection.getTokenAccountBalance(projectAta,'confirmed');
    if(BigInt(bal.value.amount)<tokenRaw)throw new Error('Wallet does not hold enough project tokens for this initial LP amount.');
    const solBalance=await connection.getBalance(wallet.publicKey,'confirmed');
    if(BigInt(solBalance)<=solRaw)throw new Error('Wallet SOL balance is not enough for the requested LP plus pool/rent costs.');

    const signAll=async txs=>{
      if(typeof wallet.signAllTransactions==='function')return wallet.signAllTransactions(txs);
      const out=[];for(const tx of txs)out.push(await wallet.signTransaction(tx));return out;
    };
    const raydium=await Raydium.load({
      owner:wallet.publicKey,connection,cluster:'devnet',signAllTransactions:signAll,
      disableFeatureCheck:true,disableLoadToken:true,blockhashCommitment:'confirmed'
    });
    setStatus('#pool-status','FETCHING DEVNET CPMM CONFIG + MINT STATE…','');
    const feeConfigs=await raydium.api.getCpmmConfigs();
    const feeConfig=feeConfigs.find(c=>c.index===0)||feeConfigs[0];
    if(!feeConfig)throw new Error('Raydium Devnet CPMM fee configuration unavailable.');
    const mintA=await raydium.token.getTokenInfo(new PublicKey(mintAddress));
    const mintB=await raydium.token.getTokenInfo(NATIVE_MINT);

    const built=await raydium.cpmm.createPool({
      programId:DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount:DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA,mintB,
      mintAAmount:new BN(tokenRaw.toString()),
      mintBAmount:new BN(solRaw.toString()),
      startTime:new BN(0),
      feeConfig,associatedOnly:false,ownerInfo:{useSOLBalance:true},
      txVersion:TxVersion.V0,
      computeBudgetConfig:{units:600000,microLamports:1000}
    });

    setStatus('#pool-status','SIMULATING RAYDIUM DEVNET POOL BEFORE WALLET SIGNING…','');
    const unsignedSim=await connection.simulateTransaction(built.transaction,{sigVerify:false,commitment:'confirmed'});
    if(unsignedSim.value.err)throw new Error('Raydium pool simulation failed: '+JSON.stringify(unsignedSim.value.err)+(unsignedSim.value.logs?'\n'+unsignedSim.value.logs.slice(-8).join('\n'):''));

    setStatus('#pool-status','POOL SIMULATION PASS ✅\nWaiting for wallet signature…','good');
    const signed=await wallet.signTransaction(built.transaction);
    const signedSim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
    if(signedSim.value.err)throw new Error('Signed pool simulation failed: '+JSON.stringify(signedSim.value.err));
    poolTxSignature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
    await connection.confirmTransaction(poolTxSignature,'confirmed');

    poolId=built.extInfo.address.poolId.toBase58();
    lpMint=built.extInfo.address.lpMint.toBase58();
    $('#pool-id').textContent=poolId;$('#lp-mint').textContent=lpMint;$('#pool-signature').textContent=poolTxSignature;
    $('#pool-result').classList.add('show');setStage('#state-pool','REAL DEVNET POOL','pass');
    setStatus('#pool-status','WORLDZ FLASH POOL STAGE ✅\nRaydium CPMM Devnet pool: '+poolId+'\nLP mint: '+lpMint+'\nThis proves the pool. It does NOT yet prove the Worldz project fee router, LP lock or vesting.','good');
    await registerLaunch('pool_created',{proof:{raydiumCpmmDevnet:true,venueFeeConfigIndex:feeConfig.index}});
    renderProof();
  }catch(e){console.error(e);setStatus('#pool-status','POOL STAGE FAILED\n'+(e&&e.message?e.message:String(e)),'bad');}
  finally{$('#pool-button').disabled=selectedQuote!=='SOL'||!metadataTxSignature||!!poolTxSignature;}
}
function updateRoutes(){
  const total=routeTotal();$('#route-total').textContent=total.toFixed(0)+'%';
  $('#route-total').className='stage-state '+(Math.abs(total-100)<.001?'pass':'block');
  feeSaved=false;setStage('#state-fees',Math.abs(total-100)<.001?'READY TO SNAPSHOT':'ROUTES MUST = 100',Math.abs(total-100)<.001?'wait':'block');
  renderProof();
}
async function saveFees(){
  if(!mintAddress)return setStatus('#registry-status','Create the token first.','bad');
  const errors=feePolicyErrors();
  if(errors.length)return setStatus('#registry-status','SAFE FEE CHECK FAILED\n• '+errors.join('\n• '),'bad');
  feeSaved=true;setStage('#state-fees','SNAPSHOT SAVED','pass');
  try{await registerLaunch(poolTxSignature?'pool_created':metadataTxSignature?'metadata_created':'token_created',{proof:{feeRouterConfigured:true,feeRouterExecuting:false}});}
  catch(e){feeSaved=false;setStage('#state-fees','REGISTRY SAVE FAILED','block');setStatus('#registry-status','Fee snapshot failed: '+e.message,'bad');}
  renderProof();
}
async function saveLocks(){
  if(!mintAddress)return;
  const errors=lockPolicyErrors();
  if(errors.length){lockPlanSaved=false;setStage('#state-locks','SAFE LIMITS FAILED','block');return setStatus('#registry-status','SAFE LOCK / VESTING CHECK FAILED\n• '+errors.join('\n• '),'bad');}
  lockPlanSaved=true;setStage('#state-locks','POLICY PASS • NOT YET ON-CHAIN ENFORCED','wait');
  try{await registerLaunch(poolTxSignature?'pool_created':metadataTxSignature?'metadata_created':'token_created',{proof:{lockPlanRecorded:true,vestingPlanRecorded:true,lpLockEnforced:false,vestingEnforced:false}});}
  catch(e){lockPlanSaved=false;setStatus('#registry-status','Lock/vesting plan save failed: '+e.message,'bad');}
  renderProof();
}
function chooseQuote(q){
  selectedQuote=q;$$('.quote-btn').forEach(b=>b.classList.toggle('selected',b.dataset.quote===q));
  if(q==='SOL'){
    $('#quote-note').textContent="SOL Devnet uses native SOL/wSOL as the real quote side. Pool creation uses Raydium's Devnet CPMM program and is a separate venue fee from the Worldz project-fee configuration.";
    if(metadataTxSignature&&!poolTxSignature)$('#pool-button').disabled=false;
    setStage('#state-pool',poolTxSignature?'REAL DEVNET POOL':metadataTxSignature?'READY':'WAITING FOR METADATA',poolTxSignature?'pass':'wait');
  }else{
    $('#quote-note').textContent='wXRP is verified on Solana MAINNET at 6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2. There is no verified official wXRP Devnet mint in this build, so WorldzLaunchPad refuses to fabricate one. CrossPair remains a mainnet-target design here.';
    $('#pool-button').disabled=true;
    setStage('#state-pool','wXRP MAINNET TARGET','wait');
  }
  renderProof();
}
function renderProof(){
  const p=params();
  const items=[
    ['Token mint exists on Solana Devnet',!!mintTxSignature,!!mintTxSignature?'VERIFIED ON-CHAIN':'PENDING','pass'],
    ['Metadata exists on-chain',!!metadataTxSignature,!!metadataTxSignature?'METAPLEX VERIFIED STAGE':'PENDING','pass'],
    ['Mint authority revoked after genesis',!!authorityTxSignature,authorityTxSignature?'REVOKED ✅':'PENDING','pass'],
    ['Freeze authority',true,'NONE / REVOKED BY DESIGN','pass'],
    ['Wallet-transfer tax',true,'0% • HARD LOCK','pass'],
    ['Selected quote disclosed',true,selectedQuote==='SOL'?'SOL DEVNET':'wXRP VERIFIED MAINNET TARGET','pass'],
    ['Real Devnet liquidity pool',!!poolTxSignature,poolTxSignature?'RAYDIUM CPMM VERIFIED':'PENDING','pass'],
    ['Worldz fee configuration',feeSaved,feeSaved?'SNAPSHOT RECORDED':'PENDING','pass'],
    ['Worldz fee router execution',false,'NOT YET EXECUTING','block'],
    ['LP lock enforcement',false,lockPlanSaved?'PLAN SAVED • NOT ENFORCED':'PENDING','block'],
    ['Vesting enforcement',false,lockPlanSaved?'PLAN SAVED • NOT ENFORCED':'PENDING','block'],
    ['Command Centre shared registry',commandRegistered,commandRegistered?'ZED / AUTO / G.R.A.C.E. RECORD AVAILABLE':'PENDING','pass'],
    ['Public mainnet creator launch',false,'LOCKED','block']
  ];
  $('#proof-grid').innerHTML=items.map(([label,ok,detail])=>'<div class="proof-item '+(ok?'pass':detail.includes('NOT')||detail==='LOCKED'?'block':'wait')+'"><span class="mark">'+(ok?'✓':detail.includes('NOT')||detail==='LOCKED'?'×':'!')+'</span><div><b>'+label+'</b><br><small>'+detail+'</small></div></div>').join('');
  const criticalReady=!!mintTxSignature&&!!metadataTxSignature&&(!p.fixed||!!authorityTxSignature);
  setStage('#state-proof',criticalReady?'PARTIAL PROOF • ENFORCEMENT PENDING':'BUILDING PROOF',criticalReady?'wait':'wait');
}
async function refreshRegistry(){
  if(!mintAddress)return;
  $('#register-button').disabled=true;
  try{await registerLaunch(poolTxSignature?'pool_created':metadataTxSignature?'metadata_created':'token_created',{proof:{manualRegistryRefresh:true}});}
  catch(e){setStatus('#registry-status','REGISTRY UPDATE FAILED\n'+e.message,'bad');}
  finally{$('#register-button').disabled=false;}
}
function loadQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('name'))$('#name').value=q.get('name');
  if(q.get('symbol'))$('#symbol').value=q.get('symbol');
  if(q.get('supply'))$('#supply').value=q.get('supply');
  if(q.get('decimals'))$('#decimals').value=q.get('decimals');
  $('#fixed').checked=true;
  if(q.get('description'))$('#description').value=q.get('description');
  if(q.get('intent')&&/^[0-9a-f]{64}$/.test(q.get('intent')))intentHash=q.get('intent');
  if(q.get('quote')&&['SOL','wXRP'].includes(q.get('quote')))chooseQuote(q.get('quote'));
  if(q.get('fee'))$('#project-fee').value=Math.min(SAFE.feeMax,Math.max(SAFE.feeMin,Number(q.get('fee'))||1));
  ['creator','holders','lp','treasury','community'].forEach(k=>{if(q.get('route_'+k))$('[data-route="'+k+'"]').value=q.get('route_'+k);});
  if(q.get('founder_cliff'))$('#vesting-cliff-days').value=Math.max(SAFE.founderCliffMinDays,Number(q.get('founder_cliff'))||SAFE.founderCliffMinDays);
  if(q.get('founder_vesting'))$('#vesting-months').value=Math.max(SAFE.founderVestingMinMonths,Number(q.get('founder_vesting'))||24);
  if(q.get('lp_lock_days'))$('#lp-lock-months').value=Math.max(SAFE.lpLockMinMonths,Math.ceil((Number(q.get('lp_lock_days'))||365)/30.4375));
  if(q.get('alloc_creatorTeam'))$('#vesting-percent').value=Math.min(SAFE.founderMax,Number(q.get('alloc_creatorTeam'))||0);
  const meta=[];
  if(intentHash)meta.push('Intent: '+intentHash.slice(0,16)+'…');
  if(q.get('engine'))meta.push('Engine: '+q.get('engine'));
  meta.push('Quote: '+selectedQuote);
  if(q.get('fee'))meta.push('Project fee design: '+q.get('fee')+'%');
  if(meta.length)setStatus('#status','WORLDZLAUNCHPAD MANIFEST LOADED\n'+meta.join('\n')+'\n\nRun Local Checks before creating the Devnet mint.');
  updateRoutes();renderProof();
}
$('#wallet-button').addEventListener('click',connect);
$('#check').addEventListener('click',validate);
$('#launch').addEventListener('click',createDevnetToken);
$('#metadata-button').addEventListener('click',metadataFlow);
$('#pool-button').addEventListener('click',createRaydiumPool);
$('#save-fees').addEventListener('click',saveFees);
$('#save-locks').addEventListener('click',saveLocks);
$('#register-button').addEventListener('click',refreshRegistry);
$$('.quote-btn').forEach(b=>b.addEventListener('click',()=>chooseQuote(b.dataset.quote)));
$$('.route-input').forEach(x=>x.addEventListener('input',updateRoutes));
$('#project-fee').addEventListener('input',()=>{feeSaved=false;setStage('#state-fees','CONFIGURATION','wait');renderProof();});
['#name','#symbol','#supply','#decimals','#fixed'].forEach(id=>$(id).addEventListener('input',()=>{if(!mintAddress){$('#launch').disabled=true;checked=false;}}));
loadQuery();
