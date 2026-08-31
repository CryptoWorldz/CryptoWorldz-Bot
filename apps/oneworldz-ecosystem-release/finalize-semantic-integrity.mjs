import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';
import { supportProfiles } from './site-data.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const srcAssets = path.join(root, 'source', 'assets');
const dist = path.join(root, 'dist', 'ecosystem');
const exists = async (p) => Boolean(await stat(p).catch(() => null));
const cleanRoute = (route) => String(route || '').replace(/^\/+|\/+$/g, '');
const pageFile = (target, route) => path.join(dist, target, cleanRoute(route), 'index.html');

const chain = Object.freeze({
  solworldz: ['desktop/blockchains/solworldz.png', 'mobile/solworldz.webp'],
  ethworldz: ['desktop/blockchains/ethworldz.png', 'mobile/ethworldz.webp'],
  baseworldz: ['desktop/blockchains/baseworldz.png', 'mobile/baseworldz.webp'],
  bnbworldz: ['desktop/blockchains/bnbworldz.png', 'mobile/bnbworldz.webp'],
  xrpworldz: ['desktop/blockchains/xrpworldz.png', 'mobile/xrpworldz.webp'],
  suiworldz: ['desktop/blockchains/suiworldz.png', 'mobile/suiworldz.webp'],
  hyperworldz: ['desktop/blockchains/hyperworldz.png', 'mobile/hyperworldz.webp'],
  hodlerworldz: ['desktop/blockchains/bitworldz.png', 'mobile/bitworldz.webp'],
  robinworldz: ['desktop/blockchains/robinworldz.png', 'mobile/robinworldz.webp']
});

