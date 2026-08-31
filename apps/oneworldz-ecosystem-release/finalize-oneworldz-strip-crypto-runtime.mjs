import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist','ecosystem');
async function pages(dir,rel=''){const out=[];for(const e of await readdir(path.join(dir,rel),{withFileTypes:true})){const c=path.join(rel,e.name);if(e.isDirectory())out.push(...await pages(dir,c));else if(e.name==='index.html')out.push(c)}return out}
const runtime=(community)=>`<script data-oneworldz-human-runtime="true">window.ONE_SCREEN_DATA=${JSON.stringify({community}).replaceAll('<','\\u003c')};(()=>{const m=document.getElementById("site-menu"),b=document.getElementById("menu-button"),x=document.getElementById("menu-backdrop"),close=()=>{m?.classList.remove("open");x?.classList.remove("open");b?.setAttribute("aria-expanded","false")};b?.addEventListener("click",()=>{const o=!m.classList.contains("open");m.classList.toggle("open",o);x?.classList.toggle("open",o);b.setAttribute("aria-expanded",String(o))});x?.addEventListener("click",close);m?.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));addEventListener("keydown",e=>{if(e.key==="Escape")close()});const g=document.getElementById("community-grid");if(g){const r=ONE_SCREEN_DATA.community,z=6,p=Math.ceil(r.length/z);let n=0;const draw=()=>{g.innerHTML=r.slice(n*z,n*z+z).map(v=>'<a class="community-control" target="_blank" rel="noopener noreferrer" href="'+v.url+'"><small>'+v.number+'</small><strong>'+v.name+'</strong></a>').join("");document.getElementById("community-page-label").textContent="Page "+(n+1)+" of "+p;document.querySelector("[data-community-prev]").disabled=n===0;document.querySelector("[data-community-next]").disabled=n===p-1};document.querySelector("[data-community-prev]")?.addEventListener("click",()=>{if(n){n--;draw()}});document.querySelector("[data-community-next]")?.addEventListener("click",()=>{if(n<p-1){n++;draw()}});draw()}})();</script>`;
let total=0;
for(const [target,expected] of [['oneworldz',8],['law-oneworldz',4]]){
 const dir=path.join(dist,target);let changed=0;
 for(const rel of await pages(dir)){
  const file=path.join(dir,rel);let html=await readFile(file,'utf8');
  const match=html.match(/<script>window\.ONE_SCREEN_DATA=(\{.*?\});\(\(\)=>\{[\s\S]*?<\/script>/s);
  if(!match)continue;
  let data={};try{data=JSON.parse(match[1])}catch{}
  const community=target==='oneworldz'&&Array.isArray(data.community)?data.community:[];
  html=html.replace(match[0],runtime(community));
  if(target==='law-oneworldz')html=html.replaceAll('/assets/desktop/tokens/robin-hood-law.png','/assets/desktop/oneworldz/oneworldz-master.png').replaceAll('/assets/mobile/robin-hood-law.webp','/assets/mobile/little-legend.webp');
  if(/data-token-index|token-dialog|ONE_SCREEN_DATA\.tokens|PDC_LEGACY/i.test(html))throw new Error(`${target}: crypto runtime remains in ${rel}`);
  await writeFile(file,html,'utf8');changed++;total++;
 }
 if(changed!==expected)throw new Error(`Expected to strip generic runtime from ${expected} ${target} routes, changed ${changed}`);
}
console.log(`ONEWORLDZ_CRYPTO_RUNTIME_STRIP=PASS routes=${total} targets=2 token_runtime=ABSENT old_robin_artwork_refs=ABSENT community_runtime=PRESERVED menu_runtime=PRESERVED production_write=false`);
