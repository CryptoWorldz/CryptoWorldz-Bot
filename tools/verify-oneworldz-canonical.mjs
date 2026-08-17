import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const authorityPath = 'governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md';
const manifestPath = 'governance/master-use-library-manifest.v1.json';
const distRoot = 'apps/oneworldz-ecosystem-release/dist/ecosystem';

function abs(rel){ return path.join(root, rel); }
function read(rel){
  const p=abs(rel);
  if(!fs.existsSync(p)){ errors.push(`missing required file: ${rel}`); return ''; }
  return fs.readFileSync(p,'utf8');
}
function requireText(text, token, label){ if(!text.includes(token)) errors.push(`${label}: missing ${JSON.stringify(token)}`); }
function forbid(text, pattern, label){ if(pattern.test(text)) errors.push(`${label}: prohibited content ${pattern}`); }
function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
function count(text, pattern){ return (text.match(pattern)||[]).length; }

const authority=read(authorityPath);
requireText(authority,'Latest direct JayJayTeamDev instruction','canonical authority');
requireText(authority,'Dedicated 35-profile Facebook Community Support page','canonical authority');
requireText(authority,'Technical-live and visual/UX approval are separate gates','canonical authority');
requireText(authority,'Desktop legacy grid: two rows of five','canonical authority');
requireText(authority,'CryptoBotz remains protected','canonical authority');

let library=null;
try{ library=JSON.parse(read(manifestPath)); }catch{ errors.push('Master Use Library manifest is not valid JSON'); }
if(library){
  if(library.version!=='1.0') errors.push('Master Use Library version drift');
  if(!Array.isArray(library.files)||library.files.length!==44) errors.push(`Master Use Library must contain the 44 actual hashed entries currently present; got ${library.files?.length ?? 0}`);
  if(library.asset_count!==library.files?.length) warnings.push(`Historical manifest declares asset_count=${library.asset_count}, but the actual verified file list contains ${library.files?.length}. No fabricated 45th asset is permitted.`);
  const paths=library.files?.map(x=>x.path)||[];
  if(new Set(paths).size!==paths.length) errors.push('Master Use Library contains duplicate paths');
  for(const row of library.files||[]){ if(!/^[a-f0-9]{64}$/.test(String(row.sha256||''))) errors.push(`Invalid library hash: ${row.path}`); }
  const requiredHashes=new Map([
    ['production/oneworldz/little-legend.webp','1598b2b3d11a3ba3ce9a181366973b675e8b15dd25ad6addd789ac2b7e6c1919'],
    ['production/oneworldz/hope-chest.webp','a4bb625c906c11961b877a1d24ed199fd95aa22177a7815ab39dfd7d666567b3'],
    ['production/command-centre/zed-grace-auto.webp','2bc8fee7e6d2790c5cc1b9cf5583fbf45818558786bc806de4d3d576fe1acca9'],
    ['production/impactbased/impactbased-square.webp','4aa3c8c532fb06e07c3ab4dcfac6901012e6fd6cc758e02db67a18e226241554'],
    ['production/blockchain-worldz/solworldz.webp','a8a3969f961c5f45e6d21da4f44c4a98a8bbba87e1c05705d6537e191109612d'],
    ['production/blockchain-worldz/ethworldz.webp','a6dafe4f7cb11b57e89acaeed6559e55bea212ac0a394bdbfc911b4968df14d3'],
    ['production/blockchain-worldz/baseworldz.webp','9e33ac3d5b52c71749151025b989a1b88a026bd8f0089dc8030effc77dc86bda'],
    ['production/blockchain-worldz/bnbworldz.webp','6122e2075e7dfe657bbaae4353144e395771c7f38c36b79d920ab68d3b448000'],
    ['production/blockchain-worldz/xrpworldz.webp','53a011d58de88799a3a3e0ef4e09a1aac9b48f75c7f6a3c098e5514d4b57ac24'],
    ['production/blockchain-worldz/suiworldz.webp','80507346c696ab1ee67c4427adc23594a52856dffe139f2176e5c3b550e0f56c'],
    ['production/blockchain-worldz/hyperworldz.webp','bbeaa4415abb7a19a073b14c2fa545491a8af871f5f43f1b83150e9d3bdf2b46'],
    ['production/blockchain-worldz/robinworldz.webp','4473ac1d3af43336254b642ab24d6a68a65297cdee67cb826273fa12ca046897']
  ]);
  for(const [asset,hash] of requiredHashes){ const row=library.files.find(x=>x.path===asset); if(!row||row.sha256!==hash) errors.push(`Master Use Library identity/hash drift: ${asset}`); }
}

