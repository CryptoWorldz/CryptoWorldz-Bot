(() => {
  'use strict';
  const ENDPOINT='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/spam2ham-solana-scan';
  const form=document.getElementById('coinScanForm');
  if(!form)return;
  const input=document.getElementById('coinWallet');
  const status=document.getElementById('coinScanStatus');
  const summary=document.getElementById('coinScanSummary');
  const results=document.getElementById('coinScanResults');
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const short=(v)=>v&&v.length>18?v.slice(0,7)+'…'+v.slice(-7):v;
  const num=(v,d=6)=>Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumFractionDigits:d}):'—';
  const lanes={
    EMPTY_ACCOUNT:{label:'EMPTY • CLOSE CANDIDATE',cls:'good'},
    SALVAGE_REVIEW:{label:'MARKET ROUTE • REVIEW',cls:'market'},
    KNOWN_REVIEW:{label:'VERIFIED • KEEP / REVIEW',cls:'known'},
    KEEP_REVIEW:{label:'KEEP / REVIEW',cls:'known'},
    UNKNOWN:{label:'UNKNOWN • IGNORE FIRST',cls:'warn'}
  };
  function signal(asset){
    const parts=[];
    if(asset.verified)parts.push('Jupiter verified');
    if(asset.organicScoreLabel)parts.push('organic: '+asset.organicScoreLabel);
    if(asset.liquidityUsd!==null)parts.push('$'+num(asset.liquidityUsd,2)+' liquidity signal');
    if(asset.program==='Token-2022')parts.push('Token-2022');
    return parts.length?parts.join(' • '):'No trusted market signal found in this scan';
  }
  function assetCard(asset){
    const lane=lanes[asset.classification?.lane]||lanes.UNKNOWN;
    const empty=asset.classification?.canClosePreview;
    return `<article class="coin-result ${lane.cls}">
      <div class="coin-result-head">
        <div><span class="coin-lane">${esc(lane.label)}</span><h3>${esc(asset.name)} <small>${esc(asset.symbol)}</small></h3></div>
        <strong>${esc(asset.uiAmount)}</strong>
      </div>
      <div class="coin-facts">
        <span><b>Mint</b>${esc(short(asset.mint))}</span>
        <span><b>Program</b>${esc(asset.program)}</span>
        <span><b>Token account</b>${esc(short(asset.tokenAccount))}</span>
        <span><b>Account SOL</b>${num(asset.accountLamportsSol,9)}</span>
      </div>
      <p>${esc(asset.classification?.reason||'Review before interacting.')}</p>
      <p class="coin-signal">${esc(signal(asset))}</p>
      ${asset.classification?.advancedCheckRequired?'<div class="coin-warning">Token-2022: extension inspection is REQUIRED before any burn, close or swap is built.</div>':''}
      ${empty?'<div class="coin-good">Zero balance detected. This is a read-only close candidate — actual recoverable SOL is confirmed only after a safe close simulation and transaction.</div>':''}
    </article>`;
  }
  function render(data){
    const s=data.summary||{};
    summary.hidden=false;
    summary.innerHTML=`
      <div class="coin-stat"><b>${Number(s.total||0)}</b><span>Token accounts scanned</span></div>
      <div class="coin-stat"><b>${Number(s.EMPTY_ACCOUNT||0)}</b><span>Empty close candidates</span></div>
      <div class="coin-stat"><b>${Number(s.SALVAGE_REVIEW||0)}</b><span>Market-route review</span></div>
      <div class="coin-stat"><b>${Number(s.UNKNOWN||0)}</b><span>Unknown / ignore-first</span></div>
      <div class="coin-stat"><b>${num(s.emptyAccountSol||0,9)} SOL</b><span>Lamports sitting in empty candidates*</span></div>`;
    const order={UNKNOWN:0,EMPTY_ACCOUNT:1,SALVAGE_REVIEW:2,KNOWN_REVIEW:3,KEEP_REVIEW:4};
    const assets=[...(data.assets||[])].sort((a,b)=>(order[a.classification?.lane]??9)-(order[b.classification?.lane]??9));
    results.innerHTML=assets.length?assets.map(assetCard).join(''):'<div class="s2h-card"><strong>No SPL / Token-2022 token accounts returned.</strong><span>Nothing was changed. This scanner is read-only.</span></div>';
  }
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const wallet=input.value.trim();
    status.className='coin-status scanning';
    status.textContent='Scanning public Solana token-account data… no signature requested.';
    summary.hidden=true;results.innerHTML='';
    form.querySelector('button').disabled=true;
    try{
      const response=await fetch(ENDPOINT,{
        method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({wallet})
      });
      const data=await response.json().catch(()=>({ok:false,error:'invalid_response'}));
      if(!response.ok||!data.ok)throw new Error(data.error||'scan_failed');
      render(data);
      status.className='coin-status ready';
      status.textContent='Read-only scan complete ✅ Nothing was signed, moved, burned, swapped or stored.';
    }catch(error){
      status.className='coin-status error';
      status.textContent=error.message==='invalid_solana_wallet'
        ?'That does not look like a valid Solana public wallet address.'
        :'Scanner unavailable right now: '+String(error.message||'scan_failed');
    }finally{form.querySelector('button').disabled=false;}
  });
})();