(function(){
  "use strict";
  const PENDING_KEY="worldzapp.mobileHandoff.pending.v1";
  let policy=null;
  const ephemeral=new Map();
  const randomId=()=>globalThis.crypto&&globalThis.crypto.randomUUID?globalThis.crypto.randomUUID():"handoff-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  function configure(nextPolicy){policy=nextPolicy&&typeof nextPolicy==="object"?nextPolicy:null;return Boolean(policy)}
  function requirePolicy(){if(!policy)throw new Error("Mobile wallet handoff policy has not loaded.");return policy}
  function approvedFirstParty(url){const parsed=new URL(url);return(requirePolicy().firstPartyOrigins||[]).includes(parsed.origin)}
  function providerById(id){const provider=(requirePolicy().providers||[]).find(item=>item.id===id);if(!provider)throw new Error("Unknown mobile wallet provider.");return provider}
  function savePending(record){sessionStorage.setItem(PENDING_KEY,JSON.stringify(record))}
  function loadPending(){try{return JSON.parse(sessionStorage.getItem(PENDING_KEY)||"null")}catch(_){return null}}
  function clearPending(){sessionStorage.removeItem(PENDING_KEY)}
  function prepareHttpsAuthorization({providerId,clientId,redirectUri,responseType="token",scope=null,extraParams={}}={}){
    const provider=providerById(providerId);
    if(!clientId)throw new Error("Provider public client ID is not configured.");
    if(!provider.authorizationEndpoint)throw new Error("Provider authorization endpoint is not configured.");
    const endpoint=new URL(provider.authorizationEndpoint);
    if(provider.authorizationOrigin&&endpoint.origin!==provider.authorizationOrigin)throw new Error("Provider authorization origin mismatch.");
    if(!approvedFirstParty(redirectUri))throw new Error("WorldzApp return origin is not approved.");
    const state=randomId()+randomId();
    endpoint.searchParams.set("client_id",String(clientId));
    endpoint.searchParams.set("redirect_uri",String(redirectUri));
    endpoint.searchParams.set("response_type",String(responseType));
    endpoint.searchParams.set("state",state);
    if(scope)endpoint.searchParams.set("scope",String(scope));
    for(const [key,value] of Object.entries(extraParams||{})){
      if(/token|secret|private|seed|mnemonic|password/i.test(key))throw new Error("Sensitive mobile handoff parameter rejected.");
      endpoint.searchParams.set(key,String(value));
    }
    const pending={providerId,state,redirectUri:String(redirectUri),createdAt:new Date().toISOString()};
    savePending(pending);
    return Object.freeze({providerId,state,launchUrl:endpoint.toString(),returnUrl:String(redirectUri),persistence:"SESSION_STATE_ONLY",execution:false,signing:false});
  }
  function prepareWalletConnectPairing(uri){
    const text=String(uri||"").trim();
    if(!/^wc:/i.test(text))throw new Error("Valid WalletConnect pairing URI required.");
    const id=randomId();
    ephemeral.set(id,text);
    return Object.freeze({id,providerId:"walletconnect_v2",audit:"wc:<ephemeral-pairing-redacted>",persistence:"MEMORY_ONLY",execution:false,signing:false});
  }
  function getEphemeralPairing(id){return ephemeral.get(String(id))||null}
  function consumeAuthorizationCallback(){
    const pending=loadPending();
    if(!pending)return null;
    const query=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.replace(/^#/,""));
    const state=fragment.get("state")||query.get("state");
    if(!state)return null;
    if(state!==pending.state){clearPending();throw new Error("Mobile wallet return state did not match the pending WorldzApp request.");}
    const accessToken=fragment.get("access_token")||query.get("access_token");
    const idToken=fragment.get("id_token")||query.get("id_token");
    const error=fragment.get("error")||query.get("error");
    const clean=new URL(location.href);clean.hash="";["access_token","id_token","refresh_token","state","token_type","expires_in","error","error_description"].forEach(key=>clean.searchParams.delete(key));
    history.replaceState({},document.title,clean.pathname+clean.search+clean.hash);
    clearPending();
    return Object.freeze({providerId:pending.providerId,accessToken:accessToken||null,idToken:idToken||null,error:error||null,persistence:"MEMORY_ONLY"});
  }
  function launch(intent){
    if(!intent||!intent.launchUrl)throw new Error("Prepared mobile wallet handoff required.");
    const target=new URL(intent.launchUrl);
    const provider=providerById(intent.providerId);
    if(provider.authorizationOrigin&&target.origin!==provider.authorizationOrigin)throw new Error("Mobile wallet handoff origin rejected.");
    location.assign(target.toString());
  }
  window.WorldzMobileHandoff=Object.freeze({configure,prepareHttpsAuthorization,prepareWalletConnectPairing,getEphemeralPairing,consumeAuthorizationCallback,launch,clearPending});
})();
