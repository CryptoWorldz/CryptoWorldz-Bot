(()=>{"use strict";
if(document.querySelector("[data-worldz-newswire-strip]"))return;
const root=document.createElement("section");
root.dataset.worldzNewswireStrip="1";
root.setAttribute("aria-label","Worldz NewsWire latest crypto headlines");
root.innerHTML='<div class="worldz-newswire-label">🗞️ WORLDZ NEWSWIRE™</div><div class="worldz-newswire-track"><div class="worldz-newswire-run">Loading verified source headlines…</div></div><a class="worldz-newswire-open" href="/news/">NEWS →</a>';
const style=document.createElement("style");
style.textContent='.worldz-newswire-strip{display:none}.worldz-newswire-label{flex:0 0 auto;font-size:.62rem;font-weight:1000;letter-spacing:.08em;color:#d7b7ff;padding:0 10px}.worldz-newswire-track{overflow:hidden;white-space:nowrap;flex:1;min-width:0}.worldz-newswire-run{display:inline-block;padding-left:100%;animation:worldzNewswire 48s linear infinite;font-size:.68rem;color:#b6a8bf}.worldz-newswire-run a{color:#d9d0df;text-decoration:none;margin-right:34px}.worldz-newswire-run a:hover{color:#fff}.worldz-newswire-open{flex:0 0 auto;color:#c99aff;text-decoration:none;font-weight:900;font-size:.62rem;padding:0 10px}@keyframes worldzNewswire{to{transform:translateX(-100%)}}[data-worldz-newswire-strip]{min-height:36px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #ffffff0d;background:#07030df2;position:relative;z-index:20}@media(prefers-reduced-motion:reduce){.worldz-newswire-run{animation:none;padding-left:0;overflow:hidden;text-overflow:ellipsis;max-width:100%}}';
document.head.appendChild(style);
const header=document.querySelector("header.topbar");
if(header)header.insertAdjacentElement("afterend",root);else document.body.insertAdjacentElement("afterbegin",root);
const run=root.querySelector(".worldz-newswire-run");
fetch("/newswire.php?_="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{
 const items=(j.items||[]).slice(0,10);
 if(!items.length)throw new Error();
 run.innerHTML=items.map(x=>'<a target="_blank" rel="noopener noreferrer" href="'+String(x.url).replace(/"/g,"&quot;")+'">['+String(x.topic||"CRYPTO")+'] '+String(x.title||"").replace(/[<>&]/g,"")+' • '+String(x.source||"")+'</a>').join("");
}).catch(()=>{run.innerHTML='<a href="/news/">Open Worldz NewsWire™ — source refresh pending</a>';});
})();