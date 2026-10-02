export const REX_SIGNAL_IDS = Object.freeze([
  'MINT_AUTHORITY','FREEZE_AUTHORITY','LP_PROTECTION','HOLDER_CONCENTRATION',
  'RELATED_WALLETS','BUNDLED_ACTIVITY','SNIPER_ACTIVITY','CREATOR_SELLING',
  'DUPLICATE_METADATA','MALICIOUS_LINKS'
]);

function signal(id,status,explanation,observedValue=null,evidence=[]){
  return {id,status,evidence:[...evidence],observedValue,explanation};
}

export function buildRexTokenIntelligence(input={}){
  const evidence=input.evidence||{};
  const signals=[];
  const authority=(id,key,label)=>{
    const v=evidence[key];
    if(v===false||v===null)signals.push(signal(id,'EVIDENCE_PRESENT',label+' is absent/revoked.',v,evidence[key+'Refs']||[]));
    else if(v===true)signals.push(signal(id,'REVIEW_REQUIRED',label+' remains active.',v,evidence[key+'Refs']||[]));
    else signals.push(signal(id,'UNKNOWN',label+' state has not been independently established.',null,[]));
  };
  authority('MINT_AUTHORITY','mintAuthorityActive','Mint authority');
  authority('FREEZE_AUTHORITY','freezeAuthorityActive','Freeze authority');

  if(evidence.lpPermanentLock===true||evidence.lpNonCustodialProtection===true){
    signals.push(signal('LP_PROTECTION','EVIDENCE_PRESENT','Liquidity protection evidence is present.',evidence.lpLockedPercent??null,evidence.lpProofRefs||[]));
  }else if(evidence.lpPermanentLock===false){
    signals.push(signal('LP_PROTECTION','REVIEW_REQUIRED','Permanent or equivalent liquidity protection is not evidenced.',evidence.lpLockedPercent??null,evidence.lpProofRefs||[]));
  }else signals.push(signal('LP_PROTECTION','UNKNOWN','Liquidity protection has not been independently established.',null,[]));

  const concentration=Number(evidence.top10HolderPercent);
  if(Number.isFinite(concentration)){
    signals.push(signal('HOLDER_CONCENTRATION',concentration>50?'REVIEW_REQUIRED':'EVIDENCE_PRESENT','Top-10 holder concentration is shown as a separate fact, not a safety score.',concentration,evidence.holderRefs||[]));
  }else signals.push(signal('HOLDER_CONCENTRATION','UNKNOWN','Holder concentration data is unavailable.',null,[]));

  for(const [id,key,label] of [
    ['RELATED_WALLETS','relatedWalletPattern','Related-wallet pattern'],
    ['BUNDLED_ACTIVITY','bundledActivity','Bundled activity'],
    ['SNIPER_ACTIVITY','sniperActivity','Sniper activity'],
    ['CREATOR_SELLING','creatorSelling','Creator selling'],
    ['DUPLICATE_METADATA','duplicateMetadata','Duplicate metadata']
  ]){
    const v=evidence[key];
    if(v===true)signals.push(signal(id,'REVIEW_REQUIRED',label+' evidence is present.',true,evidence[key+'Refs']||[]));
    else if(v===false)signals.push(signal(id,'EVIDENCE_PRESENT','No '+label.toLowerCase()+' was found in the supplied evidence.',false,evidence[key+'Refs']||[]));
    else signals.push(signal(id,'UNKNOWN',label+' has not been independently established.',null,[]));
  }

  const malicious=evidence.maliciousLinks;
  if(malicious===true)signals.push(signal('MALICIOUS_LINKS','BLOCK','A malicious-link indicator is present. Do not follow the flagged destination.',true,evidence.maliciousLinksRefs||[]));
  else if(malicious===false)signals.push(signal('MALICIOUS_LINKS','EVIDENCE_PRESENT','No malicious-link indicator was found in the supplied evidence.',false,evidence.maliciousLinksRefs||[]));
  else signals.push(signal('MALICIOUS_LINKS','UNKNOWN','Link reputation has not been independently established.',null,[]));

  return {
    version:'REX-TOKEN-INTELLIGENCE-V1',
    chain:String(input.chain||'unknown'),
    tokenId:String(input.tokenId||'unknown'),
    signals,
    overallSafetyRating:null,
    rule:'REX shows separate evidence signals and never converts them into an unsupported overall SAFE score.',
    checkedAt:input.checkedAt||new Date().toISOString()
  };
}
