
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false}});
const ORIGIN="https://launchpad.cryptoworldz.xyz";
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{
  status,headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const RPCS={
  "devnet":"https://api.devnet.solana.com",
  "mainnet-beta":Deno.env.get("SOLANA_MAINNET_RPC")||"https://api.mainnet-beta.solana.com"
};
const PROJECT_KEYS=["creator","liquidity","community","treasury","growth"];
const WORLDZ_KEYS=["worldzOperations","worldzCommunityTeam","purpleDiamondCrew"];
const ALL_KEYS=[...PROJECT_KEYS,...WORLDZ_KEYS];
const FIXED_WORLDZ_ALLOCATIONS:any={worldzOperations:0.30,worldzCommunityTeam:0.18,purpleDiamondCrew:0.12};
const WORLDZ_OPS_TREASURY="n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB";
const WORLDZ_COMMUNITY_TEAM_TREASURY="";
const PURPLE_DIAMOND_CREW_TREASURY="";
const WATERMARK_REMOVAL_LAMPORTS=50000000;

function validPk(x:string){return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);}
function expectedMessage(action:string,mint:string,wallet:string,environment:string,issued:string){
  return ["WORLDZMINT_"+action+"_V1","mint="+mint,"wallet="+wallet,"environment="+environment,"issued_at="+issued].join("\n");
}
function verifyWalletSig(action:string,body:any){
  const mint=String(body?.mint||""),wallet=String(body?.wallet||""),environment=String(body?.environment||""),issued=String(body?.issued_at||""),signature=String(body?.signature||"");
  if(!validPk(mint)||!validPk(wallet))throw new Error("invalid_public_key");
  if(!["devnet","mainnet-beta"].includes(environment))throw new Error("invalid_environment");
  const ts=Date.parse(issued);
  if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>5*60*1000)throw new Error("signature_timestamp_expired");
  let ok=false;
  try{
    ok=nacl.sign.detached.verify(
      new TextEncoder().encode(expectedMessage(action,mint,wallet,environment,issued)),
      bs58.decode(signature),bs58.decode(wallet)
    );
  }catch{}
  if(!ok)throw new Error("invalid_wallet_signature");
}
function decodeBase64Image(input:string){
  const clean=String(input||"").replace(/^data:[^;]+;base64,/,"").replace(/\s/g,"");
  if(!clean||clean.length>4200000)throw new Error("image_too_large");
  let bin:string;
  try{bin=atob(clean);}catch{throw new Error("invalid_image_base64");}
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(bytes.byteLength>3145728)throw new Error("image_too_large");
  return bytes;
}
function validatePolicy(body:any){
  const supply=String(body.fixed_supply||"");
  if(!/^\d+$/.test(supply)||BigInt(supply)<1000n||BigInt(supply)>1000000000000n)throw new Error("invalid_supply");
  if(Number(body.decimals)!==6)throw new Error("worldzmint_requires_6_decimals");
  const name=String(body.token_name||"").trim(),symbol=String(body.symbol||"").trim().toUpperCase();
  if(name.length<2||name.length>32)throw new Error("invalid_name");
  if(!/^[A-Z0-9_$]{2,10}$/.test(symbol))throw new Error("invalid_symbol");
  const a=body.allocations||{},r=body.recipients||{};
  for(const k of ALL_KEYS){
    if(!Number.isFinite(Number(a[k]))||Number(a[k])<0||Number(a[k])>100)throw new Error("invalid_allocation_"+k);
    if(!validPk(String(r[k]||"")))throw new Error("invalid_recipient_"+k);
  }
  const total=ALL_KEYS.reduce((n,k)=>n+Number(a[k]),0);
  if(Math.abs(total-100)>0.001)throw new Error("allocations_must_total_100");
  const projectTotal=PROJECT_KEYS.reduce((n,k)=>n+Number(a[k]),0);
  if(Math.abs(projectTotal-99.4)>0.001)throw new Error("project_allocations_must_total_99_4");
  for(const k of WORLDZ_KEYS)if(Math.abs(Number(a[k])-FIXED_WORLDZ_ALLOCATIONS[k])>0.0001)throw new Error("worldz_fixed_allocation_mismatch_"+k);
  if(Number(a.creator)>5)throw new Error("creator_liquid_above_5_percent");
  if(Number(a.liquidity)<25||Number(a.liquidity)>60)throw new Error("liquidity_must_be_25_to_60_percent");
  if(Number(a.community)<20)throw new Error("community_below_20_percent");
  if(Number(a.treasury)>15)throw new Error("treasury_above_15_percent");
  const addresses=ALL_KEYS.map(k=>String(r[k]));
  if(new Set(addresses).size!==addresses.length)throw new Error("genesis_recipients_must_be_distinct");
  if(String(r.creator)!==String(body.wallet))throw new Error("creator_recipient_must_equal_signing_wallet");
  if(!WORLDZ_COMMUNITY_TEAM_TREASURY||!PURPLE_DIAMOND_CREW_TREASURY)throw new Error("worldz_multisig_destinations_not_ready");
  if(String(r.worldzOperations)!==WORLDZ_OPS_TREASURY)throw new Error("worldz_operations_treasury_mismatch");
  if(String(r.worldzCommunityTeam)!==WORLDZ_COMMUNITY_TEAM_TREASURY)throw new Error("worldz_community_team_treasury_mismatch");
  if(String(r.purpleDiamondCrew)!==PURPLE_DIAMOND_CREW_TREASURY)throw new Error("purple_diamond_crew_treasury_mismatch");
  const description=String(body.description||"");
  if(description.length>700)throw new Error("description_too_long");
  const image=String(body.image_url||"");
  if(image&&!/^https:\/\//i.test(image))throw new Error("image_must_be_https");
  const website=String(body.website||"");
  if(website&&!/^https:\/\//i.test(website))throw new Error("website_must_be_https");
  return {
    supply,name,symbol,
    allocations:Object.fromEntries(ALL_KEYS.map(k=>[k,Number(a[k])])),
    recipients:Object.fromEntries(ALL_KEYS.map(k=>[k,String(r[k])]))
  };
}
async function rpc(environment:string,method:string,params:any[]){
  const url=(RPCS as any)[environment];
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(10000)});
  const out=await r.json().catch(()=>null);
  if(!r.ok||out?.error)throw new Error("solana_rpc_"+method);
  return out.result;
}
async function txSignedBy(environment:string,signature:string,wallet:string,requiredAccount?:string){
  const tx=await rpc(environment,"getTransaction",[signature,{encoding:"jsonParsed",commitment:"confirmed",maxSupportedTransactionVersion:0}]);
  if(!tx||tx?.meta?.err)throw new Error("transaction_not_confirmed");
  const keys=tx.transaction?.message?.accountKeys||[];
  const keyText=(x:any)=>typeof x==="string"?x:String(x?.pubkey||"");
  const parsedSigner=keys.some((x:any)=>typeof x!=="string"&&keyText(x)===wallet&&x?.signer===true);
  const required=Number(tx.transaction?.message?.header?.numRequiredSignatures||0);
  const orderedSigner=required>0&&keys.slice(0,required).some((x:any)=>keyText(x)===wallet);
  const signed=parsedSigner||orderedSigner;
  if(!signed)throw new Error("wallet_not_transaction_signer");
  if(requiredAccount&&!keys.some((x:any)=>keyText(x)===requiredAccount))throw new Error("required_account_not_in_transaction");
  return {slot:tx.slot,transaction:tx};
}
async function verifyWatermarkPayment(signature:string,wallet:string){
  if(!signature||signature.length<32)throw new Error("watermark_payment_signature_required");
  const proof=await txSignedBy("mainnet-beta",signature,wallet,WORLDZ_OPS_TREASURY);
  const instructions=proof.transaction?.transaction?.message?.instructions||[];
  const paid=instructions.some((ix:any)=>{
    const p=ix?.parsed,info=p?.info||{};
    return ix?.program==="system"&&p?.type==="transfer"&&
      String(info.source||"")===wallet&&String(info.destination||"")===WORLDZ_OPS_TREASURY&&
      Number(info.lamports||0)>=WATERMARK_REMOVAL_LAMPORTS;
  });
  if(!paid)throw new Error("watermark_payment_not_verified");
  return {slot:proof.slot,signature,lamports:WATERMARK_REMOVAL_LAMPORTS};
}
async function preparedMintProof(environment:string,mint:string,wallet:string){
  const res=await rpc(environment,"getAccountInfo",[mint,{encoding:"jsonParsed",commitment:"confirmed"}]);
  const v=res?.value,info=v?.data?.parsed?.info;
  if(!v||!info||v?.data?.parsed?.type!=="mint")throw new Error("mint_not_found");
  if(Number(info.decimals)!==6)throw new Error("mint_decimals_mismatch");
  if(String(info.supply)!=="0")throw new Error("mint_supply_must_be_zero_at_prepare");
  if(String(info.mintAuthority||"")!==wallet)throw new Error("prepare_mint_authority_mismatch");
  if(String(info.freezeAuthority||"")!==wallet)throw new Error("prepare_freeze_authority_mismatch");
  return {tokenProgram:String(v.owner),mintAuthority:wallet,freezeAuthority:wallet};
}
async function mintProof(environment:string,mint:string,supply:string){
  const res=await rpc(environment,"getAccountInfo",[mint,{encoding:"jsonParsed",commitment:"confirmed"}]);
  const v=res?.value,info=v?.data?.parsed?.info;
  if(!v||!info||v?.data?.parsed?.type!=="mint")throw new Error("mint_not_found");
  const expected=(BigInt(supply)*1000000n).toString();
  if(Number(info.decimals)!==6)throw new Error("mint_decimals_mismatch");
  if(String(info.supply)!==expected)throw new Error("mint_supply_mismatch");
  if(info.mintAuthority!==null)throw new Error("mint_authority_not_revoked");
  if(info.freezeAuthority!==null)throw new Error("freeze_authority_not_revoked");
  return {tokenProgram:String(v.owner),rawSupply:String(info.supply),mintAuthority:null,freezeAuthority:null};
}
async function ownerMintBalance(environment:string,owner:string,mint:string){
  const res=await rpc(environment,"getTokenAccountsByOwner",[owner,{mint},{encoding:"jsonParsed",commitment:"confirmed"}]);
  let total=0n;
  for(const x of res?.value||[]){
    const amount=x?.account?.data?.parsed?.info?.tokenAmount?.amount;
    if(/^\d+$/.test(String(amount||"")))total+=BigInt(amount);
  }
  return total;
}
async function distributionProof(environment:string,supply:string,allocations:any,recipients:any,mint:string){
  const raw=BigInt(supply)*1000000n,bps:any={};
  for(const k of ALL_KEYS)bps[k]=BigInt(Math.round(Number(allocations[k])*100));
  if(ALL_KEYS.reduce((n,k)=>n+bps[k],0n)!==10000n)throw new Error("genesis_basis_points_must_total_10000");
  const expected:any={};
  for(const k of ALL_KEYS)expected[k]=raw*bps[k]/10000n;
  const expectedTotal=ALL_KEYS.reduce((n,k)=>n+expected[k],0n);
  if(expectedTotal!==raw)throw new Error("genesis_distribution_math_mismatch");
  const actual:any={};
  for(const k of ALL_KEYS)actual[k]=await ownerMintBalance(environment,recipients[k],mint);
  for(const k of ALL_KEYS)if(actual[k]!==expected[k])throw new Error("genesis_balance_mismatch_"+k);
  return {
    expectedRaw:Object.fromEntries(ALL_KEYS.map(k=>[k,expected[k].toString()])),
    actualRaw:Object.fromEntries(ALL_KEYS.map(k=>[k,actual[k].toString()])),
    exact:true
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  const url=new URL(req.url);

  if(req.method==="GET"&&url.searchParams.get("walletPreset")){
    const wallet=String(url.searchParams.get("walletPreset")||"");
    if(!validPk(wallet))return json({ok:false,error:"invalid_wallet"},400);
    const {data,error}=await supabase.from("worldz_mint_private_presets")
      .select("config,expires_at,consumed_at,created_at")
      .contains("config",{recipients:{creator:wallet}})
      .is("consumed_at",null)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!data)return json({ok:false,error:"active_wallet_preset_not_found"},404);
    return new Response(JSON.stringify({ok:true,privatePreset:true,config:data.config,expiresAt:data.expires_at}),{
      headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
    });
  }

  if(req.method==="GET"&&url.searchParams.get("preset")){
    const accessCode=String(url.searchParams.get("preset")||"");
    if(!/^[0-9a-f-]{36}$/i.test(accessCode))return json({ok:false,error:"invalid_preset"},400);
    const {data,error}=await supabase.from("worldz_mint_private_presets")
      .select("config,expires_at,consumed_at").eq("access_code",accessCode).maybeSingle();
    if(error||!data)return json({ok:false,error:"preset_not_found"},404);
    if(data.consumed_at)return json({ok:false,error:"preset_already_used"},410);
    if(Date.parse(String(data.expires_at))<=Date.now())return json({ok:false,error:"preset_expired"},410);
    return json({ok:true,privatePreset:true,config:data.config,expiresAt:data.expires_at});
  }

  if(req.method==="GET"&&url.searchParams.get("metadata")){
    const mint=String(url.searchParams.get("metadata")||"");
    if(!validPk(mint))return json({error:"invalid_mint"},400);
    const {data,error}=await supabase.from("worldz_mint_registry")
      .select("token_name,symbol,description,image_url,website,mint,status").eq("mint",mint).maybeSingle();
    if(error||!data)return json({error:"metadata_not_found"},404);
    return new Response(JSON.stringify({
      name:data.token_name,symbol:data.symbol,description:data.description||"",
      image:data.image_url||"",external_url:data.website||"https://launchpad.cryptoworldz.xyz/mint/",
      attributes:[
        {trait_type:"Mint Standard",value:"WorldzMINT™"},
        {trait_type:"Supply",value:"Fixed"},
        {trait_type:"Mint Authority",value:data.status==="verified_fixed_supply"?"Revoked":"Finalising"},
        {trait_type:"Freeze Authority",value:data.status==="verified_fixed_supply"?"Revoked":"Finalising"}
      ],
      properties:{category:"image"}
    }),{headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120"}});
  }

  if(req.method==="GET"){
    const {data,error}=await supabase.from("worldz_mint_registry")
      .select("mint,environment,token_name,symbol,fixed_supply,image_url,website,status,proof,created_at")
      .eq("is_public",true).eq("status","verified_fixed_supply")
      .order("created_at",{ascending:false}).limit(50);
    if(error)return json({ok:false,error:"registry_read_failed"},500);
    return json({
      ok:true,standard:"WORLDZMINT-1",
      platformTokenSupplyTakePercent:0.6,
      platformTokenSupplySplitPercent:{operations:0.30,communityTeam:0.18,purpleDiamondCrew:0.12},
      tokenSupplyRoutingReady:Boolean(WORLDZ_COMMUNITY_TEAM_TREASURY&&PURPLE_DIAMOND_CREW_TREASURY),
      watermark:{defaultApplied:true,opacity:0.35,removePriceSol:0.05,paymentDestination:WORLDZ_OPS_TREASURY},
      walletTransferTaxPercent:0,
      confidenceCurvePlatformSharePercentOfCollectedProjectFee:10,
      mints:data||[]
    });
  }

  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  if(req.headers.get("origin")&&req.headers.get("origin")!==ORIGIN)return json({ok:false,error:"origin_not_allowed"},403);

  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"").toUpperCase();
  try{
    if(action==="UPLOAD_IMAGE"){
      const requestedClean=body.watermark_removed===true;
      let watermarkPayment=null;
      if(requestedClean){
        const wallet=String(body.wallet||"");
        if(!validPk(wallet))throw new Error("wallet_required_for_watermark_removal");
        watermarkPayment=await verifyWatermarkPayment(String(body.watermark_removal_tx_signature||""),wallet);
      }
      const mime=String(body.mime_type||"").toLowerCase();
      const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":mime==="image/jpeg"?"jpg":null;
      if(!ext)throw new Error("unsupported_image_type");
      const bytes=decodeBase64Image(String(body.image_base64||""));
      const path="public/"+new Date().toISOString().slice(0,10)+"/"+crypto.randomUUID()+"."+ext;
      const {error}=await supabase.storage.from("worldz-mint-art").upload(path,bytes,{contentType:mime,upsert:false,cacheControl:"31536000"});
      if(error)throw new Error("image_upload_failed:"+error.message);
      const {data:publicData}=supabase.storage.from("worldz-mint-art").getPublicUrl(path);
      const imageUrl=publicData?.publicUrl;
      if(!imageUrl||!/^https:\/\//.test(imageUrl))throw new Error("image_public_url_failed");
      return json({ok:true,imageUrl,path,mimeType:mime,size:bytes.byteLength,unsigned:!requestedClean,watermarkRemoved:requestedClean,watermarkPayment});
    }

    if(action==="PREPARE"){
      const wallet=String(body.wallet||""),mint=String(body.mint||""),environment=String(body.environment||"");
      const createSig=String(body.create_mint_tx_signature||"");
      if(!validPk(wallet)||!validPk(mint))throw new Error("invalid_public_key");
      if(!["devnet","mainnet-beta"].includes(environment))throw new Error("invalid_environment");
      if(createSig.length<32)throw new Error("create_mint_transaction_signature_required");
      const v=validatePolicy(body);
      const watermarkRemoved=body.watermark_removed===true;
      const watermarkSig=watermarkRemoved?String(body.watermark_removal_tx_signature||""):null;
      const watermarkProof=watermarkRemoved?await verifyWatermarkPayment(watermarkSig!,wallet):null;
      if(watermarkSig){
        const {data:used}=await supabase.from("worldz_mint_registry").select("mint").eq("watermark_removal_tx_signature",watermarkSig).neq("mint",mint).maybeSingle();
        if(used)throw new Error("watermark_payment_already_used");
      }
      await Promise.all([
        txSignedBy(environment,createSig,wallet,mint),
        preparedMintProof(environment,mint,wallet)
      ]);
      const {data:existing,error:existingError}=await supabase.from("worldz_mint_registry")
        .select("wallet_address,status").eq("mint",mint).maybeSingle();
      if(existingError)throw new Error("registry_lookup_failed");
      if(existing&&existing.wallet_address!==wallet)throw new Error("mint_already_reserved_by_another_wallet");
      if(existing&&existing.status==="verified_fixed_supply")throw new Error("mint_already_verified");
      const metadataUri=SUPABASE_URL+"/functions/v1/worldz-mint-register?metadata="+encodeURIComponent(mint);
      const record={
        mint,environment,network:"solana",
        wallet_address:wallet,token_name:v.name,symbol:v.symbol,decimals:6,fixed_supply:v.supply,
        description:String(body.description||""),image_url:String(body.image_url||"")||null,website:String(body.website||"")||null,
        allocations:v.allocations,recipients:v.recipients,metadata_uri:metadataUri,status:"prepared",is_public:true,
        watermark_removed:watermarkRemoved,watermark_removal_tx_signature:watermarkSig,
        create_mint_tx_signature:createSig,
        updated_at:new Date().toISOString()
      };
      const {data,error}=await supabase.from("worldz_mint_registry").upsert(record,{onConflict:"mint"})
        .select("mint,metadata_uri,status").single();
      if(error)throw new Error("registry_prepare_failed:"+error.message);
      return json({ok:true,registry:data,metadataUri,auth:"onchain_create_transaction",watermark:{removed:watermarkRemoved,payment:watermarkProof}});
    }

    if(action==="FINALIZE"){
      const wallet=String(body.wallet||""),mint=String(body.mint||""),environment=String(body.environment||"");
      if(!validPk(wallet)||!validPk(mint))throw new Error("invalid_public_key");
      if(!["devnet","mainnet-beta"].includes(environment))throw new Error("invalid_environment");
      const {data:row,error}=await supabase.from("worldz_mint_registry").select("*").eq("mint",String(body.mint)).maybeSingle();
      if(error||!row)throw new Error("prepared_mint_not_found");
      if(row.wallet_address!==body.wallet||row.environment!==body.environment)throw new Error("prepared_mint_owner_mismatch");
      const createSig=String(body.create_mint_tx_signature||""),distributeSig=String(body.distribute_tx_signature||""),finalizeSig=String(body.finalize_tx_signature||"");
      if(createSig.length<32||distributeSig.length<32||finalizeSig.length<32)throw new Error("transaction_signatures_required");
      const [createProof,distributionTxProof,finalizeProof,mintState,dist]=await Promise.all([
        txSignedBy(row.environment,createSig,row.wallet_address),
        txSignedBy(row.environment,distributeSig,row.wallet_address),
        txSignedBy(row.environment,finalizeSig,row.wallet_address),
        mintProof(row.environment,row.mint,String(row.fixed_supply)),
        distributionProof(row.environment,String(row.fixed_supply),row.allocations,row.recipients,row.mint)
      ]);
      const proof={
        standard:"WORLDZMINT-1",walletSignatureVerified:false,walletTransactionSignaturesVerified:true,
        authentication:"onchain_transaction_signatures",
        creatorWallet:row.wallet_address,network:row.environment,
        fixedSupplyVerified:true,mintAuthorityRevoked:true,freezeAuthorityRevoked:true,
        walletTransferTaxPercent:0,worldzTokenSupplyTakePercent:0.6,worldzInitialLiquidityTakePercent:0,
        worldzTokenSupplySplitPercent:{operations:0.30,communityTeam:0.18,purpleDiamondCrew:0.12},
        watermark:{removed:row.watermark_removed===true,removalPriceSol:row.watermark_removed===true?0.05:0,paymentSignature:row.watermark_removal_tx_signature||null},
        allocationsPolicyVerified:true,distributionVerified:true,distribution:dist,
        createMintTransactionSlot:createProof.slot,distributionTransactionSlot:distributionTxProof.slot,
        finalAuthorityTransactionSlot:finalizeProof.slot,
        confidenceCurveEligibleForReview:true,
        confidenceCurvePlatformSharePercentOfCollectedProjectFee:10,
        note:"Mint proof only. This does not claim liquidity, trading, LP lock, market quality, Jupiter verification, or a Worldz Confidence Curve launch."
      };
      const {data,error:updateError}=await supabase.from("worldz_mint_registry").update({
        create_mint_tx_signature:createSig,distribute_tx_signature:distributeSig,finalize_tx_signature:finalizeSig,
        proof,status:"verified_fixed_supply",updated_at:new Date().toISOString()
      }).eq("mint",row.mint).select("mint,status,proof").single();
      if(updateError)throw new Error("registry_finalize_failed");
      return json({ok:true,registry:data,trustPassport:"https://launchpad.cryptoworldz.xyz/trust/?mint="+encodeURIComponent(row.mint)});
    }
    return json({ok:false,error:"unknown_action"},400);
  }catch(e){
    return json({ok:false,error:String(e?.message||e)},400);
  }
});