const fleet=JSON.parse(read(`${distRoot}/fleet-manifest.json`)||'{}');
if(fleet.targets?.length!==18) errors.push(`canonical fleet must contain 18 static packages; got ${fleet.targets?.length ?? 0}`);
if(fleet.architecture?.ecosystem_destinations!==19) errors.push('canonical fleet must represent 19 total destinations');
if(fleet.architecture?.static_build_targets!==18) errors.push('canonical fleet architecture must state 18 static build targets');
if(JSON.stringify(fleet.architecture?.protected_existing_destinations)!==JSON.stringify(['https://cryptobotz.cryptoworldz.xyz'])) errors.push('CryptoBotz protected destination drift');
if(JSON.stringify(fleet.architecture?.excluded_owned_root_domains)!==JSON.stringify(['solworld.fun'])) errors.push('SolWorld.fun exclusion drift');

const publicFiles=walk(abs(distRoot)).filter(p=>/\.(?:html|js|css)$/i.test(p));
const activeCore=publicFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');
forbid(activeCore,/NEXT PASS/i,'canonical release');
forbid(activeCore,/gofundme/i,'canonical release');
forbid(activeCore,/sk-proj-|sk_live_|sk_test_|OPENAI_API_KEY\s*=|SUPABASE_SERVICE_ROLE_KEY\s*=/i,'canonical public release');
forbid(activeCore,/Facebook Support Profile\s*0?\d+/i,'canonical public release');
forbid(activeCore,/solworld\.fun/i,'canonical public release');

const one=read(`${distRoot}/oneworldz/index.html`);
requireText(one,'oneworldz-blue-white','OneWorldz blue/white identity');
requireText(one,'little-legend.webp','OneWorldz future-scholar lead visual');
requireText(one,'2026–2030 HELP THE PEOPLE MOVEMENT','OneWorldz movement');
requireText(one,'/community-support/','OneWorldz Community Support route');
requireText(one,'https://purplediamondcrew.com','OneWorldz On the Ground route');
requireText(one,'https://cryptoworldz.xyz','OneWorldz CryptoWorldz route');

for(const route of [
  'https://donateworldz.com/reagan-children/',
  'https://donateworldz.com/community-impact/',
  'https://donateworldz.com/jayjayteamdev/'
]) requireText(activeCore,route,'three separated support routes');

