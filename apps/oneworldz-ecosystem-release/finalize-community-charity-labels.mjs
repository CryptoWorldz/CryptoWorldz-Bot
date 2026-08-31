import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist','ecosystem');
const donate=path.join(dist,'donateworldz');
const treePath=path.join(donate,'site-tree.json');
const fleetPath=path.join(dist,'user-structure-tree.json');
const tree=JSON.parse(await readFile(treePath,'utf8'));
for(const r of tree.routes||[])if(r.route==='/community-impact/')r.label='Community Charity';
await writeFile(treePath,JSON.stringify(tree,null,2)+'\n');
const fleet=JSON.parse(await readFile(fleetPath,'utf8'));
for(const host of fleet.hosts||[])if(host.key==='donateworldz')for(const r of host.routes||[])if(r.route==='/community-impact/')r.label='Community Charity';
await writeFile(fleetPath,JSON.stringify(fleet,null,2)+'\n');
for(const r of tree.routes||[]){const rel=String(r.route).replace(/^\/+|\/+$/g,'');const file=path.join(donate,rel,'index.html');let html=await readFile(file,'utf8');html=html.replaceAll('>Community Impact</a>','>Community Charity</a>');if(r.route==='/community-impact/')html=html.replace('<title>Community Impact | DonateWorldz</title>','<title>Community Charity | DonateWorldz</title>');await writeFile(file,html,'utf8')}
console.log('COMMUNITY_CHARITY_LABELS=PASS route=/community-impact/ public_label=Community_Charity production_write=false');
