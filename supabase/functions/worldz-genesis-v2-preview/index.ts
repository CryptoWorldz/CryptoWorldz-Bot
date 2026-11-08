// Worldz Genesis V2: preview and devnet connectivity only. NO transaction or DB writes.
const KEYS=["founding100","devCity","legacyDevelopers","liquidityReserve","communityRewards","treasury","strategicReserve","impact","partnerships","securityContingency","legacyHolders"] as const;
const PCTS=[10,15,5,30,8,3,5,12,5,2,5] as const;
const cors={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","cache-control":"no-store"};
function response(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{...cors,"content-type":"application/json"}});}
function validKey(s:string){try{const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";if(s.length<32||s.length>44)return false;let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)return false;n=n*58n+BigInt(i);}let bytes=0;while(n>0n){bytes++;n>>=8n;}for(const c of s){if(c!=="1")break;bytes++;}return bytes===32;}catch{return false;}}
export function validatePreview(body:any){
  const errors:string[]=[];
  if(body?.token?.name!=="Worldz"||body?.token?.symbol!=="Worldz"||body?.token?.decimals!==6||body?.token?.fixedSupply!=="100000000")errors.push("token_identity_or_supply_mismatch");
  if(body?.network!=="devnet")errors.push("preview_requires_devnet");
  const allocations=body?.allocations;
  if(!Array.isArray(allocations)||allocations.length!==11){errors.push("require_11_allocations");return errors;}
  const seen=new Set<string>();let total=0n;
  for(let i=0;i<KEYS.length;i++){
    const a=allocations[i],key=KEYS[i],pct=PCTS[i];
    if(a?.key!==key||seen.has(a?.key)){errors.push("allocation_key_or_order_"+i);continue;}seen.add(key);
    if(a?.percent!==pct||a?.tokens!==String(pct*1000000))errors.push("allocation_amount_"+key);
    total+=BigInt(pct)*1000000n;
    if(a?.recipient!==null&&a?.recipient!==undefined&&!validKey(String(a.recipient)))errors.push("invalid_recipient_"+key);
  }
  if(total!==100000000n)errors.push("supply_not_100m");
  if(body?.execution?.mintEnabled!==false||body?.execution?.transactionBroadcastEnabled!==false)errors.push("execution_must_be_disabled");
  if(body?.custody?.multisigRequired!==false)errors.push("multisig_not_approved");
  return errors;
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method==="GET")return response({ok:true,mode:"preview-only",network:"devnet",mintEnabled:false,transactionBroadcastEnabled:false});
  if(req.method!=="POST")return response({ok:false,error:"method_not_allowed"},405);
  let body:any;try{body=await req.json();}catch{return response({ok:false,error:"invalid_json"},400);}
  const errors=validatePreview(body);
  if(errors.length)return response({ok:false,errors,transactionBroadcastEnabled:false},422);
  let devnetReachable=false,devnetError:string|null=null;
  try{
    const r=await fetch("https://api.devnet.solana.com",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getLatestBlockhash",params:[{commitment:"confirmed"}]}),signal:AbortSignal.timeout(8000)});
    const j=await r.json();devnetReachable=Boolean(r.ok&&j?.result?.value?.blockhash);
    if(!devnetReachable)devnetError="devnet_rpc_unavailable";
  }catch{devnetError="devnet_rpc_unavailable";}
  return response({ok:devnetReachable,validation:"passed",devnetReachable,devnetError,mode:"preview-only",mintEnabled:false,transactionBroadcastEnabled:false,allocations:body.allocations.map((a:any)=>({key:a.key,percent:a.percent,tokens:a.tokens,recipientVerified:false})),warning:"No transactions created or broadcast. Recipient ownership and full signer wallet must be verified separately."},devnetReachable?200:503);
});
