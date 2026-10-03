(() => {
  const API="https://cryptobotz.cryptoworldz.xyz/api/public/squads";
  const board=document.getElementById("squad-board");
  if(!board)return;
  let period="1M";
  const esc=(v)=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const money=(v)=>{const n=Number(v)||0;return `${n>=0?"+":"-"}$${Math.abs(n).toFixed(2)}`;};
  async function load(){
    board.innerHTML='<div class="card">Loading Worldz Squads…</div>';
    try{
      const res=await fetch(`${API}?period=${encodeURIComponent(period)}`,{headers:{Accept:"application/json"}});
      const data=await res.json();
      if(!res.ok||!data.ok)throw new Error(data.error||"unavailable");
      board.innerHTML=(data.squads||[]).map((s,i)=>`<article class="card"><small>#${i+1} • ${esc(period)}</small><h2>${esc(s.name)}</h2><div class="pnl">${money(s.pnl_usd)}</div><div class="meta"><span>${Number(s.members)||0} members</span><span>${Number(s.points)||0} LP</span><span>${Number(s.raids)||0} Raids</span><span>${Number(s.shills)||0} Shills</span></div><div class="members">${(s.member_rows||[]).slice(0,5).map((m,j)=>`<div class="member"><span>#${j+1} ${esc(m.display_name)}</span><span>${money(m.pnl_usd)} <small>• ${Number(m.points)||0} LP</small></span></div>`).join("")}</div></article>`).join("")||'<div class="card">No Worldz Squads yet.</div>';
    }catch(error){board.innerHTML=`<div class="card">Squad leaderboard unavailable: ${esc(error.message)}</div>`;}
  }
  document.addEventListener("click",(e)=>{const btn=e.target.closest("[data-period]");if(!btn)return;period=btn.dataset.period;document.querySelectorAll("[data-period]").forEach(x=>x.classList.toggle("active",x===btn));load();});
  const params=new URLSearchParams(location.search);if(["1D","1W","1M"].includes(String(params.get("period")||"").toUpperCase()))period=String(params.get("period")).toUpperCase();
  load();
})();