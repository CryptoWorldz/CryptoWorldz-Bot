(function(){
  "use strict";
  const STORAGE_KEY="worldzapp.session.v1";
  const evmProviders=new Map();

  function safeSessionStorage(){
    try{return window.sessionStorage}catch{return null}
  }

  function createSession(){
    const existing=loadSession();
    if(existing) return existing;
    const session={
      schema:"WORLDZ-APP-BROWSER-SESSION-V1",
      sessionId:(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2),
      createdAt:new Date().toISOString(),
      identityState:"GUEST",
      walletConnections:[]
    };
    saveSession(session);
    return session;
  }

  function loadSession(){
    const storage=safeSessionStorage();
    if(!storage) return null;
    try{
      const parsed=JSON.parse(storage.getItem(STORAGE_KEY)||"null");
      return parsed&&parsed.schema==="WORLDZ-APP-BROWSER-SESSION-V1"?parsed:null;
    }catch{return null}
  }

  function saveSession(session){
    const storage=safeSessionStorage();
    if(storage) storage.setItem(STORAGE_KEY,JSON.stringify(session));
    return session;
  }

  function recordConnection(connection){
    const session=createSession();
    const clean={
      chain:String(connection.chain||"").toLowerCase(),
      publicAddress:String(connection.publicAddress||""),
      provider:String(connection.provider||"External wallet").slice(0,120),
      connectionState:"CONNECTED_UNVERIFIED_CONTROL",
      controlProof:"NONE",
      treasurySignerAuthority:false,
      persistedByConsent:false,
      connectedAt:new Date().toISOString()
    };
    session.walletConnections=(session.walletConnections||[]).filter(item=>
      !(item.chain===clean.chain&&item.publicAddress===clean.publicAddress)
    );
    session.walletConnections.push(clean);
    saveSession(session);
    window.dispatchEvent(new CustomEvent("worldzapp:sessionChanged",{detail:{session}}));
    return clean;
  }

  function handleEip6963(event){
    const detail=event&&event.detail;
    if(!detail?.provider||!detail?.info?.uuid) return;
    evmProviders.set(detail.info.uuid,Object.freeze({
      info:{
        uuid:String(detail.info.uuid),
        name:String(detail.info.name||"EVM Wallet"),
        rdns:String(detail.info.rdns||"")
      },
      provider:detail.provider
    }));
    window.dispatchEvent(new CustomEvent("worldzapp:walletProvidersChanged"));
  }

  function startEvmDiscovery(){
    window.addEventListener("eip6963:announceProvider",handleEip6963);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    if(evmProviders.size===0&&window.ethereum?.request){
      evmProviders.set("legacy-window-ethereum",Object.freeze({
        info:{uuid:"legacy-window-ethereum",name:"Legacy EVM Provider",rdns:""},
        provider:window.ethereum
      }));
    }
    return listEvmProviders();
  }

  function listEvmProviders(){
    return [...evmProviders.values()].map(item=>({info:item.info}));
  }

  async function connectEvmProvider(uuid){
    const entry=evmProviders.get(uuid);
    if(!entry) throw new Error("WORLDZAPP_EVM_PROVIDER_NOT_FOUND");
    const accounts=await entry.provider.request({method:"eth_requestAccounts"});
    const chainId=await entry.provider.request({method:"eth_chainId"});
    const address=Array.isArray(accounts)?accounts[0]:null;
    if(!address) throw new Error("WORLDZAPP_EVM_ACCOUNT_NOT_RETURNED");
    return recordConnection({
      chain:"evm:"+String(chainId),
      publicAddress:String(address),
      provider:entry.info.name
    });
  }

  async function connectSolanaInjectedFallback(){
    const provider=window.solana;
    if(!provider||typeof provider.connect!=="function") throw new Error("WORLDZAPP_SOLANA_INJECTED_PROVIDER_NOT_FOUND");
    const result=await provider.connect();
    const address=result?.publicKey?.toString?.()||provider.publicKey?.toString?.();
    if(!address) throw new Error("WORLDZAPP_SOLANA_ACCOUNT_NOT_RETURNED");
    return recordConnection({
      chain:"solana",
      publicAddress:address,
      provider:provider.isPhantom?"Phantom / injected fallback":"Solana injected fallback"
    });
  }

  function forgetSession(){
    safeSessionStorage()?.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("worldzapp:sessionChanged",{detail:{session:null}}));
  }

  window.WorldzWalletConnections=Object.freeze({
    createSession,loadSession,forgetSession,startEvmDiscovery,listEvmProviders,
    connectEvmProvider,connectSolanaInjectedFallback
  });
})();