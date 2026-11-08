// Planning-only Worldz genesis V2 policy validator. No RPC, wallet, signing or broadcast.
export const KEYS = ["founding100","devCity","legacyDevelopers","liquidityReserve","communityRewards","treasury","strategicReserve","impact","partnerships","securityContingency","legacyHolders"];
export function validateWorldzGenesisV2(m) {
  const errors=[];
  if(m?.token?.name!=="Worldz"||m?.token?.symbol!=="Worldz")errors.push("wrong_token_identity");
  if(m?.token?.fixedSupply!=="100000000"||m?.token?.decimals!==6)errors.push("wrong_supply_or_decimals");
  if(m?.network!=="solana-mainnet-beta")errors.push("wrong_network");
  if(m?.execution?.mintEnabled!==false||m?.execution?.transactionBroadcastEnabled!==false)errors.push("execution_must_remain_disabled");
  if(m?.custody?.multisigRequired!==false)errors.push("unapproved_multisig_requirement");
  const a=m?.allocations;
  if(!Array.isArray(a)||a.length!==11)errors.push("require_exactly_11_allocations");
  else {
    if(new Set(a.map(x=>x.key)).size!==11||KEYS.some(k=>!a.some(x=>x.key===k)))errors.push("allocation_keys_mismatch");
    let total=0n;
    for(const x of a){
      if(!Number.isInteger(x.percent)||x.percent<0||x.percent>100)errors.push("invalid_percent_"+x.key);
      if(!/^\\d+$/.test(String(x.tokens)))errors.push("invalid_tokens_"+x.key);
      else { const n=BigInt(x.tokens); total+=n; if(n!==BigInt(x.percent)*1000000n)errors.push("allocation_amount_mismatch_"+x.key); }
      if(x.recipient!==null&&typeof x.recipient!=="string")errors.push("invalid_recipient_"+x.key);
    }
    if(a.reduce((s,x)=>s+x.percent,0)!==100||total!==100000000n)errors.push("allocation_total_not_100m");
    const f=a.find(x=>x.key==="founding100");
    if(f?.tokens!=="10000000"||m?.commitments?.founding100?.slots!==100||m?.commitments?.founding100?.tokensPerSlot!=="100000")errors.push("founding100_commitment_mismatch");
  }
  return {ok:errors.length===0,errors};
}
