import { createAppKit, SolanaAdapter, networks } from 'https://cdn.jsdelivr.net/npm/@reown/appkit-cdn@1.8.24/dist/appkit.js';
const { solana } = networks;

const REOWN_PROJECT_ID='e3d5fc46a07eb8ecb162ee048625348e';
const WORLDZ_ORIGIN='https://launchpad.cryptoworldz.xyz';

const solanaAdapter=new SolanaAdapter({});
const modal=createAppKit({
  adapters:[solanaAdapter],
  networks:[solana],
  projectId:REOWN_PROJECT_ID,
  metadata:{
    name:'WorldzLaunchPad',
    description:'WorldzLaunchPad™ • Worldz OneDrop™',
    url:WORLDZ_ORIGIN,
    icons:[]
  },
  features:{
    analytics:false,
    socials:[],
    email:false
  },
  enableWallets:false,
  themeMode:'dark'
});

let accountState={};
let solanaProvider=null;

modal.subscribeAccount(state=>{
  accountState=state||{};
});
modal.subscribeProviders(state=>{
  solanaProvider=state?.solana||null;
});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitUntilConnected(timeoutMs=120000){
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    const address=accountState?.address||solanaProvider?.publicKey?.toString?.();
    if(address&&solanaProvider&&typeof solanaProvider.signTransaction==='function'){
      return String(address);
    }
    await sleep(250);
  }
  throw new Error('Wallet connection did not complete. Choose Jupiter Mobile in the wallet window and approve the connection.');
}

const adapter={
  name:'Worldz OneDrop Mobile Wallet',
  get publicKey(){
    return accountState?.address||solanaProvider?.publicKey||null;
  },
  async connect(){
    const existing=accountState?.address||solanaProvider?.publicKey?.toString?.();
    if(existing&&solanaProvider){
      return {publicKey:String(existing)};
    }
    await modal.open();
    const address=await waitUntilConnected();
    try{modal.close();}catch{}
    return {publicKey:address};
  },
  async signTransaction(transaction){
    if(!solanaProvider||typeof solanaProvider.signTransaction!=='function'){
      throw new Error('Solana wallet provider is not connected.');
    }
    return await solanaProvider.signTransaction(transaction);
  },
  async disconnect(){
    await modal.disconnect();
    solanaProvider=null;
    accountState={};
  }
};

window.__WORLDZ_JUPITER_MOBILE_ADAPTER__=adapter;
window.dispatchEvent(new CustomEvent('worldz:jupiter-mobile-ready'));

export function resetJupiterMobileConnectionState(){
  try{
    const state=window.localStorage.getItem('@appkit/connection_status');
    if(state==='connecting'){
      window.localStorage.removeItem('@appkit/connection_status');
    }
  }catch{}
}

export async function getJupiterMobileAdapter(){
  return adapter;
}

export const worldzJupiterMobileConfig=Object.freeze({
  provider:'Reown AppKit CDN Vanilla Solana',
  projectId:REOWN_PROJECT_ID,
  origin:WORLDZ_ORIGIN,
  appKitVersion:'1.8.24',
  react:false
});
