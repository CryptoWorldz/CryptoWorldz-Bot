import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";
import { links, pdcTokens, worldz } from "./site-data.mjs";

const root=path.dirname(fileURLToPath(import.meta.url));
const src=path.join(root,"source");
const srcAssets=path.join(src,"assets");
const dist=path.join(root,"dist","ecosystem");
const cssSrc=path.join(src,"visual-fit-final.css");
const hash=b=>createHash("sha256").update(b).digest("hex");
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const canon=(d,r="")=>r?`https://${d}/${String(r).replace(/^\/+|\/+$/g,"")}/`:`https://${d}/`;
const local=(r="")=>r?`/${String(r).replace(/^\/+|\/+$/g,"")}/`:"/";
const a=(label,href,primary=false)=>({label,href,primary,external:/^https?:\/\//.test(href)});
const s=(route,label,title,asset,actions=[],opt={})=>({route,label,title,asset,mobile:opt.mobile||asset,actions,kind:opt.kind||"standard",eyebrow:opt.eyebrow||label,copy:opt.copy||"",compact:!!opt.compact});

const A={
 one:"desktop/oneworldz/oneworldz-master.png",legend:"desktop/oneworldz/little-legend.png",gpt:"desktop/oneworldz/oneworldz-gpt.png",reagan:"desktop/oneworldz/reagan-kauja.png",
 command:"desktop/cryptoworldz/zed-command-centre.png",five:"desktop/cryptoworldz/command-centre-five.png",leaders:"desktop/cryptoworldz/command-centre-leader-team.png",impact:"desktop/cryptoworldz/impactbased.png",need:"desktop/cryptoworldz/we-need-you.png",auto:"desktop/cryptoworldz/zed-auto.png",
 action:"desktop/purple-diamond-crew/action-team.png",pdc:"desktop/purple-diamond-crew/banner.png",chest:"desktop/purple-diamond-crew/hope-chest.png",chestM:"mobile/hope-chest.webp",
 law:"desktop/tokens/robin-hood-law.png",debt:"desktop/tokens/recover-your-debt.png",gia:"desktop/tokens/global-impact-alliance.png",uganda:"desktop/tokens/uganda-unite.png",
 community:"support/desktop/community-impact-emblem-desktop.webp",jay:"support/desktop/jayjayteamdev-emblem-desktop.webp",reaganSupport:"support/desktop/reagan-children-emblem-desktop.webp",davis:"support/davis-family/davis-family-hero.webp"
};
const chainAsset=k=>k==="hodlerworldz"?"desktop/blockchains/bitworldz.png":`desktop/blockchains/${k}.png`;
const chainMobile=k=>k==="hodlerworldz"?"mobile/bitworldz.webp":`mobile/${k}.webp`;

const registry=JSON.parse(await readFile(path.join(src,"community-support-profiles.json"),"utf8"));
const excluded=new Set(["https://www.facebook.com/share/165Ken5f2Bt/","https://www.facebook.com/share/18BmqfH7MS/","https://www.facebook.com/Reagankauja/","https://www.facebook.com/reagankauja2/"]);
const community=(registry.profiles||[]).filter(x=>!excluded.has(String(x.facebook_url||""))).map((x,i)=>({number:String(i+1).padStart(2,"0"),name:String(x.display_name||"Verified Community Support Link"),url:String(x.facebook_url||"")}));
const target=Object.fromEntries(productionTargets.map(x=>[x.key,x]));
const wd=Object.fromEntries(worldz.map(x=>[x.key,x]));
const specs={};

specs.oneworldz=[
 s("","Home","OneWorldz 🌐 One Vision",A.one,[a("Make the Difference","/make-the-difference/",true),a("Explore Ecosystem","/ecosystem/")],{eyebrow:"ONEWORLDZ • ONE VISION",copy:"One visual doorway into people, impact, technology and action."}),
 s("make-the-difference","Make the Difference","Why can’t I?",A.legend,[a("Community Support","/community-support/",true),a("DonateWorldz",links.donateWorldz)],{copy:"Choose action, support, volunteering or a verified pathway."}),
 s("community-support","Community Support","Community Impact",A.community,[a("DonateWorldz Community Impact",links.communityImpact,true)],{kind:"community",compact:true,copy:"Verified community destinations, paged inside one screen — no endless scroll."}),
 s("heroes","Heroes","Real action deserves recognition.",A.reagan,[a("Open Command Centre",links.protectedMiniApp,true),a("Community Support","/community-support/")],{copy:"Evidence-backed action, human review and visible acknowledgement."}),
 s("sponsor-apply","Sponsor / Apply","Bring skills, support or partnership.",A.need,[a("OneWorldz Telegram","https://t.me/OneWorldzTG",true),a("CryptoWorldz",links.cryptoworldz)],{copy:"Builders, volunteers, sponsors and partners enter through one clear action screen."}),
 s("gpt","OneWorldz GPT","Ask. Learn. Find the right path.",A.gpt,[a("Open OneWorldz GPT","#open-gpt",true),a("Home","/")],{kind:"gpt",copy:"Shared ecosystem guidance. Payments stay on secure DonateWorldz pages."}),
 s("ecosystem","Ecosystem","One ecosystem. Many Worldz.",A.five,[a("CryptoWorldz",links.cryptoworldz,true),a("Purple Diamond Crew",links.purpleDiamondCrew),a("DonateWorldz",links.donateWorldz),a("FoodWorldz",links.foodWorldz),a("LearnWorldz",links.learnWorldz),a("ImpactBased",links.impactBased)],{compact:true,copy:"Open the major destinations directly."}),
 s("acknowledgements","Acknowledgements","OneWorldz Acknowledgements",A.legend,[a("Home","/",true),a("Make the Difference","/make-the-difference/")],{copy:"People, communities, contributors, tools and platforms — acknowledged last, not buried."})
];

specs.cryptoworldz=[
 s("","Home","CryptoWorldz",A.command,[a("Command Centre","/command-centre/",true),a("Worldz","/worldz/")],{mobile:"mobile/blockchain-portal.webp",eyebrow:"ONE WORLD • ONE MISSION",copy:"Crypto headquarters and doorway into the Worldz, ZED and purpose-led ecosystem."}),
 s("command-centre","Command Centre","ZED Command Centre",A.five,[a("Command Centre Ultimate™",links.protectedMiniApp,true),a("@CryptoWorldzBot",links.zed)],{mobile:"mobile/five-leaders-master.webp",copy:"Five system roles. Protected controls stay in the live Command Centre."}),
 s("worldz","Worldz","Choose your World.",A.command,[a("SolWorldz",links.solworldz,true),a("EthWorldz","https://ethworldz.xyz"),a("BaseWorldz","https://baseworldz.xyz"),a("BNBWorldz","https://bnbworldz.xyz"),a("XRPWorldz","https://xrpworldz.xyz"),a("SuiWorldz","https://suiworldz.xyz"),a("HyperWorldz","https://hyperworldz.xyz"),a("RobinWorldz",links.robinworldz),a("HodlerWorldz","https://hodlerworldz.xyz")],{mobile:"mobile/blockchain-portal.webp",compact:true,copy:"Each World keeps its own identity."}),
 s("impactbased","ImpactBased","ImpactBased",A.impact,[a("Open ImpactBased",links.impactBased,true),a("DonateWorldz",links.donateWorldz)],{mobile:"mobile/impactbased-landscape.webp",copy:"Purpose-driven launch and impact pathways."}),
 s("human-impact","Human Impact","Crypto can point back to people.",A.action,[a("DonateWorldz",links.donateWorldz,true),a("Purple Diamond Crew",links.purpleDiamondCrew)],{copy:"Human impact stays separate from trading and token promotion."}),
 s("markets","DEX / Markets","Market view without pretending it is the mission.",A.auto,[a("DEX Screener","https://dexscreener.com/",true),a("Worldz","/worldz/")],{copy:"External market data only. This page does not execute trades."}),
 s("gtp","CryptoWorldz GTP","CryptoWorldz GTP",A.gpt,[a("Open CryptoWorldz GTP","#open-gpt",true),a("Command Centre","/command-centre/")],{kind:"gpt",copy:"The shared OneWorldz intelligence inside CryptoWorldz."}),
 s("acknowledgements","Acknowledgements","CryptoWorldz Acknowledgements",A.leaders,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for builders, communities, tools and contributors."})
];

const chainSpec=(k)=>{
 const d=wd[k],name=target[k].requiredIdentityText,bg=chainAsset(k),m=chainMobile(k),chain=d.chain;
 return [
  s("","Home",name,bg,[a(`Learn ${chain}`,"/learn/",true),a("Impact / DonateWorldz","/impact/")],{mobile:m,eyebrow:`${chain.toUpperCase()} WORLD`,copy:d.purpose}),
  s("learn",`Learn ${chain}`,`${chain} without the noise.`,bg,[a("Projects & Community","/community/",true),a("Home","/")],{mobile:m,copy:"Plain-language education, safety and verified routes."}),
  s("community",k==="baseworldz"||k==="suiworldz"?"Builders & Community":"Projects & Community",`${name} Community`,bg,[a("CryptoWorldz",links.cryptoworldz,true),a("Impact","/impact/")],{mobile:m,copy:d.focus.join(" • ")}),
  s("impact","Impact / DonateWorldz","Helping the People Who Help People.",A.community,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Real-world support stays in separate DonateWorldz pathways."}),
  s("acknowledgements","Acknowledgements",`${name} Acknowledgements`,bg,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{mobile:m,copy:"Recognition for educators, builders, communities and contributors."})
 ];
};
for(const k of ["solworldz","ethworldz","baseworldz","bnbworldz","xrpworldz","suiworldz"]) specs[k]=chainSpec(k);

specs.hyperworldz=[
 s("","Home","HyperWorldz",chainAsset("hyperworldz"),[a("Risk & Safety","/risk/",true),a("Market View","/markets/")],{mobile:chainMobile("hyperworldz"),copy:wd.hyperworldz.purpose}),
 s("risk","Hyperliquid / Risk","Risk before speed.",chainAsset("hyperworldz"),[a("Market View","/markets/",true),a("Home","/")],{mobile:chainMobile("hyperworldz"),copy:"Leverage, liquidation and volatility come before external market links."}),
 s("markets","Market View","External market data.",A.auto,[a("DEX Screener","https://dexscreener.com/",true),a("Impact","/impact/")],{copy:"Education and routing only. No website trade execution."}),
 s("impact","Impact / DonateWorldz","Markets are not the whole world.",A.community,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Open separate real-world support pathways."}),
 s("acknowledgements","Acknowledgements","HyperWorldz Acknowledgements",chainAsset("hyperworldz"),[a("Home","/",true),a("OneWorldz",links.oneworldz)],{mobile:chainMobile("hyperworldz"),copy:"Recognition for educators, builders, communities and contributors."})
];
specs.robinworldz=[
 s("","Home","RobinWorldz",chainAsset("robinworldz"),[a("Robin Hood Chain","/robin-hood-chain/",true),a("RecoverYourDebt","/recover-your-debt/")],{mobile:chainMobile("robinworldz"),copy:wd.robinworldz.purpose}),
 s("robin-hood-chain","Robin Hood Chain","People-first chain ideas.",chainAsset("robinworldz"),[a("RecoverYourDebt","/recover-your-debt/",true),a("Robin Hood Law",links.oneWorldzLaw)],{mobile:chainMobile("robinworldz"),copy:"The chain/community portal stays separate from legal-advice claims."}),
 s("recover-your-debt","RecoverYourDebt","RecoverYourDebt",A.debt,[a("Robin Hood Law",links.oneWorldzLaw,true),a("Impact","/impact/")],{copy:"Community-led recovery project inside RobinWorldz."}),
 s("impact","Impact / DonateWorldz","People first.",A.community,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Connect the mission to separate real-world support pathways."}),
 s("acknowledgements","Acknowledgements","RobinWorldz Acknowledgements",chainAsset("robinworldz"),[a("Home","/",true),a("OneWorldz",links.oneworldz)],{mobile:chainMobile("robinworldz"),copy:"Recognition for communities, contributors and people-first ideas."})
];
specs.hodlerworldz=[
 s("","Home","HodlerWorldz",chainAsset("hodlerworldz"),[a("Long-Term Learning","/learn/",true),a("Risk & Safety","/risk/")],{mobile:chainMobile("hodlerworldz"),copy:wd.hodlerworldz.purpose}),
 s("learn","Long-Term Learning","Time horizon before hype.",chainAsset("hodlerworldz"),[a("Risk & Safety","/risk/",true),a("Impact","/impact/")],{mobile:chainMobile("hodlerworldz"),copy:"Conviction, concentration, diversification and risk."}),
 s("risk","Risk & Safety","Holding is still risk.",A.auto,[a("Home","/",true),a("CryptoWorldz",links.cryptoworldz)],{copy:"No return promises. Verify assets, custody and personal risk."}),
 s("impact","Impact / DonateWorldz","Value can mean more than price.",A.community,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Open separate real-world support pathways."}),
 s("acknowledgements","Acknowledgements","HodlerWorldz Acknowledgements",chainAsset("hodlerworldz"),[a("Home","/",true),a("OneWorldz",links.oneworldz)],{mobile:chainMobile("hodlerworldz"),copy:"Recognition for educators, communities and contributors."})
];

specs.purplediamondcrew=[
 s("","Home","Purple Diamond Crew",A.action,[a("1927 Hope Chest","/legacy-tokens/",true),a("Make the Difference","/make-the-difference/")],{eyebrow:"ON THE GROUND",copy:"Real people turning kindness into practical action."}),
 s("legacy-tokens","1927 Hope Chest","The OneWorldz Hope Chest • 1927",A.chest,[],{mobile:A.chestM,kind:"tokens",compact:true,copy:"Ten genuine legacy tokens. Tap one to reveal its record."}),
 s("make-the-difference","Make the Difference","From legacy to action.",A.pdc,[a("DonateWorldz",links.donateWorldz,true),a("OneWorldz",links.oneworldz)],{copy:"Purple Diamond Crew is legacy history plus people-on-the-ground action."}),
 s("acknowledgements","Acknowledgements","Purple Diamond Crew Acknowledgements",A.pdc,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for the people who showed up and carried the work."})
];
specs.impactbased=[
 s("","Home","ImpactBased",A.impact,[a("Impact Launch Board","/launch-board/",true),a("Real-World Impact","/real-world-impact/")],{mobile:"mobile/impactbased-landscape.webp",copy:"Purpose-driven launch-board ideas connected to real-world impact."}),
 s("launch-board","Impact Launch Board","Launch with purpose.",A.impact,[a("Based.bid",links.basedBid,true),a("Real-World Impact","/real-world-impact/")],{mobile:"mobile/impactbased-landscape.webp",copy:"Purpose-led routing, not a guarantee."}),
 s("real-world-impact","Real-World Impact","Impact stays visible.",A.gia,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Humanitarian support stays separate from project promotion."}),
 s("acknowledgements","Acknowledgements","ImpactBased Acknowledgements",A.impact,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{mobile:"mobile/impactbased-landscape.webp",copy:"Recognition for builders, communities, platforms and contributors."})
];
specs["law-oneworldz"]=[
 s("","Home","Law.OneWorldz",A.law,[a("Robin Hood Law","/robin-hood-law/",true),a("Public Ideas & Resources","/public-ideas/")],{copy:"People-first public ideas and policy discussion — not personal legal advice."}),
 s("robin-hood-law","Robin Hood Law","Robin Hood Law",A.law,[a("RobinWorldz",links.robinworldz,true),a("Public Ideas","/public-ideas/")],{copy:"Public-policy ideas kept separate from RobinWorldz chain/project activity."}),
 s("public-ideas","Public Ideas & Resources","Read. Compare. Question. Verify.",A.law,[a("OneWorldz",links.oneworldz,true),a("Home","/")],{copy:"Public information only; seek qualified advice for personal legal matters."}),
 s("acknowledgements","Acknowledgements","Law.OneWorldz Acknowledgements",A.law,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for contributors, researchers, public resources and communities."})
];
specs["learn-oneworldz"]=[
 s("","Home","LearnWorldz",A.gpt,[a("Learn","/learn/",true),a("Safety","/safety/")],{copy:"Plain-language learning across the OneWorldz ecosystem."}),
 s("learn","Learn","Understand before you act.",A.gpt,[a("Safety","/safety/",true),a("OneWorldz GPT","/gpt/")],{copy:"Learn first, then move to the verified destination that owns the action."}),
 s("safety","Safety","Never hand over the keys.",A.command,[a("OneWorldz GPT","/gpt/",true),a("Home","/")],{copy:"Never share seed phrases, private keys, passwords, recovery codes or API keys."}),
 s("gpt","OneWorldz GPT","Ask the shared OneWorldz GPT.",A.gpt,[a("Open OneWorldz GPT","#open-gpt",true),a("Home","/")],{kind:"gpt",copy:"Navigation, learning and support-pathway guidance."}),
 s("acknowledgements","Acknowledgements","LearnWorldz Acknowledgements",A.legend,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for educators, contributors, references and communities."})
];
specs.hodlergalaxy=[
 s("","Home","HodlerGalaxy",A.five,[a("Worldz Galaxy","/worldz-galaxy/",true),a("Hodler Learning","/hodler-learning/")],{copy:"A visual doorway into the wider Worldz ecosystem."}),
 s("worldz-galaxy","Worldz Galaxy","Many Worldz. One ecosystem.",A.five,[a("CryptoWorldz",links.cryptoworldz,true),a("SolWorldz",links.solworldz),a("RobinWorldz",links.robinworldz),a("OneWorldz",links.oneworldz)],{compact:true,copy:"Open the major Worldz directly."}),
 s("hodler-learning","Hodler Learning","Explore with context, not hype.",A.auto,[a("HodlerWorldz","https://hodlerworldz.xyz",true),a("Home","/")],{copy:"Long-term learning and risk clarity."}),
 s("acknowledgements","Acknowledgements","HodlerGalaxy Acknowledgements",A.five,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for the people and communities connecting the Worldz."})
];
specs.foodworldz=[
 s("","Home","FoodWorldz",A.reaganSupport,[a("Food","/food/",true),a("Clean Water","/clean-water/")],{copy:"Food, clean water and practical support at the front of the mission."}),
 s("food","Food","One meal can change a day.",A.reagan,[a("Reagan & Children",links.reaganChildren,true),a("DonateWorldz",links.donateWorldz)],{copy:"Open separate support pathways for food and essential care."}),
 s("clean-water","Clean Water","Clean water changes everything.",A.uganda,[a("Community Impact",links.communityImpact,true),a("DonateWorldz",links.donateWorldz)],{copy:"Water connects health, school, food security and dignity."}),
 s("donateworldz","DonateWorldz","Choose the exact purpose.",A.community,[a("DonateWorldz",links.donateWorldz,true),a("Home","/")],{copy:"Payments stay separated by purpose."}),
 s("acknowledgements","Acknowledgements","FoodWorldz Acknowledgements",A.reaganSupport,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition for people growing, cooking, carrying and delivering help."})
];
specs.donateworldz=[
 s("","Home","DonateWorldz",A.community,[a("Reagan & Children","/reagan-children/",true),a("Community Impact","/community-impact/"),a("Davis Family","/davis-family/"),a("Support JayJayTeamDev","/support-jayjayteamdev/")],{compact:true,copy:"Choose the exact purpose. Four support pathways stay separate."}),
 s("reagan-children","Reagan & Children","Reagan & Children",A.reaganSupport,[a("Stripe",links.reaganStripe,true),a("Action Spread Smiles Facebook","https://www.facebook.com/Reagankauja/")],{copy:"Dedicated children support with its own Stripe destination."}),
 s("community-impact","Community Impact","Community Impact",A.community,[a("Stripe",links.communityStripe,true)],{kind:"community",compact:true,copy:"Verified community destinations paged inside one screen."}),
 s("davis-family","Davis Family","Davis Family",A.davis,[a("Stripe","https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03",true),a("Mpagi Davis Facebook","https://www.facebook.com/share/165Ken5f2Bt/")],{copy:"Separate family support pathway and Stripe records."}),
 s("support-jayjayteamdev","Support JayJayTeamDev","Support JayJayTeamDev",A.jay,[a("Stripe",links.jayjayStripe,true),a("PayPal",links.jayjayPaypal)],{copy:"Separate from Reagan, Community Impact and Davis Family."}),
 s("acknowledgements","Acknowledgements","DonateWorldz Acknowledgements",A.community,[a("Home","/",true),a("OneWorldz",links.oneworldz)],{copy:"Recognition without mixing support purposes."})
];

for(const k of productionTargets.map(x=>x.key)){if(!specs[k])throw Error(`Missing spec ${k}`);const r=specs[k].map(x=>x.route);if(r[0]!==""||r.at(-1)!=="acknowledgements"||new Set(r).size!==r.length)throw Error(`Bad route order ${k}`)}

async function files(dir,rel=""){const out=[];for(const e of await readdir(path.join(dir,rel),{withFileTypes:true})){if(e.name===".rsync-tmp")continue;const c=path.join(rel,e.name);e.isDirectory()?out.push(...await files(dir,c)):out.push(c.split(path.sep).join("/"))}return out.sort()}
const exists=async f=>!!(await stat(f).catch(()=>null));
async function copyAsset(rootDir,rel){const from=path.join(srcAssets,rel);if(!await exists(from))throw Error(`Missing asset ${rel}`);const to=path.join(rootDir,"assets",rel);await mkdir(path.dirname(to),{recursive:true});await cp(from,to)}
async function removeOld(rootDir,allowed){for(const f of await files(rootDir)){if(!f.endsWith("index.html"))continue;const r=f==="index.html"?"":f.replace(/\/index\.html$/," ").trim();if(r&&!allowed.has(r))await rm(path.join(rootDir,r),{recursive:true,force:true})}}
const menu=(spec,current)=>spec.map((x,i)=>`<a href="${local(x.route)}"${x.route===current?' aria-current="page"':""}${i===spec.length-1?' data-last-page="acknowledgements"':""}>${esc(x.label)}</a>`).join("");
const actions=arr=>arr.length?`<div class="screen-actions">${arr.map((x,i)=>`<a class="glass-button ${x.primary||i===0?"primary":""}" ${x.href==="#open-gpt"?'data-gpt-open href="#open-gpt"':`href="${esc(x.href)}"`}${x.external?' target="_blank" rel="noopener noreferrer"':""}>${esc(x.label)}</a>`).join("")}</div>`:"";
const tokens=()=>`<div class="token-grid">${pdcTokens.map((x,i)=>`<button class="token-control" data-token-index="${i}"><small>Legacy Token</small><strong>${esc(x.name)}</strong><span>${esc(x.number)}</span></button>`).join("")}</div><dialog class="token-dialog" id="token-dialog"><button class="dialog-close" data-dialog-close>×</button><p class="screen-eyebrow">LEGACY TOKEN</p><h2 id="token-name"></h2><dl><div><dt>Chain</dt><dd>Solana</dd></div><div><dt>Contract</dt><dd id="token-address"></dd></div></dl><a class="glass-button primary" id="token-link" target="_blank" rel="noopener noreferrer">Open verified Solscan record</a></dialog>`;
const communityGrid=()=>`<div class="community-grid" id="community-grid"></div><div class="pager"><button data-community-prev>← Previous</button><span id="community-page-label"></span><button data-community-next>Next →</button></div>`;
const data=()=>JSON.stringify({tokens:pdcTokens.map(({name,address,url})=>({name,address,url})),community}).replaceAll("<","\\u003c");
const script=()=>`<script>window.ONE_SCREEN_DATA=${data()};(()=>{const m=document.getElementById("site-menu"),b=document.getElementById("menu-button"),x=document.getElementById("menu-backdrop"),close=()=>{m?.classList.remove("open");x?.classList.remove("open");b?.setAttribute("aria-expanded","false")};b?.addEventListener("click",()=>{const o=!m.classList.contains("open");m.classList.toggle("open",o);x?.classList.toggle("open",o);b.setAttribute("aria-expanded",String(o))});x?.addEventListener("click",close);m?.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));addEventListener("keydown",e=>{if(e.key==="Escape")close()});const d=document.getElementById("token-dialog");document.querySelectorAll("[data-token-index]").forEach(q=>q.addEventListener("click",()=>{const t=ONE_SCREEN_DATA.tokens[+q.dataset.tokenIndex];if(!t||!d)return;document.getElementById("token-name").textContent=t.name;document.getElementById("token-address").textContent=t.address;document.getElementById("token-link").href=t.url;d.showModal()}));document.querySelector("[data-dialog-close]")?.addEventListener("click",()=>d?.close());const g=document.getElementById("community-grid");if(g){const r=ONE_SCREEN_DATA.community,z=6,p=Math.ceil(r.length/z);let n=0;const draw=()=>{g.innerHTML=r.slice(n*z,n*z+z).map(v=>'<a class="community-control" target="_blank" rel="noopener noreferrer" href="'+v.url+'"><small>'+v.number+'</small><strong>'+v.name+'</strong></a>').join("");document.getElementById("community-page-label").textContent="Page "+(n+1)+" of "+p;document.querySelector("[data-community-prev]").disabled=n===0;document.querySelector("[data-community-next]").disabled=n===p-1};document.querySelector("[data-community-prev]")?.addEventListener("click",()=>{if(n){n--;draw()}});document.querySelector("[data-community-next]")?.addEventListener("click",()=>{if(n<p-1){n++;draw()}});draw()}})();</script>`;

function html(t,spec,item){
 const bg=`--screen-bg:url('/assets/${item.asset}');--screen-bg-mobile:url('/assets/${item.mobile}')`;
 const extra=item.kind==="tokens"?tokens():item.kind==="community"?communityGrid():"";
 const gpt=item.kind==="gpt"?'<script src="/assets/js/oneworldz-gpt.js" defer></script>':"";
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#05000f"><title>${esc(item.title)} | ${esc(t.requiredIdentityText)}</title><meta name="description" content="${esc(item.copy)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canon(t.domain,item.route)}"><link rel="stylesheet" href="/assets/css/visual-fit-final.css" data-visual-fit-final="true"></head><body data-visual-fit-target="${t.key}" data-one-screen="true" data-route="${item.route||"home"}"${item.compact?' data-compact="true"':""}><a class="skip-link" href="#main-content">Skip to content</a><header class="screen-header"><a class="screen-brand" href="/"><span class="brand-mark">${esc(t.requiredIdentityText[0])}</span><span><strong>${esc(t.requiredIdentityText)}</strong><small>${esc(item.label)}</small></span></a><button class="screen-menu-button" id="menu-button" aria-expanded="false"><span></span><span></span><span></span><b>Menu</b></button><nav class="screen-menu" id="site-menu">${menu(spec,item.route)}</nav></header><button class="screen-backdrop" id="menu-backdrop" aria-label="Close menu"></button><main id="main-content" class="screen" style="${bg}"><picture class="screen-art" aria-hidden="true"><source media="(max-width:720px)" srcset="/assets/${item.mobile}"><img src="/assets/${item.asset}" alt="" fetchpriority="high"></picture><div class="screen-shade"></div><section class="screen-panel"><p class="screen-eyebrow">${esc(item.eyebrow)}</p><h1>${esc(item.title)}</h1><p class="screen-copy">${esc(item.copy)}</p>${extra}${actions(item.actions)}</section><div class="screen-position">${spec.indexOf(item)+1} / ${spec.length}</div></main>${script()}${gpt}</body></html>`;
}
async function writePage(dir,route,body){const d=route?path.join(dir,route):dir;await mkdir(d,{recursive:true});await writeFile(path.join(d,"index.html"),body,"utf8")}
async function manifest(t,dir,spec){const f=path.join(dir,"release-manifest.json"),m=await exists(f)?JSON.parse(await readFile(f,"utf8")):{};const rec=[];for(const x of await files(dir)){if(x==="release-manifest.json")continue;const b=await readFile(path.join(dir,x));rec.push({path:`/${x}`,bytes:b.byteLength,sha256:hash(b)})}m.generated_at=new Date().toISOString();m.target=t.key;m.live_url=`https://${t.domain}/`;m.files=rec;m.visual_fit_final={authority:"last_build_stage",no_forced_crop:true,no_stretch:true};m.one_screen_architecture={version:"18-domain-one-screen-v1",page_count:spec.length,route_order:spec.map(x=>local(x.route)),home_first:true,acknowledgements_last:true,normal_page_scrolling:false,menu_top_right:true,logo_home_link:true};await writeFile(f,JSON.stringify(m,null,2)+"\n")}
async function build(t){const spec=specs[t.key],dir=path.join(dist,t.key);if(!await exists(dir))throw Error(`Missing built target ${t.key}`);await removeOld(dir,new Set(spec.map(x=>x.route)));await mkdir(path.join(dir,"assets","css"),{recursive:true});await cp(cssSrc,path.join(dir,"assets","css","visual-fit-final.css"));for(const rel of new Set(spec.flatMap(x=>[x.asset,x.mobile])))await copyAsset(dir,rel);for(const item of spec)await writePage(dir,item.route,html(t,spec,item));await writeFile(path.join(dir,"sitemap.xml"),['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...spec.map(x=>`  <url><loc>${canon(t.domain,x.route)}</loc></url>`),'</urlset>',''].join("\n"));await writeFile(path.join(dir,"robots.txt"),`User-agent: *\nAllow: /\nSitemap: https://${t.domain}/sitemap.xml\n`);const tree={key:t.key,host:t.domain,name:t.requiredIdentityText,page_count:spec.length,one_screen_no_scroll:true,home_first:true,acknowledgements_last:true,routes:spec.map((x,i)=>({order:i+1,route:local(x.route),label:x.label,url:canon(t.domain,x.route)}))};await writeFile(path.join(dir,"site-tree.json"),JSON.stringify(tree,null,2)+"\n");await manifest(t,dir,spec);return tree}
const trees=[];for(const t of productionTargets)trees.push(await build(t));
const pages=trees.reduce((n,x)=>n+x.page_count,0),fleet={generated_at:new Date().toISOString(),architecture:"18-domain-one-screen-v1",static_hosts:trees.length,published_webpages:pages,one_screen_no_scroll:true,acknowledgements_last_everywhere:trees.every(x=>x.acknowledgements_last),hosts:trees};
await writeFile(path.join(dist,"user-structure-tree.json"),JSON.stringify(fleet,null,2)+"\n");
const fm=path.join(dist,"fleet-manifest.json");if(await exists(fm)){const m=JSON.parse(await readFile(fm,"utf8"));m.generated_at=new Date().toISOString();m.one_screen_architecture={version:"18-domain-one-screen-v1",static_hosts:trees.length,published_webpages:pages,acknowledgements_last_everywhere:true,normal_page_scrolling:false};await writeFile(fm,JSON.stringify(m,null,2)+"\n")}
if(trees.length!==18||pages!==93)throw Error(`One-screen totals wrong: ${trees.length} hosts / ${pages} pages`);
console.log(`ONE_SCREEN_ARCHITECTURE=PASS targets=${trees.length} pages=${pages} acknowledgements_last=true scrolling=false`);
console.log(`VISUAL_FIT_FINALIZER=PASS targets=${trees.length} pages=${pages} authority=LAST`);
