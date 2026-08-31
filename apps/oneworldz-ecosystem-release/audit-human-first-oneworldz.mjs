import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist','ecosystem');
const failures=[];
const fail=(kind,detail)=>{failures.push({kind,...detail});console.error(`HUMAN_FIRST_FAIL ${kind} ${JSON.stringify(detail)}`)};
const read=async(target,route='')=>readFile(path.join(dist,target,String(route).replace(/^\/+|\/+$/g,''),'index.html'),'utf8');
const surface=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<!--([\s\S]*?)-->/g,'');
const visibleCrypto=[/Robin Hood Law/i,/RobinWorldz/i,/Command Centre/i,/DEX Screener/i,/\bwallet\b/i,/\btoken\b/i,/\bblockchain\b/i];
const explicitCryptoAsset=/\/assets\/(?:desktop\/cryptoworldz|desktop\/blockchains|desktop\/tokens|mobile\/blockchain-portal|mobile\/robin-hood-law)/i;

const oneRoutes=['','make-the-difference','community-support','heroes','sponsor-apply','gpt','ecosystem','acknowledgements'];
for(const route of oneRoutes){
  const html=await read('oneworldz',route);
  const publicHtml=surface(html);
  if(explicitCryptoAsset.test(html))fail('oneworldz-crypto-image',{route});
  for(const p of visibleCrypto){if(p.test(publicHtml))fail('oneworldz-crypto-copy',{route,match:String(publicHtml.match(p)?.[0]||'')})}
  if(route!=='ecosystem'&&/CryptoWorldz/i.test(publicHtml))fail('oneworldz-crypto-copy',{route,match:'CryptoWorldz'});
}

const home=await read('oneworldz');
const homePublic=surface(home);
for(const phrase of ['END WORLD HUNGER FOR GOOD','WORLD HUNGER BLUEPRINT','Research • Evidence • Compare • Build • Propose • Implement • Measure • Improve','Blueprint Lab'])if(!homePublic.includes(phrase))fail('home-mission-missing',{phrase});
if(/CryptoWorldz|Robin Hood Law|Command Centre|RobinWorldz/i.test(homePublic))fail('home-brand-drift',{});

const ecosystem=await read('oneworldz','ecosystem');
const ecosystemPublic=surface(ecosystem);
const cryptoLinks=(ecosystemPublic.match(/https:\/\/cryptoworldz\.xyz\//g)||[]).length;
if(cryptoLinks!==1)fail('ecosystem-crypto-separation',{expected:1,actual:cryptoLinks});
if(!ecosystemPublic.includes('Separate Crypto Hub'))fail('ecosystem-crypto-label',{});

const fleet=JSON.parse(await readFile(path.join(dist,'user-structure-tree.json'),'utf8'));
const law=fleet.hosts.find(h=>h.key==='law-oneworldz');
const lawRoutes=(law?.routes||[]).map(r=>r.route);
const expected=['/','/blueprint/','/research/','/acknowledgements/'];
if(JSON.stringify(lawRoutes)!==JSON.stringify(expected))fail('blueprint-routes',{expected,actual:lawRoutes});
for(const route of ['','blueprint','research','acknowledgements']){
  const html=await read('law-oneworldz',route);
  const publicHtml=surface(html);
  if(/robin-hood-law\.png|\/assets\/desktop\/(?:tokens|blockchains)\//i.test(html))fail('blueprint-crypto-image',{route});
  for(const p of visibleCrypto){if(p.test(publicHtml))fail('blueprint-brand-drift',{route,match:String(publicHtml.match(p)?.[0]||'')})}
  if(!publicHtml.includes('OneWorldz'))fail('blueprint-oneworldz-identity',{route});
}

let acknowledgements=0;
for(const target of productionTargets){
  const html=await read(target.key,'acknowledgements');
  const count=(html.match(/class="ack-card"/g)||[]).length;
  if(!html.includes('data-acknowledgements-final="true"')||count<6)fail('acknowledgements-empty',{target:target.key,cards:count});
  acknowledgements++;
}
const ack=await read('oneworldz','acknowledgements');
for(const phrase of ['JayJayTeamDev','Reagan Kauja &amp; Action Spread Smiles','Purple Diamond Crew','Davis Family Support','34 Community Charity Causes','Donors • Volunteers • Supporters','Technology &amp; Service Platforms'])if(!ack.includes(phrase))fail('oneworldz-acknowledgement-missing',{phrase});

console.log(`HUMAN_FIRST_ONEWORLDZ_ROUTES=${oneRoutes.length}`);
console.log(`BLUEPRINT_PUBLIC_ROUTES=${lawRoutes.length}`);
console.log(`ACKNOWLEDGEMENTS_POPULATED=${acknowledgements}`);
console.log(`HUMAN_FIRST_FAILURES=${failures.length}`);
console.log(`HUMAN_FIRST_GATE=${failures.length?'FAIL':'PASS'}`);
if(failures.length)process.exit(1);
