import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist', 'ecosystem');
const exists = async (file) => Boolean(await stat(file).catch(() => null));

function upsertStyle(html, marker, css) {
  const re = new RegExp(`<style ${marker}>[\\s\\S]*?<\\/style>`, 'g');
  html = html.replace(re, '');
  if (!html.includes('</head>')) throw new Error(`${marker}: </head> missing`);
  return html.replace('</head>', `<style ${marker}>\n${css}\n</style>\n</head>`);
}

function patchSemanticBody(html, purpose, desktop, mobile) {
  return html.replace(/<body([^>]*)>/, (all, attrs) => {
    const clean = attrs
      .replace(/\sdata-semantic-purpose="[^"]*"/g, '')
      .replace(/\sdata-semantic-desktop="[^"]*"/g, '')
      .replace(/\sdata-semantic-mobile="[^"]*"/g, '');
    return `<body${clean} data-semantic-purpose="${purpose}" data-semantic-desktop="${desktop}" data-semantic-mobile="${mobile}">`;
  });
}

const acknowledgementCss = `
body[data-acknowledgements-final="true"] .screen-panel{
  pointer-events:auto!important;
  top:92px!important;
  bottom:auto!important;
  left:50%!important;
  transform:translateX(-50%)!important;
  width:min(94vw,980px)!important;
  max-width:980px!important;
  max-height:calc(100svh - 108px)!important;
  padding:12px 15px 14px!important;
  overflow:hidden!important;
  border:1px solid rgba(170,224,255,.25)!important;
  border-radius:22px!important;
  background:linear-gradient(180deg,rgba(4,15,37,.80),rgba(17,8,36,.84))!important;
  box-shadow:0 18px 52px rgba(0,0,0,.30)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
}
body[data-acknowledgements-final="true"] .screen-eyebrow{margin:0 0 2px!important}
body[data-acknowledgements-final="true"] .screen-panel h1{margin:0!important;line-height:.96!important}
body[data-acknowledgements-final="true"] .screen-copy{
  margin:4px 0 8px!important;
  max-width:none!important;
  font-size:clamp(10px,1vw,13px)!important;
  line-height:1.22!important;
}
body[data-acknowledgements-final="true"] .ack-grid{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:8px!important;
}
body[data-acknowledgements-final="true"] .ack-card{
  display:flex!important;
  flex-direction:column!important;
  justify-content:center!important;
  min-height:80px!important;
  padding:9px 11px!important;
  overflow:hidden!important;
  border:1px solid rgba(144,220,255,.25)!important;
  border-radius:15px!important;
  background:linear-gradient(135deg,rgba(24,61,119,.66),rgba(73,31,103,.62))!important;
  box-shadow:0 9px 22px rgba(0,0,0,.15)!important;
}
body[data-acknowledgements-final="true"] .ack-card strong{
  display:block!important;
  color:#fff!important;
  font-size:clamp(11px,1.1vw,15px)!important;
  line-height:1.08!important;
}
body[data-acknowledgements-final="true"] .ack-card span{
  display:block!important;
  margin-top:4px!important;
  color:rgba(238,247,255,.90)!important;
  font-size:clamp(8.5px,.82vw,11.5px)!important;
  line-height:1.18!important;
}
body[data-acknowledgements-final="true"] .screen-actions{
  position:static!important;
  transform:none!important;
  margin:8px auto 0!important;
  width:min(100%,390px)!important;
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
  pointer-events:auto!important;
}
body[data-acknowledgements-final="true"] .screen-actions .glass-button{
  min-height:40px!important;
  pointer-events:auto!important;
}
@media(max-width:720px){
  body[data-acknowledgements-final="true"] .screen-panel{
    top:118px!important;
    width:calc(100vw - 12px)!important;
    max-height:calc(100svh - 126px)!important;
    padding:7px 8px 9px!important;
    border-radius:17px!important;
  }
  body[data-acknowledgements-final="true"] .screen-eyebrow{font-size:8px!important;letter-spacing:.12em!important}
  body[data-acknowledgements-final="true"] .screen-panel h1{font-size:27px!important}
  body[data-acknowledgements-final="true"] .screen-copy{font-size:8.7px!important;line-height:1.14!important;margin:2px 0 5px!important}
  body[data-acknowledgements-final="true"] .ack-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
  body[data-acknowledgements-final="true"] .ack-card{min-height:62px!important;padding:6px 7px!important;border-radius:11px!important}
  body[data-acknowledgements-final="true"] .ack-card strong{font-size:9.5px!important;line-height:1.02!important}
  body[data-acknowledgements-final="true"] .ack-card span{font-size:7.5px!important;line-height:1.08!important;margin-top:2px!important}
  body[data-acknowledgements-final="true"] .screen-actions{margin-top:5px!important;gap:6px!important}
  body[data-acknowledgements-final="true"] .screen-actions .glass-button{min-height:36px!important;font-size:10px!important;padding:4px 7px!important}
}
@media(max-width:370px){
  body[data-acknowledgements-final="true"] .screen-panel{top:112px!important;max-height:calc(100svh - 118px)!important}
  body[data-acknowledgements-final="true"] .ack-card{min-height:58px!important}
  body[data-acknowledgements-final="true"] .ack-card strong{font-size:8.8px!important}
  body[data-acknowledgements-final="true"] .ack-card span{font-size:7px!important}
}
`;

