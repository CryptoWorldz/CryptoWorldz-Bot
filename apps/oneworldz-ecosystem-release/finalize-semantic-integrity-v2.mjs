import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const srcAssets = path.join(root,'source','assets');
const dist = path.join(root,'dist','ecosystem');
const exists = async (p) => Boolean(await stat(p).catch(()=>null));
const clean = (r) => String(r||'').replace(/^\/+|\/+$/g,'');
const fileFor = (target,route) => path.join(dist,target,clean(route),'index.html');

const remaining = new Map([
  ['cryptoworldz:/',['desktop/cryptoworldz/zed-command-centre.png','mobile/blockchain-portal.webp','CryptoWorldz headquarters']],
  ['cryptoworldz:/command-centre/',['desktop/cryptoworldz/command-centre-five.png','mobile/five-leaders-master.webp','ZED Command Centre']],
  ['cryptoworldz:/worldz/',['desktop/cryptoworldz/zed-command-centre.png','mobile/blockchain-portal.webp','CryptoWorldz Worldz gateway']],
  ['cryptoworldz:/impactbased/',['desktop/cryptoworldz/impactbased.png','mobile/impactbased-landscape.webp','CryptoWorldz ImpactBased route']],
  ['cryptoworldz:/human-impact/',['desktop/tokens/global-impact-alliance.png','mobile/global-impact-alliance.webp','CryptoWorldz human impact']],
  ['cryptoworldz:/markets/',['desktop/cryptoworldz/zed-auto.png','mobile/zed-grace-auto.webp','CryptoWorldz external markets']],
  ['cryptoworldz:/gtp/',['desktop/oneworldz/oneworldz-gpt.png','mobile/little-legend.webp','CryptoWorldz shared GPT']],
  ['cryptoworldz:/acknowledgements/',['desktop/cryptoworldz/command-centre-leader-team.png','mobile/leader-team.webp','CryptoWorldz acknowledgements']],

  ['purplediamondcrew:/',['desktop/purple-diamond-crew/action-team.png','desktop/purple-diamond-crew/action-team.png','Purple Diamond Crew on-the-ground action']],
  ['purplediamondcrew:/legacy-tokens/',['desktop/purple-diamond-crew/hope-chest.png','mobile/hope-chest.webp','Purple Diamond Crew 1927 Hope Chest']],
  ['purplediamondcrew:/make-the-difference/',['desktop/purple-diamond-crew/banner.png','desktop/purple-diamond-crew/banner.png','Purple Diamond Crew Make the Difference']],
  ['purplediamondcrew:/acknowledgements/',['desktop/purple-diamond-crew/banner.png','desktop/purple-diamond-crew/banner.png','Purple Diamond Crew acknowledgements']],

  ['law-oneworldz:/public-ideas/',['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law public ideas']],
  ['law-oneworldz:/robin-hood-law/',['desktop/tokens/robin-hood-law.png','mobile/robin-hood-law.webp','Robin Hood Law Blueprint 001']]
]);

async function ensure(target,rel){const dest=path.join(dist,target,'assets',rel);if(await exists(dest))return;const src=path.join(srcAssets,rel);if(!(await exists(src)))throw new Error(`${target}: missing semantic asset ${rel}`);await mkdir(path.dirname(dest),{recursive:true});await cp(src,dest)}
function patch(html,desktop,mobile,label){const d=`/assets/${desktop}`,m=`/assets/${mobile}`;html=html.replace(/--screen-bg:url\(['"][^'"]+['"]\);--screen-bg-mobile:url\(['"][^'"]+['"]\)/,`--screen-bg:url('${d}');--screen-bg-mobile:url('${m}')`).replace(/<source media="\(max-width:720px\)" srcset="[^"]+">/,`<source media="(max-width:720px)" srcset="${m}">`).replace(/<img src="[^"]+" alt="" fetchpriority="high">/,`<img src="${d}" alt="" fetchpriority="high">`);html=html.replace(/<body([^>]*)>/,(all,attrs)=>{const c=attrs.replace(/\sdata-semantic-purpose="[^"]*"/g,'').replace(/\sdata-semantic-desktop="[^"]*"/g,'').replace(/\sdata-semantic-mobile="[^"]*"/g,'');const safe=label.replaceAll('&','&amp;').replaceAll('"','&quot;');return `<body${c} data-semantic-purpose="${safe}" data-semantic-desktop="${d}" data-semantic-mobile="${m}">`});return html}

const fitStyle=`<style data-semantic-fit-final>
body[data-visual-fit-target="donateworldz"][data-route="home"] .screen::before{background-size:contain!important;background-position:center 42%!important;background-color:#040515!important}
body[data-visual-fit-target="donateworldz"][data-route="reagan-children"] .screen::before,body[data-visual-fit-target="donateworldz"][data-route="community-impact"] .screen::before,body[data-visual-fit-target="donateworldz"][data-route="support-jayjayteamdev"] .screen::before,body[data-visual-fit-target="donateworldz"][data-route="davis-family"] .screen::before{background-size:contain!important;background-position:center 56%!important;background-color:#040515!important}
body[data-visual-fit-target="purplediamondcrew"][data-route="make-the-difference"] .screen::before,body[data-visual-fit-target="purplediamondcrew"][data-route="acknowledgements"] .screen::before{background-size:contain!important;background-position:center!important;background-color:#05000f!important}
</style>`;

const contractPath=path.join(dist,'semantic-route-contract.json');
const contract=JSON.parse(await readFile(contractPath,'utf8'));
for(const [key,[desktop,mobile,purpose]] of remaining){const [target,route]=key.split(':');await ensure(target,desktop);await ensure(target,mobile);const file=fileFor(target,route);let html=await readFile(file,'utf8');html=patch(html,desktop,mobile,purpose);if(!html.includes('data-semantic-fit-final'))html=html.replace('</head>',`${fitStyle}</head>`);await writeFile(file,html,'utf8');contract.records.push({target,route,desktop:`/assets/${desktop}`,mobile:`/assets/${mobile}`,purpose})}

const unique=new Map(contract.records.map(r=>[`${r.target}:${r.route}`,r]));
contract.records=[...unique.values()].sort((a,b)=>`${a.target}:${a.route}`.localeCompare(`${b.target}:${b.route}`));
contract.version='semantic-integrity-v2';
contract.authority='FINAL_AFTER_ALL_VISUAL_AND_INTERACTION_FINALIZERS';
contract.coverage=contract.records.length;
if(contract.records.length!==93)throw new Error(`Semantic contract must cover all 93 routes; found ${contract.records.length}`);
await writeFile(contractPath,JSON.stringify(contract,null,2)+'\n');
console.log('SEMANTIC_ROUTE_COVERAGE=PASS routes=93 final_authority=true');
