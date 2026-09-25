import {createClient} from "npm:@supabase/supabase-js@2.49.1";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";

const URL=Deno.env.get("SUPABASE_URL")!;
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEV="Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u";
const RPC="https://api.mainnet-beta.solana.com";
const supabase=createClient(URL,KEY,{auth:{persistSession:false}});
const cors={"access-control-allow-origin":"https://launchpad.cryptoworldz.xyz","access-control-allow-headers":"content-type","access-control-allow-methods":"GET,POST,OPTIONS"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});

async function rpc(method:string,params:any[]){
  const r=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const x=await r.json();
  if(!r.ok||x.error)throw new Error("solana_rpc_"+method+":"+(x.error?.message||r.status));
  return x.result;
}
function verifyStart(body:any){
  const wallet=String(body.wallet||""),issued=String(body.issued_at||""),signature=String(body.signature||"");
  if(wallet!==DEV)throw new Error("unauthorized_wallet");
  const ts=Date.parse(issued);if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>5*60*1000)throw new Error("signature_timestamp_expired");
  const msg=["WORLDZ_LEGACY_PROOF_V1","action=START_BATCH","wallet="+wallet,"batch=","legacy_order=","issued_at="+issued].join("\n");
  let ok=false;try{ok=nacl.sign.detached.verify(new TextEncoder().encode(msg),bs58.decode(signature),bs58.decode(wallet));}catch{}
  if(!ok)throw new Error("invalid_wallet_signature");
}
async function sha256(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function verifySession(body:any){
  const batch=String(body.batch_id||""),token=String(body.batch_token||"");
  if(!/^[0-9a-f-]{36}$/i.test(batch)||token.length<32)throw new Error("invalid_batch_session");
  const {data,error}=await supabase.from("worldz_legacy_snapshot_batches").select("status,auth_hash,auth_expires_at").eq("batch_id",batch).maybeSingle();
  if(error||!data||data.status!=="OPEN")throw new Error("batch_not_open");
  if(!data.auth_expires_at||Date.parse(data.auth_expires_at)<=Date.now())throw new Error("batch_session_expired");
  if(await sha256(token)!==String(data.auth_hash||""))throw new Error("invalid_batch_session");
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method==="GET"){
   const {data:assets}=await supabase.from("worldz_legacy_proof_assets").select("legacy_order,token_name,symbol,mint,decimals,launch_provider,verified_at,holder_count_snapshot,snapshot_status").order("legacy_order");
   const {data:batches}=await supabase.from("worldz_legacy_snapshot_batches").select("batch_id,status,completed_assets,expected_assets,snapshot_root,created_at,completed_at").order("created_at",{ascending:false}).limit(5);
   return json({ok:true,legacyAssets:assets||[],registeredLegacyAssets:assets?.length||0,allTenRegistered:(assets?.length||0)===10,recentBatches:batches||[]});
  }
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  const body=await req.json(),action=String(body.action||"");

  if(action==="START_BATCH"){
   verifyStart(body);
   const token=crypto.randomUUID()+crypto.randomUUID();
   const authHash=await sha256(token);
   await supabase.from("worldz_legacy_proof_assets").update({snapshot_status:"PENDING_FRESH_SNAPSHOT",snapshot_slot:null,snapshot_at:null,snapshot_hash:null,updated_at:new Date().toISOString()}).neq("legacy_order",0);
   const {data,error}=await supabase.from("worldz_legacy_snapshot_batches").insert({created_by_wallet:DEV,auth_hash:authHash,auth_expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select("batch_id,status,expected_assets,completed_assets,created_at,auth_expires_at").single();
   if(error)throw new Error("batch_create_failed:"+error.message);
   return json({ok:true,batch:data,batchToken:token});
  }

  if(action==="SNAPSHOT_ASSET"||action==="FINALIZE_BATCH")await verifySession(body);

  if(action==="SNAPSHOT_ASSET"){
   const order=Number(body.legacy_order);if(!Number.isInteger(order)||order<1||order>10)throw new Error("invalid_legacy_order");
   const batch=String(body.batch_id||"");if(!/^[0-9a-f-]{36}$/i.test(batch))throw new Error("invalid_batch_id");
   const {data:a,error}=await supabase.from("worldz_legacy_proof_assets").select("*").eq("legacy_order",order).single();
   if(error||!a)throw new Error("legacy_asset_not_found");
   const acct=await rpc("getAccountInfo",[a.mint,{encoding:"jsonParsed",commitment:"confirmed"}]);
   const program=acct?.value?.owner;if(!program)throw new Error("mint_program_unknown");
   const [supply,slot,accounts]=await Promise.all([
    rpc("getTokenSupply",[a.mint,{commitment:"confirmed"}]),
    rpc("getSlot",[{commitment:"confirmed"}]),
    rpc("getProgramAccounts",[program,{encoding:"jsonParsed",commitment:"confirmed",filters:[{memcmp:{offset:0,bytes:a.mint}}]}])
   ]);
   const supplyRaw=String(supply?.value?.amount||"0");if(BigInt(supplyRaw)<=0n)throw new Error("legacy_supply_zero");
   const rows=[];
   for(const x of accounts||[]){
    const info=x?.account?.data?.parsed?.info,raw=String(info?.tokenAmount?.amount||"0"),owner=String(info?.owner||"");
    if(!owner||BigInt(raw)<=0n)continue;
    const normalized=Number(raw)/Number(supplyRaw);
    rows.push({snapshot_batch:batch,legacy_order:order,mint:a.mint,owner_wallet:owner,token_account:String(x.pubkey),balance_raw:raw,decimals:Number(supply.value.decimals),supply_raw:supplyRaw,normalized_balance:normalized,sqrt_weight:Math.sqrt(normalized),snapshot_slot:Number(slot)});
   }
   await supabase.from("worldz_legacy_holder_snapshot").delete().eq("snapshot_batch",batch).eq("mint",a.mint);
   if(rows.length){const {error:ie}=await supabase.from("worldz_legacy_holder_snapshot").insert(rows);if(ie)throw new Error("snapshot_insert_failed:"+ie.message);}
   await supabase.from("worldz_legacy_proof_assets").update({snapshot_status:"SNAPSHOT_COMPLETE",snapshot_slot:Number(slot),snapshot_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("legacy_order",order);
   const {count}=await supabase.from("worldz_legacy_proof_assets").select("*",{count:"exact",head:true}).eq("snapshot_status","SNAPSHOT_COMPLETE");
   await supabase.from("worldz_legacy_snapshot_batches").update({completed_assets:count||0}).eq("batch_id",batch);
   return json({ok:true,batchId:batch,legacyOrder:order,mint:a.mint,holders:rows.length,slot:Number(slot),tokenProgram:program});
  }

  if(action==="FINALIZE_BATCH"){
   const batch=String(body.batch_id||"");if(!/^[0-9a-f-]{36}$/i.test(batch))throw new Error("invalid_batch_id");
   const {data:assets}=await supabase.from("worldz_legacy_proof_assets").select("legacy_order,snapshot_status").order("legacy_order");
   if((assets||[]).length!==10||(assets||[]).some((a:any)=>a.snapshot_status!=="SNAPSHOT_COMPLETE"))throw new Error("all_ten_snapshots_required");
   const {data:rows,error}=await supabase.from("worldz_legacy_holder_snapshot").select("owner_wallet,mint,sqrt_weight,snapshot_slot").eq("snapshot_batch",batch);
   if(error||!rows?.length)throw new Error("snapshot_rows_missing");
   const map=new Map<string,{assets:Set<string>,historic:number}>();
   for(const r of rows){const x=map.get(r.owner_wallet)||{assets:new Set<string>(),historic:0};x.assets.add(r.mint);x.historic+=Number(r.sqrt_weight);map.set(r.owner_wallet,x);}
   const owners=[...map.keys()].sort(),n=owners.length,totalHistoric=owners.reduce((s,w)=>s+(map.get(w)?.historic||0),0);
   const REVIVE_SUPPLY_TOKENS=200000000n, TOKEN_SCALE=1000000n, REVIVE_POOL_PERCENT=10n;\n   const totalRaw=REVIVE_SUPPLY_TOKENS*TOKEN_SCALE*REVIVE_POOL_PERCENT/100n;\n   if(totalRaw!==20000000n*TOKEN_SCALE)throw new Error("revive_pool_invariant_failed");
   let allocated=0n;const ents:any[]=[];
   for(let i=0;i<owners.length;i++){const w=owners[i],x=map.get(w)!;const eq=1/n,hist=totalHistoric?x.historic/totalHistoric:0,combined=.5*eq+.5*hist;let amount=i===owners.length-1?totalRaw-allocated:BigInt(Math.floor(Number(totalRaw)*combined));allocated+=amount;ents.push({snapshot_batch:batch,owner_wallet:w,legacy_assets_held:x.assets.size,equal_weight:eq,historic_weight:hist,combined_weight:combined,revive_pool_percent:combined,revive_amount_raw:amount.toString(),proof:{model:"50% equal + 50% sqrt normalized legacy weight",revivePoolPercentOfRVIV:Number(REVIVE_POOL_PERCENT)}});}
   await supabase.from("worldz_legacy_revive_entitlements").delete().eq("snapshot_batch",batch);
   const {error:ee}=await supabase.from("worldz_legacy_revive_entitlements").insert(ents);if(ee)throw new Error("entitlement_insert_failed:"+ee.message);
   const canonical=JSON.stringify(ents.map(x=>[x.owner_wallet,x.revive_amount_raw,x.legacy_assets_held]));
   const root=await sha256(canonical),slots=rows.map((x:any)=>Number(x.snapshot_slot));
   await supabase.from("worldz_legacy_snapshot_batches").update({status:"COMPLETE",completed_assets:10,snapshot_slot_min:Math.min(...slots),snapshot_slot_max:Math.max(...slots),snapshot_root:root,completed_at:new Date().toISOString()}).eq("batch_id",batch);
   return json({ok:true,batchId:batch,uniqueLegacyWallets:n,revivePoolRaw:totalRaw.toString(),snapshotHash:root});
  }
  return json({ok:false,error:"unknown_action"},400);
 }catch(e){console.error(e);return json({ok:false,error:e instanceof Error?e.message:String(e)},400);}
});