import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const contractPath=path.join(root,'dist','ecosystem','semantic-route-contract.json');
const contract=JSON.parse(await readFile(contractPath,'utf8'));
const rec=contract.records.find(r=>r.target==='oneworldz'&&r.route==='/');
if(!rec)throw new Error('OneWorldz home semantic contract missing');
rec.desktop='/assets/desktop/oneworldz/oneworldz-master.png';
rec.mobile='/assets/mobile/little-legend.webp';
rec.purpose='OneWorldz human and global gateway focused on ending world hunger';
await writeFile(contractPath,JSON.stringify(contract,null,2)+'\n');
console.log('ONEWORLDZ_SEMANTIC_CONTRACT=PASS route=/ purpose=human_global_gateway mission=END_WORLD_HUNGER production_write=false');
