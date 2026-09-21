import React,{useEffect} from 'https://esm.sh/react@18.3.1?bundle';
import {createRoot} from 'https://esm.sh/react-dom@18.3.1/client?bundle&deps=react@18.3.1';
import {useWrappedReownAdapter} from 'https://esm.sh/@jup-ag/jup-mobile-adapter@0.0.2?bundle&deps=react@18.3.1,react-dom@18.3.1,@reown/appkit@1.8.11,@reown/appkit-adapter-solana@1.8.11,@reown/appkit-wallet-button@1.8.11,@solana/wallet-adapter-base@0.9.24,@solana/web3.js@1.98.4';

const REOWN_PROJECT_ID='e3d5fc46a07eb8ecb162ee048625348e';
const WORLDZ_ORIGIN='https://launchpad.cryptoworldz.xyz';

let settled=false;
let resolveAdapter,rejectAdapter;
const adapterPromise=new Promise((resolve,reject)=>{resolveAdapter=resolve;rejectAdapter=reject;});

function JupiterMobileBridge(){
  const {jupiterAdapter}=useWrappedReownAdapter({
    appKitOptions:{
      metadata:{
        name:'WorldzLaunchPad',
        description:'WorldzLaunchPad™ • WorldzMINT™',
        url:WORLDZ_ORIGIN,
        icons:[]
      },
      projectId:REOWN_PROJECT_ID,
      features:{
        analytics:false,
        socials:[],
        email:false
      },
      enableWallets:false,
      themeMode:'dark'
    }
  });

  useEffect(()=>{
    if(jupiterAdapter&&!settled){
      settled=true;
      window.__WORLDZ_JUPITER_MOBILE_ADAPTER__=jupiterAdapter;
      window.dispatchEvent(new CustomEvent('worldz:jupiter-mobile-ready'));
      resolveAdapter(jupiterAdapter);
    }
  },[jupiterAdapter]);

  return null;
}

function mount(){
  try{
    let host=document.getElementById('worldz-jupiter-mobile-bridge');
    if(!host){
      host=document.createElement('div');
      host.id='worldz-jupiter-mobile-bridge';
      host.hidden=true;
      host.setAttribute('aria-hidden','true');
      document.body.appendChild(host);
    }
    createRoot(host).render(React.createElement(JupiterMobileBridge));
  }catch(error){
    if(!settled){
      settled=true;
      rejectAdapter(error);
    }
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();

export async function getJupiterMobileAdapter(){
  if(window.__WORLDZ_JUPITER_MOBILE_ADAPTER__)return window.__WORLDZ_JUPITER_MOBILE_ADAPTER__;
  const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Jupiter Mobile bridge did not initialise. Reload WorldzMINT and try again.')),15000));
  return Promise.race([adapterPromise,timeout]);
}

export const worldzJupiterMobileConfig=Object.freeze({
  provider:'Jupiter Mobile via Reown AppKit',
  projectId:REOWN_PROJECT_ID,
  origin:WORLDZ_ORIGIN,
  adapterPackage:'@jup-ag/jup-mobile-adapter@0.0.2'
});
