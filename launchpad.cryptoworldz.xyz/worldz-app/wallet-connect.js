(function(){
  "use strict";
  const SESSION_KEY="worldzapp.publicSession.v1";
  const FORBIDDEN_ADAPTER_METHODS=new Set(["sign","signMessage","signTransaction","signAndSendTransaction","sendTransaction","broadcast","bridge","swap","stake","changeSigner","requestSeedPhrase","requestPrivateKey","exportPrivateKey"]);
  const ALLOWED_ADAPTER_METHODS=new Set(["detect","connect","getPublicAddress","getNetwork","disconnect"]);
  const externalAdapters=new Map();
  const now=()=>new Date().toISOString();
  const newId=()=>globalThis.crypto&&globalThis.crypto.randomUUID?globalThis.crypto.randomUUID():"wz-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  const forbiddenKey=key=>/(seed|mnemonic|private.?key|recovery|secret|password|unlock|signing.?key|access.?token|refresh.?token|id.?token)/i.test(String(key));
  function hasForbiddenField(value){
    if(value===null||value===undefined)return false;
    if(Array.isArray(value))return value.some(hasForbiddenField);
    if(typeof value==="object")return Object.entries(value).some(([key,item])=>forbiddenKey(key)||hasForbiddenField(item));
    return false;
  }
  function emptySession(){return{schema:"WORLDZ-APP-SESSION-V1",sessionId:newId(),createdAt:now(),expiresAt:null,publicIdentity:null,identityAssertions:[],permissions:["read_public_state","connect_external_wallet"],walletConnections:[]}}
  function loadSession(){
    try{
      const parsed=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
      if(parsed&&parsed.schema==="WORLDZ-APP-SESSION-V1"&&Array.isArray(parsed.walletConnections)&&!hasForbiddenField(parsed)){
        if(!Array.isArray(parsed.identityAssertions))parsed.identityAssertions=[];
        return parsed;
      }
    }catch(_){}
    const session=emptySession();saveSession(session);return session;
  }
  function saveSession(session){
    if(hasForbiddenField(session))throw new Error("WorldzApp public session rejected a secret-shaped field.");
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;
  }
  function upsert(connection){
    const session=loadSession();
    session.walletConnections=session.walletConnections.filter(item=>!(item.chain===connection.chain&&item.provider===connection.provider));
    session.walletConnections.push(connection);saveSession(session);return session;
  }
  function remove(chain,provider){
    const session=loadSession();
    session.walletConnections=session.walletConnections.filter(item=>!(item.chain===chain&&item.provider===provider));
    saveSession(session);return session;
  }
  function solanaProvider(){return window.solana&&typeof window.solana.connect==="function"?window.solana:null}
  function evmProvider(){return window.ethereum&&typeof window.ethereum.request==="function"?window.ethereum:null}
  async function connectSolana(){
    const provider=solanaProvider();
    if(!provider)throw new Error("No injected Solana wallet detected on this device/browser.");
    const response=await provider.connect();
    const address=String(response&&response.publicKey?response.publicKey:provider.publicKey||"");
    if(!address)throw new Error("Solana wallet connected without a readable public address.");
    const connection={connectorId:"solana_injected",chain:"solana",publicAddress:address,provider:provider.isPhantom?"Phantom":provider.isSolflare?"Solflare":"Injected Solana Wallet",connectionState:"CONNECTED",persistedByConsent:false,network:null,observedAt:now()};
    upsert(connection);return connection;
  }
  async function connectEvm(){
    const provider=evmProvider();
    if(!provider)throw new Error("No EIP-1193 wallet detected on this device/browser.");
    const accounts=await provider.request({method:"eth_requestAccounts"});
    const address=String(accounts&&accounts[0]||"");
    if(!address)throw new Error("EVM wallet connected without a readable public address.");
    const chainId=await provider.request({method:"eth_chainId"});
    const connection={connectorId:"evm_eip1193",chain:"evm",publicAddress:address,provider:"EIP-1193 Wallet",connectionState:"CONNECTED",persistedByConsent:false,network:String(chainId||""),observedAt:now()};
    upsert(connection);return connection;
  }
  function validateExternalAdapter(definition){
    if(!definition||typeof definition!=="object")throw new Error("External wallet adapter definition required.");
    const id=String(definition.id||"").trim(),chain=String(definition.chain||"").trim(),provider=String(definition.provider||"").trim();
    if(!id||!chain||!provider)throw new Error("External wallet adapter requires id, chain and provider.");
    const adapter=definition.adapter;
    if(!adapter||typeof adapter!=="object")throw new Error("External wallet adapter methods required.");
    for(const [key,value] of Object.entries(adapter)){
      if(FORBIDDEN_ADAPTER_METHODS.has(key))throw new Error("Forbidden wallet adapter method: "+key);
      if(!ALLOWED_ADAPTER_METHODS.has(key))throw new Error("Unknown wallet adapter method: "+key);
      if(typeof value!=="function")throw new Error("Wallet adapter method must be a function: "+key);
    }
    if(typeof adapter.connect!=="function"||typeof adapter.getPublicAddress!=="function")throw new Error("External wallet adapter requires connection and public-address methods.");
    return{id,chain,provider,adapter};
  }
  function registerExternalConnector(definition){
    const record=validateExternalAdapter(definition);
    externalAdapters.set(record.id,Object.freeze(record));
    return Object.freeze({id:record.id,chain:record.chain,provider:record.provider,execution:false,signing:false});
  }
  async function connectExternal(id){
    const record=externalAdapters.get(String(id));
    if(!record)throw new Error("External wallet connector is not configured yet.");
    if(record.adapter.detect&&!(await record.adapter.detect()))throw new Error(record.provider+" is not available on this device/browser.");
    const result=await record.adapter.connect();
    const address=String(await record.adapter.getPublicAddress(result)||"").trim();
    if(!address)throw new Error(record.provider+" connected without a readable public address.");
    const network=record.adapter.getNetwork?String(await record.adapter.getNetwork(result)||""):null;
    const connection={connectorId:record.id,chain:record.chain,publicAddress:address,provider:record.provider,connectionState:"CONNECTED",persistedByConsent:false,network,observedAt:now()};
    upsert(connection);return connection;
  }
  async function disconnect(chain,providerLabel){
    if(chain==="solana"){
      const provider=solanaProvider();
      if(provider&&typeof provider.disconnect==="function"){try{await provider.disconnect()}catch(_){}}
    }
    for(const record of externalAdapters.values()){
      if(record.chain===chain&&record.provider===providerLabel&&record.adapter.disconnect){try{await record.adapter.disconnect()}catch(_){}}
    }
    return remove(chain,providerLabel);
  }
  function detected(){
    const external={};
    for(const [id] of externalAdapters.entries())external[id]=true;
    return{solana:Boolean(solanaProvider()),evm:Boolean(evmProvider()),external};
  }
  function connectorState(){return[...externalAdapters.values()].map(item=>({id:item.id,chain:item.chain,provider:item.provider,execution:false,signing:false}))}
  window.WorldzWalletConnect=Object.freeze({loadSession,connectSolana,connectEvm,connectExternal,registerExternalConnector,connectorState,disconnect,detected});
})();