const community=read(`${distRoot}/oneworldz/community-support/index.html`);
const communityJs=read(`${distRoot}/oneworldz/assets/js/community-support.js`);
requireText(community,'35 verified support links','Community Support page');
requireText(community,'public.oneworldz_support_profiles','Community Support source');
if(count(community,/class="community-support-card"/g)!==35) errors.push('Community Support page must embed exactly 35 verified support cards');
requireText(communityJs,'querySelectorAll(".community-support-card")','Community Support embedded registry renderer');
requireText(communityJs,'cards.length === 35','Community Support 35-card completeness gate');
forbid(communityJs,/fetch\s*\(/i,'Community Support runtime dependency');
forbid(communityJs,/api\/oneworldz-community-support/i,'Community Support cross-origin API dependency');
forbid(community+communityJs,/Facebook Support Profile\s*0?\d+/i,'Community Support public page');

const donate=read(`${distRoot}/donateworldz/index.html`);
for(const sub of ['reagan-children','community-impact','jayjayteamdev']){
  const rel=`${distRoot}/donateworldz/${sub}/index.html`;
  if(!fs.existsSync(abs(rel))) errors.push(`missing separated DonateWorldz route: /${sub}/`);
  requireText(donate,`/${sub}/`,'DonateWorldz support separation');
}
const gptOne=read(`${distRoot}/oneworldz/assets/js/oneworldz-gpt.js`);
const gptDonate=read(`${distRoot}/donateworldz/assets/js/oneworldz-gpt.js`);
for(const [label,text] of [['OneWorldz GPT',gptOne],['DonateWorldz GPT',gptDonate]]){
  requireText(text,'/api/oneworldz-gpt/chat',label);
  requireText(text,'/assets/oneworldz-gpt/oneworldz-gpt.png',label);
  forbid(text,/OPENAI_API_KEY|sk-proj-|Bearer\s+sk-/i,label);
}

const pdc=read(`${distRoot}/purplediamondcrew/index.html`);
const pdcCss=read(`${distRoot}/purplediamondcrew/assets/css/pdc-market.css`);
const pdcJs=read(`${distRoot}/purplediamondcrew/assets/js/pdc-market.js`);
if(count(pdc,/class="pdc-token-card"/g)!==10) errors.push('PurpleDiamondCrew must render exactly ten verified legacy token cards');
requireText(pdcCss,'repeat(5,minmax(0,1fr))','PDC desktop 5 × 2 grid');
requireText(pdcCss,'@media(max-width:1100px){.pdc-token-grid{grid-template-columns:repeat(2,minmax(0,1fr))}','PDC mobile two-column grid');
requireText(pdcCss,'@media(max-width:430px){.pdc-token-grid{grid-template-columns:1fr}}','PDC narrow one-column grid');
requireText(pdcJs,'api.dexscreener.com/tokens/v1/solana','PDC DEX Screener integration');
requireText(pdcCss,'purple-diamond-crew/hope-chest.png','PDC Hope Chest background asset');

const law=read(`${distRoot}/law-oneworldz/index.html`);
const learn=read(`${distRoot}/learn-oneworldz/index.html`);
requireText(law,'ROBIN HOOD LAW','Law.OneWorldz');
requireText(learn,'Swift Grow','Learn.OneWorldz research lead');
requireText(learn,'FoodWorldz','Learn.OneWorldz food/gardening connection');

const protectedSource=[
  read('src/hub-central/live-v1.js'),
  read('src/community-support/live-v1.js'),
  read('src/oneworldz-gpt/http.js'),
  read('src/auto/zed-router.js')
].join('\n');
requireText(protectedSource,'/api/oneworldz-gpt/chat','protected OneWorldz GPT');
requireText(protectedSource,'oneworldz_support_profiles','protected Community Support registry');
requireText(protectedSource,'/api/mini/auto/ultimate','AUTO Ultimate owner surface');
requireText(protectedSource,'/api/mini/auto/emergency-stop','AUTO emergency stop');
if(!fs.existsSync(abs('src/grace'))) errors.push('G.R.A.C.E. protected source directory missing');
if(!fs.existsSync(abs('public/miniapp'))) errors.push('ZED Mini App public source directory missing');

if(warnings.length){ console.warn('\nONEWORLDZ CANONICAL BUILD WARNINGS\n'); for(const w of warnings) console.warn(`- ${w}`); }
if(errors.length){
  console.error('\nONEWORLDZ CANONICAL BUILD GATE: FAIL\n');
  for(const e of errors) console.error(`- ${e}`);
  console.error('\nNo completion or production-live claim may be made until every blocking item is fixed.\n');
  process.exit(1);
}
console.log('ONEWORLDZ CANONICAL BUILD GATE: PASS — unified Perfect Plan source verified.');