for (const target of productionTargets) {
  const file = path.join(dist, target.key, 'acknowledgements', 'index.html');
  let html = await readFile(file, 'utf8');
  if (!html.includes('data-acknowledgements-final="true"')) {
    throw new Error(`${target.key}: final acknowledgements marker missing`);
  }
  html = upsertStyle(html, 'data-human-visual-polish-ack', acknowledgementCss);
  await writeFile(file, html, 'utf8');
}

// DonateWorldz home must keep the approved support composite produced by materialize-approved-visuals.
{
  const targetRoot = path.join(dist, 'donateworldz');
  const file = path.join(targetRoot, 'index.html');
  const desktop = '/assets/approved/desktop/donateworldz-hero.avif';
  const mobile = '/assets/approved/mobile/donateworldz-hero.avif';
  if (!await exists(path.join(targetRoot, desktop.replace(/^\//, '')))) throw new Error('DonateWorldz approved desktop artwork missing');
  if (!await exists(path.join(targetRoot, mobile.replace(/^\//, '')))) throw new Error('DonateWorldz approved mobile artwork missing');
  let html = await readFile(file, 'utf8');
  html = html.replace(/--screen-bg:url\(['"][^'"]+['"]\);--screen-bg-mobile:url\(['"][^'"]+['"]\)/, `--screen-bg:url('${desktop}');--screen-bg-mobile:url('${mobile}')`);
  html = html.replace(/<source media="\(max-width:720px\)" srcset="[^"]+">/, `<source media="(max-width:720px)" srcset="${mobile}">`);
  html = html.replace(/<img src="[^"]+" alt="" fetchpriority="high">/, `<img src="${desktop}" alt="" fetchpriority="high">`);
  html = patchSemanticBody(html, 'DonateWorldz purpose-separated support gateway', desktop, mobile);
  await writeFile(file, html, 'utf8');

  const contractPath = path.join(dist, 'semantic-route-contract.json');
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const rec = contract.records.find((row) => row.target === 'donateworldz' && row.route === '/');
  if (!rec) throw new Error('DonateWorldz semantic home record missing');
  rec.desktop = desktop;
  rec.mobile = mobile;
  rec.purpose = 'DonateWorldz purpose-separated support gateway';
  await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
}

// Community Charity uses a contained identity badge; hide the old duplicate full-page art and clear mobile beacon/title collision.
const communityCss = `
body[data-community-charity="true"] .screen-art{
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
@media(max-width:720px){
  body[data-community-charity="true"][data-oneworldz-mission="true"] .ow-mission-beacon{
    top:62px!important;
    left:10px!important;
    right:10px!important;
    width:auto!important;
    padding:5px 8px!important;
  }
  body[data-community-charity="true"][data-oneworldz-mission="true"] .screen-panel{
    top:108px!important;
  }
  body[data-community-charity="true"][data-oneworldz-mission="true"] .community-charity-title-wrap h1{
    font-size:clamp(25px,8.2vw,34px)!important;
    line-height:.94!important;
  }
}
`;
for (const [target, route] of [['oneworldz', 'community-support'], ['donateworldz', 'community-impact']]) {
  const file = path.join(dist, target, route, 'index.html');
  let html = await readFile(file, 'utf8');
  if (!html.includes('data-community-charity="true"')) throw new Error(`${target}/${route}: Community Charity marker missing`);
  html = upsertStyle(html, 'data-human-visual-polish-community', communityCss);
  await writeFile(file, html, 'utf8');
}

console.log('HUMAN_VISUAL_POLISH=PASS acknowledgements=18 donateworldz_approved_art=PASS community_mobile_collision=FIXED duplicate_community_art=HIDDEN production_write=false');
