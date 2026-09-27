(function(){
  "use strict";
  const SESSION_KEY="worldzapp.publicSession.v1";
  const now=()=>new Date().toISOString();
  const newId=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():"wz-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  function emptySession(){return{schema:"WORLDZ-APP-SESSION-V1",sessionId:newId(),createdAt:now(),expiresAt:null,publicIdentity:null,permissions:["read_public_state","connect_external_wallet"],walletConnections:[]}}
  function loadSession(){
    try{
      const parsed=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
      if(parsed&&parsed.schema==="WORLDZ-APP-SESSION-V1"&&Array.isArray(parsed.walletConnections)) return parsed;
    }catch(_){}
    const session=emptySession(); saveSession(session); return session;
  }
  function saveSession(session){sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));return session}
  function upsert(connection){
    const session=loadSession();
    session.walletConnections=session.walletConnections.filter(item=>!(item.chain===connection.chain&&item.provider===connection.provider));
    session.walletConnections.push(connection); saveSession(session); return session;
  }
  function remove(chain,provider){
    const session=loadSession();
    session.walletConnections=session.walletConnections.filter(item=>!(item.chain===chain&&item.provider===provider));
    saveSession(session); return session;
  }
  function solanaProvider(){return window.solana&&typeof window.solana.connect==="function"?window.solana:null}
  function evmProvider(){return window.ethereum&&typeof window.ethereum.request==="function"?window.ethereum:null}
  async function connectSolana(){
    const provider=solanaProvider();
    if(!provider) throw new Error("No injected Solana wallet detected on this device/browser.");
    const response=await provider.connect();
    const address=String(response&&response.publicKey?response.publicKey:provider.publicKey||"");
    if(!address) throw new Error("Solana wallet connected without a readable public address.");
    const connection={chain:"solana",publicAddress:address,provider:provider.isPhantom?"Phantom":provider.isSolflare?"Solflare":"Injected Solana Wallet",connectionState:"CONNECTED",persistedByConsent:false,network:null,observedAt:now()};
    upsert(connection); return connection;
  }
  async function connectEvm(){
    const provider=evmProvider();
    if(!provider) throw new Error("No EIP-1193 wallet detected on this device/browser.");
    const accounts=await provider.request({method:"eth_requestAccounts"});
    const address=String(accounts&&accounts[0]||"");
    if(!address) throw new Error("EVM wallet connected without a readable public address.");
    const chainId=await provider.request({method:"eth_chainId"});
    const connection={chain:"evm",publicAddress:address,provider:"EIP-1193 Wallet",connectionState:"CONNECTED",persistedByConsent:false,network:String(chainId||""),observedAt:now()};
    upsert(connection); return connection;
  }
  async function disconnect(chain,providerLabel){
    if(chain==="solana"){
      const provider=solanaProvider();
      if(provider&&typeof provider.disconnect==="function"){try{await provider.disconnect()}catch(_){}}
    }
    return remove(chain,providerLabel);
  }
  function detected(){return{solana:Boolean(solanaProvider()),evm:Boolean(evmProvider())}}
  window.WorldzWalletConnect=Object.freeze({loadSession,connectSolana,connectEvm,disconnect,detected});
})();
