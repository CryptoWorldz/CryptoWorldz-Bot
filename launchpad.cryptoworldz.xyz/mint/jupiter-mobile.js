// The calling page's import map unifies Reown's React 19.0 and Jupiter's
// React 19.1 onto one copy. Separate copies break hooks at runtime.
import React,{useEffect} from 'https://cdn.jsdelivr.net/npm/react@19.1.0/+esm';
import {createRoot} from 'https://cdn.jsdelivr.net/npm/react-dom@19.1.0/client/+esm';
import {useWrappedReownAdapter} from 'https://cdn.jsdelivr.net/npm/@jup-ag/jup-mobile-adapter@0.0.2/+esm';

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

try{
  if(window.localStorage.getItem('@appkit/connection_status')==='connecting'){
    window.localStorage.removeItem('@appkit/connection_status');
  }
}catch{}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();

export function resetJupiterMobileConnectionState(){
  try{
    const state=window.localStorage.getItem('@appkit/connection_status');
    if(state==='connecting'||state==='connected'){
      window.localStorage.removeItem('@appkit/connection_status');
    }
  }catch{}
}

export async function getJupiterMobileAdapter(){
  if(window.__WORLDZ_JUPITER_MOBILE_ADAPTER__)return window.__WORLDZ_JUPITER_MOBILE_ADAPTER__;
  const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Jupiter Mobile bridge did not initialise. Reload WorldzMINT and try again.')),15000));
  return Promise.race([adapterPromise,timeout]);
}

export const worldzJupiterMobileConfig=Object.freeze({
  provider:'Jupiter Mobile via Reown AppKit',
  projectId:REOWN_PROJECT_ID,
  origin:WORLDZ_ORIGIN,
  adapterPackage:'@jup-ag/jup-mobile-adapter@0.0.2',
  browserModuleProvider:'jsDelivr +esm',
  reactVersion:'19.1.0'
});