const exact = new Map([
  ['donateworldz:/', ['approved/desktop/donateworldz-hero.avif','approved/mobile/donateworldz-hero.avif','DonateWorldz approved support-pathway hero']],
  ['donateworldz:/reagan-children/', ['support/desktop/reagan-children-emblem-desktop.webp','support/mobile/reagan-children-emblem-mobile.webp','Reagan & Children dedicated support identity']],
  ['donateworldz:/community-impact/', ['support/desktop/community-impact-emblem-desktop.webp','support/mobile/community-impact-emblem-mobile.webp','Community Charity / Community Impact dedicated identity']],
  ['donateworldz:/davis-family/', ['support/davis-family/davis-family-hero.jpg','support/davis-family/davis-family-hero.webp','Davis Family dedicated support identity']],
  ['donateworldz:/support-jayjayteamdev/', ['support/desktop/jayjayteamdev-emblem-desktop.webp','support/mobile/jayjayteamdev-emblem-mobile.webp','JayJayTeamDev dedicated support identity']],
  ['donateworldz:/acknowledgements/', ['approved/desktop/donateworldz-hero.avif','approved/mobile/donateworldz-hero.avif','DonateWorldz acknowledgements identity']],

  ['foodworldz:/', ['approved/desktop/foodworldz-hero.avif','approved/mobile/foodworldz-hero.avif','FoodWorldz approved production hero']],
  ['foodworldz:/food/', ['approved/desktop/foodworldz-hero.avif','approved/mobile/foodworldz-hero.avif','FoodWorldz food identity']],
  ['foodworldz:/clean-water/', ['approved/desktop/foodworldz-hero.avif','approved/mobile/foodworldz-hero.avif','FoodWorldz food and water identity']],
  ['foodworldz:/donateworldz/', ['approved/desktop/foodworldz-hero.avif','approved/mobile/foodworldz-hero.avif','FoodWorldz support pathway identity']],
  ['foodworldz:/acknowledgements/', ['approved/desktop/foodworldz-hero.avif','approved/mobile/foodworldz-hero.avif','FoodWorldz acknowledgements identity']],

  ['hodlergalaxy:/', ['approved/desktop/hodlergalaxy-hero.avif','approved/mobile/hodlergalaxy-hero.avif','HodlerGalaxy approved production hero']],
  ['hodlergalaxy:/worldz-galaxy/', ['approved/desktop/hodlergalaxy-hero.avif','approved/mobile/hodlergalaxy-hero.avif','HodlerGalaxy Worldz gateway']],
  ['hodlergalaxy:/hodler-learning/', ['desktop/blockchains/bitworldz.png','mobile/bitworldz.webp','Hodler learning identity']],
  ['hodlergalaxy:/acknowledgements/', ['approved/desktop/hodlergalaxy-hero.avif','approved/mobile/hodlergalaxy-hero.avif','HodlerGalaxy acknowledgements identity']],

  ['oneworldz:/', ['desktop/oneworldz/oneworldz-master.png','mobile/little-legend.webp','OneWorldz One Vision']],
  ['oneworldz:/make-the-difference/', ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp','OneWorldz Make the Difference']],
  ['oneworldz:/community-support/', ['support/desktop/community-impact-emblem-desktop.webp','support/mobile/community-impact-emblem-mobile.webp','Community Support directory identity']],
  ['oneworldz:/heroes/', ['desktop/oneworldz/reagan-kauja.png','mobile/little-legend.webp','OneWorldz people and heroes']],
  ['oneworldz:/sponsor-apply/', ['desktop/cryptoworldz/we-need-you.png','mobile/little-legend.webp','OneWorldz sponsors and participation']],
  ['oneworldz:/gpt/', ['desktop/oneworldz/oneworldz-gpt.png','mobile/little-legend.webp','OneWorldz GPT']],
  ['oneworldz:/ecosystem/', ['desktop/cryptoworldz/command-centre-five.png','mobile/five-leaders-master.webp','OneWorldz ecosystem directory']],
  ['oneworldz:/acknowledgements/', ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp','OneWorldz acknowledgements']],

  ['impactbased:/', ['desktop/cryptoworldz/impactbased.png','mobile/impactbased-landscape.webp','ImpactBased identity']],
  ['impactbased:/launch-board/', ['desktop/cryptoworldz/impactbased.png','mobile/impactbased-landscape.webp','ImpactBased launch board']],
  ['impactbased:/real-world-impact/', ['desktop/tokens/global-impact-alliance.png','mobile/global-impact-alliance.webp','ImpactBased real-world impact']],
  ['impactbased:/acknowledgements/', ['desktop/cryptoworldz/impactbased.png','mobile/impactbased-landscape.webp','ImpactBased acknowledgements']],

  ['law-oneworldz:/', ['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law public-interest identity']],
  ['law-oneworldz:/research/', ['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law research']],
  ['law-oneworldz:/participate/', ['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law participation']],
  ['law-oneworldz:/acknowledgements/', ['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law acknowledgements']],

  ['learn-oneworldz:/', ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp','Learn.OneWorldz identity']],
  ['learn-oneworldz:/learn/', ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp','Learn.OneWorldz learning']],
  ['learn-oneworldz:/safety/', ['desktop/oneworldz/oneworldz-gpt.png','mobile/little-legend.webp','Learn.OneWorldz safety']],
  ['learn-oneworldz:/gpt/', ['desktop/oneworldz/oneworldz-gpt.png','mobile/little-legend.webp','Learn.OneWorldz GPT']],
  ['learn-oneworldz:/acknowledgements/', ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp','Learn.OneWorldz acknowledgements']]
]);

const community = supportProfiles
  .filter((profile) => profile.id !== '18BmqfH7MS')
  .map((profile, index) => ({
    number: String(index + 1).padStart(2, '0'),
    name: profile.name,
    initials: profile.initials || 'OW',
    restricted: Boolean(profile.restricted),
    url: profile.url
  }));
if (community.length !== 34) throw new Error(`Expected 34 Community profiles after Davis separation, found ${community.length}`);
if (community.some((row) => !row.name || row.name === 'Verified Community Support Link')) throw new Error('Community semantic names contain a generic placeholder');

async function ensureAsset(target, rel) {
  const dest = path.join(dist, target, 'assets', rel);
  if (await exists(dest)) return;
  const source = path.join(srcAssets, rel);
  if (!(await exists(source))) throw new Error(`${target}: semantic asset missing ${rel}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(source, dest);
}

function patchAssets(html, desktop, mobile, label) {
  const d = `/assets/${desktop}`;
  const m = `/assets/${mobile}`;
  html = html.replace(/--screen-bg:url\(['"][^'"]+['"]\);--screen-bg-mobile:url\(['"][^'"]+['"]\)/, `--screen-bg:url('${d}');--screen-bg-mobile:url('${m}')`);
  html = html.replace(/<source media="\(max-width:720px\)" srcset="[^"]+">/, `<source media="(max-width:720px)" srcset="${m}">`);
  html = html.replace(/<img src="[^"]+" alt="" fetchpriority="high">/, `<img src="${d}" alt="" fetchpriority="high">`);
  html = html.replace(/<body([^>]*)>/, (all, attrs) => {
    const cleaned = attrs.replace(/\sdata-semantic-purpose="[^"]*"/g, '').replace(/\sdata-semantic-desktop="[^"]*"/g, '').replace(/\sdata-semantic-mobile="[^"]*"/g, '');
    const safe = String(label).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    return `<body${cleaned} data-semantic-purpose="${safe}" data-semantic-desktop="${d}" data-semantic-mobile="${m}">`;
  });
  return html;
}

const communityStyle = `<style data-community-semantic-final>
body[data-route="community-impact"] .screen::before,body[data-route="community-support"] .screen::before{background-size:contain!important;background-position:center 58%!important;opacity:.42!important;filter:saturate(1.05) contrast(1.02)!important}
body[data-route="community-impact"] .screen-panel,body[data-route="community-support"] .screen-panel{width:min(94vw,920px)!important;max-width:920px!important;background:linear-gradient(180deg,rgba(3,12,35,.48),rgba(4,6,24,.72))!important;border:1px solid rgba(158,213,255,.22)!important;border-radius:24px!important;padding:clamp(12px,2vw,22px)!important;backdrop-filter:blur(10px)!important;pointer-events:auto!important}
body[data-route="community-impact"] .community-grid,body[data-route="community-support"] .community-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-top:10px!important}
body[data-route="community-impact"] .community-control,body[data-route="community-support"] .community-control{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:10px!important;align-items:center!important;min-height:74px!important;padding:10px 12px!important;text-align:left!important;pointer-events:auto!important;background:linear-gradient(135deg,rgba(20,54,116,.88),rgba(77,31,103,.76))!important;border:1px solid rgba(132,220,255,.38)!important;border-radius:18px!important;overflow:hidden!important;text-decoration:none!important}
.community-avatar{grid-row:1/3;display:grid;width:44px;height:44px;place-items:center;border-radius:50%;font-weight:900;font-size:15px;color:white;background:radial-gradient(circle at 30% 25%,#75e5ff,#6b45d8 55%,#28134f);border:1px solid rgba(255,255,255,.52);box-shadow:0 0 16px rgba(106,95,255,.36)}
.community-control small{font-size:11px!important;letter-spacing:.08em!important;color:#7fffe1!important;font-weight:800!important}
.community-control strong{font-size:clamp(13px,1.2vw,17px)!important;line-height:1.12!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;color:white!important}
.community-control[data-restricted="true"] strong{font-size:12px!important}
body[data-route="community-impact"] .pager,body[data-route="community-support"] .pager{margin-top:10px!important;pointer-events:auto!important}
body[data-route="community-impact"] .pager button,body[data-route="community-support"] .pager button{pointer-events:auto!important;min-height:48px!important;font-weight:850!important}
@media(max-width:720px){body[data-route="community-impact"] .screen-panel,body[data-route="community-support"] .screen-panel{top:82px!important;padding:10px!important;width:calc(100vw - 18px)!important}body[data-route="community-impact"] .screen-copy,body[data-route="community-support"] .screen-copy{font-size:12px!important;margin-bottom:6px!important}.community-control{min-height:68px!important;padding:8px!important;grid-template-columns:38px minmax(0,1fr)!important}.community-avatar{width:36px;height:36px;font-size:12px}.community-control strong{font-size:12.5px!important}.community-control small{font-size:9px!important}.pager{gap:8px!important}.pager button{min-height:44px!important;padding:8px 10px!important}}
</style>`;
const communityScript = `<script data-community-semantic-final>(()=>{const byUrl=new Map((window.ONE_SCREEN_DATA?.community||[]).map(x=>[x.url,x]));const decorate=()=>{document.querySelectorAll('.community-control').forEach(a=>{const row=byUrl.get(a.getAttribute('href'));if(!row||a.querySelector('.community-avatar'))return;a.dataset.restricted=String(Boolean(row.restricted));const avatar=document.createElement('span');avatar.className='community-avatar';avatar.textContent=row.initials||'OW';a.prepend(avatar)});};const grid=document.getElementById('community-grid');if(grid){new MutationObserver(decorate).observe(grid,{childList:true,subtree:true});decorate()}})();</script>`;

function patchCommunityData(html) {
  const match = html.match(/window\.ONE_SCREEN_DATA=(\{.*?\});\(\(\)=>\{/s);
  if (!match) throw new Error('Community page missing ONE_SCREEN_DATA');
  const data = JSON.parse(match[1]);
  data.community = community;
  const serialized = JSON.stringify(data).replaceAll('<','\\u003c');
  html = html.replace(match[0], `window.ONE_SCREEN_DATA=${serialized};(()=>{`);
  if (!html.includes('data-community-semantic-final')) html = html.replace('</head>', `${communityStyle}</head>`).replace('</body>', `${communityScript}</body>`);
  return html;
}

function routeContract(target, route) {
  const r = route === '/' ? '/' : `/${cleanRoute(route)}/`;
  const direct = exact.get(`${target}:${r}`);
  if (direct) return direct;
  if (chain[target]) {
    if (target === 'robinworldz' && r === '/recover-your-debt/') return ['desktop/tokens/recover-your-debt.png','mobile/robinworldz.webp','RecoverYourDebt inside RobinWorldz'];
    return [...chain[target], `${target} approved World identity`];
  }
  return null;
}

const fleet = JSON.parse(await readFile(path.join(dist,'user-structure-tree.json'),'utf8'));
const records = [];
for (const host of fleet.hosts) {
  for (const item of host.routes) {
    const contract = routeContract(host.key, item.route);
    if (!contract) continue;
    const [desktop,mobile,label] = contract;
    await ensureAsset(host.key, desktop);
    await ensureAsset(host.key, mobile);
    const file = pageFile(host.key, item.route);
    let html = await readFile(file,'utf8');
    html = patchAssets(html,desktop,mobile,label);
    if ((host.key === 'oneworldz' && item.route === '/community-support/') || (host.key === 'donateworldz' && item.route === '/community-impact/')) html = patchCommunityData(html);
    await writeFile(file,html,'utf8');
    records.push({target:host.key,route:item.route,desktop:`/assets/${desktop}`,mobile:`/assets/${mobile}`,purpose:label});
  }
}

if (!records.some(x=>x.target==='donateworldz'&&x.route==='/'&&x.desktop.includes('approved/desktop/donateworldz-hero.avif'))) throw new Error('DonateWorldz approved hero contract missing');
if (!records.some(x=>x.target==='foodworldz'&&x.route==='/'&&x.desktop.includes('approved/desktop/foodworldz-hero.avif'))) throw new Error('FoodWorldz approved hero contract missing');
if (!records.some(x=>x.target==='hodlergalaxy'&&x.route==='/'&&x.desktop.includes('approved/desktop/hodlergalaxy-hero.avif'))) throw new Error('HodlerGalaxy approved hero contract missing');

await writeFile(path.join(dist,'semantic-route-contract.json'),JSON.stringify({version:'semantic-integrity-v1',authority:'FINAL_AFTER_VISUAL_AND_INTERACTION_FINALIZERS',community_profiles:34,records},null,2)+'\n');
console.log(`SEMANTIC_INTEGRITY_FINAL=PASS routes=${records.length} community_profiles=34 approved_visuals_restored=true chain_identity_protected=true production_write=false`);
