import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const src=path.join(root,'source','assets');
const dist=path.join(root,'dist','ecosystem','law-oneworldz');
const exists=async p=>Boolean(await stat(p).catch(()=>null));
const publicSurface=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<!--([\s\S]*?)-->/g,'');

for(const rel of ['desktop/oneworldz/little-legend.png','mobile/little-legend.webp']){
  const to=path.join(dist,'assets',rel);
  if(!(await exists(to))){await mkdir(path.dirname(to),{recursive:true});await cp(path.join(src,rel),to)}
}

const file=path.join(dist,'acknowledgements','index.html');
let html=await readFile(file,'utf8');
const d='/assets/desktop/oneworldz/little-legend.png';
const m='/assets/mobile/little-legend.webp';

html=html
  .replaceAll('/robin-hood-law/','/blueprint/')
  .replaceAll('/public-ideas/','/research/')
  .replaceAll('Robin Hood Law','OneWorldz Blueprint')
  .replaceAll('Law.OneWorldz','OneWorldz Blueprint')
  .replaceAll('RobinWorldz','OneWorldz')
  .replaceAll('/assets/desktop/tokens/robin-hood-law.png',d)
  .replaceAll('/assets/mobile/robin-hood-law.webp',m)
  .replace(/\/assets\/desktop\/(?:tokens|blockchains)\/[^"' )<]+/gi,d)
  .replace(/--screen-bg:url\(['"][^'"]+['"]\);--screen-bg-mobile:url\(['"][^'"]+['"]\)/,`--screen-bg:url('${d}');--screen-bg-mobile:url('${m}')`)
  .replace(/<source media="\(max-width:720px\)" srcset="[^"]+">/,`<source media="(max-width:720px)" srcset="${m}">`)
  .replace(/<img src="[^"]+" alt="" fetchpriority="high">/,`<img src="${d}" alt="" fetchpriority="high">`)
  .replace(/<a class="screen-brand" href="\/">[\s\S]*?<\/a>/,'<a class="screen-brand" href="/"><span class="brand-mark">O</span><span><strong>OneWorldz Blueprint</strong><small>Acknowledgements</small></span></a>')
  .replace(/<title>[\s\S]*?<\/title>/,'<title>Acknowledgements | OneWorldz One Vision</title>')
  .replace(/<body([^>]*)>/,(all,attrs)=>`<body${attrs.replace(/\sdata-semantic-purpose="[^"]*"/g,'').replace(/\sdata-semantic-desktop="[^"]*"/g,'').replace(/\sdata-semantic-mobile="[^"]*"/g,'')} data-semantic-purpose="OneWorldz Blueprint acknowledgements" data-semantic-desktop="${d}" data-semantic-mobile="${m}">`);

if(/robin-hood-law\.png|\/assets\/desktop\/(?:tokens|blockchains)\//i.test(html))throw new Error('Blueprint acknowledgements still references crypto artwork');
const visible=publicSurface(html);
for(const pattern of [/Robin Hood Law/i,/RobinWorldz/i,/SolWorld/i,/Command Centre/i,/DEX Screener/i,/\bwallet\b/i,/\btoken\b/i,/\bblockchain\b/i]){
  const hit=visible.match(pattern);
  if(hit)throw new Error(`Blueprint acknowledgements public crypto/Robin branding remains: ${hit[0]}`);
}
const cardCount=(html.match(/class="ack-card"/g)||[]).length;
if(cardCount<6)throw new Error(`Blueprint acknowledgements must contain real acknowledgements, got ${cardCount}`);
if(!visible.includes('OneWorldz Blueprint Contributors')||!visible.includes('Original Long-Form Blueprint Work')||!visible.includes('OneWorldz One Vision'))throw new Error('Blueprint acknowledgements substantive groups missing');
await writeFile(file,html,'utf8');

const contractPath=path.join(root,'dist','ecosystem','semantic-route-contract.json');
const contract=JSON.parse(await readFile(contractPath,'utf8'));
const rec=contract.records.find(r=>r.target==='law-oneworldz'&&r.route==='/acknowledgements/');
if(!rec)throw new Error('Blueprint acknowledgements semantic record missing');
rec.desktop=d;
rec.mobile=m;
rec.purpose='OneWorldz Blueprint acknowledgements';
await writeFile(contractPath,JSON.stringify(contract,null,2)+'\n');
console.log(`BLUEPRINT_ACKNOWLEDGEMENTS_IDENTITY=PASS cards=${cardCount} crypto_visuals=ABSENT old_robin_brand=ABSENT public_surface=HUMAN_FIRST production_write=false`);
