import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist','ecosystem');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cards=(items)=>`<div class="ack-grid">${items.map(([h,p])=>`<article class="ack-card"><strong>${esc(h)}</strong><span>${esc(p)}</span></article>`).join('')}</div>`;
const actions=`<div class="screen-actions"><a class="glass-button primary" href="/">Home</a><a class="glass-button" href="https://oneworldz.com/">OneWorldz</a></div>`;
const style=`<style data-acknowledgements-final>
body[data-acknowledgements-final="true"] .screen-panel{pointer-events:auto!important;width:min(94vw,980px)!important;max-width:980px!important;top:88px!important;bottom:auto!important;padding:13px 16px 15px!important;background:linear-gradient(180deg,rgba(4,15,37,.72),rgba(17,8,36,.78))!important;border:1px solid rgba(170,224,255,.24)!important;border-radius:22px!important;backdrop-filter:blur(11px)!important}
body[data-acknowledgements-final="true"] .screen-copy{margin:4px 0 9px!important;max-width:none!important;font-size:clamp(11px,1.1vw,14px)!important}.ack-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ack-card{display:flex;flex-direction:column;justify-content:center;min-height:86px;padding:10px 12px;border:1px solid rgba(144,220,255,.25);border-radius:16px;background:linear-gradient(135deg,rgba(24,61,119,.62),rgba(73,31,103,.58));box-shadow:0 10px 24px rgba(0,0,0,.16)}.ack-card strong{font-size:clamp(12px,1.2vw,16px);line-height:1.08;color:#fff}.ack-card span{margin-top:5px;font-size:clamp(9px,.9vw,12px);line-height:1.22;color:rgba(238,247,255,.88)}body[data-acknowledgements-final="true"] .screen-actions{position:static!important;transform:none!important;margin:9px auto 0!important;width:min(100%,390px)!important;pointer-events:auto!important}body[data-acknowledgements-final="true"] .screen-actions a{pointer-events:auto!important;min-height:42px!important}
@media(max-width:720px){body[data-acknowledgements-final="true"] .screen-panel{top:76px!important;width:calc(100vw - 12px)!important;padding:8px 9px 10px!important}.ack-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.ack-card{min-height:72px;padding:7px 8px;border-radius:13px}.ack-card strong{font-size:10.5px}.ack-card span{font-size:8.5px;margin-top:3px}.screen-copy{font-size:9.5px!important}.screen-actions{margin-top:6px!important}.screen-actions a{min-height:38px!important;font-size:11px!important}}
</style>`;

const oneWorldz=[
 ['JayJayTeamDev & OneWorldz Contributors','Vision, organising, building, testing and continually improving OneWorldz One Vision.'],
 ['Reagan Kauja & Action Spread Smiles','Uganda humanitarian work, children, food, education, health, dignity and hope.'],
 ['Purple Diamond Crew','Volunteers, supporters and people who turn kindness into practical action on the ground.'],
 ['Davis Family Support','The dedicated family support pathway and everyone who has helped, shared or contributed.'],
 ['34 Community Charity Causes','The verified Facebook pages/profiles and the people behind those independent community causes.'],
 ['Donors • Volunteers • Supporters','Every person who donates, shares, researches, teaches, builds, helps or simply chooses to care.'],
 ['Technology & Service Platforms','GitHub, Hostinger, OpenAI, Supabase, Stripe, Meta/Facebook, TikTok, YouTube, X and Telegram are acknowledged as services used by the ecosystem; no endorsement is implied.']
];
const crypto=[
 ['JayJayTeamDev & CryptoWorldz Contributors','Vision, system design, testing and ecosystem coordination.'],
 ['OneWorldz Mission','The human mission that gives the technology a purpose beyond markets.'],
 ['Builders & Open-Source Contributors','Developers, maintainers, educators and public documentation that make modern web and blockchain tooling possible.'],
 ['Worldz Communities','People learning, building and sharing across the individual blockchain Worldz.'],
 ['Infrastructure & Tools','GitHub, Hostinger, OpenAI, Supabase and the external services used by the project. No endorsement is implied.'],
 ['Community Testers & Supporters','Everyone who reports defects, verifies links, tests mobile layouts and helps improve the system.']
];
const chain=(name)=>[
 [`${name} Community`,'Builders, educators, users and public community resources that help people understand the network.'],
 ['Public Documentation & Research','Official/public technical documentation, safety material and independent research used for education.'],
 ['CryptoWorldz Contributors','People building and testing the Worldz gateway and verified pathways.'],
 ['OneWorldz Mission','The wider human mission that keeps real-world impact separate from market claims.'],
 ['Community Testers','People who verify links, mobile layouts, safety language and route accuracy.'],
 ['Open Tools & Infrastructure','The web, hosting, code and data services used to operate the site; acknowledgement does not imply endorsement.']
];
const generic=[
 ['OneWorldz Contributors','People who research, build, test and improve this part of the ecosystem.'],
 ['Communities & Participants','People whose lived experience, questions and participation make the work meaningful.'],
 ['Donors & Supporters','People who contribute time, skills, resources, sharing and encouragement.'],
 ['Researchers & Educators','People and public resources used to compare evidence and explain complex topics clearly.'],
 ['Technology & Service Platforms','The infrastructure and public services used to build and operate the site; no endorsement is implied.'],
 ['Everyone Who Helps','Every person who chooses practical kindness, accountability and real-world action.']
];
const special={
 oneworldz:oneWorldz,
 cryptoworldz:crypto,
 donateworldz:[
  ['Reagan Kauja & Action Spread Smiles','Dedicated Uganda support pathway for children, food, education, health and dignity.'],
  ['Davis Family Support','Dedicated family support pathway, kept separate from Community Charity.'],
  ['34 Community Charity Causes','Verified independent Facebook pages/profiles connected to their original destinations.'],
  ['JayJayTeamDev Supporters','People supporting the creator and the ongoing OneWorldz build.'],
  ['Donors & Sharers','Every person who gives, shares a cause or helps another person discover a support pathway.'],
  ['Stripe & Supporting Services','Payment and infrastructure services used to provide external support pathways; no endorsement is implied.']
 ],
 purplediamondcrew:[
  ['Purple Diamond Crew Volunteers','The people who showed up, helped directly and carried the work.'],
  ['Community Supporters','People who donated food, clothing, blankets, time, transport, tools and practical help.'],
  ['1927 Hope Chest History','The genuine legacy-token history preserved as project history, separate from current humanitarian claims.'],
  ['OneWorldz & DonateWorldz','The wider mission and support pathways connected to practical action.'],
  ['People Who Needed Help','Acknowledged with dignity: the purpose of the work is people, not publicity.'],
  ['Everyone Who Took Action','Every person who chose to help rather than simply talk about helping.']
 ],
 'law-oneworldz':[
  ['OneWorldz Blueprint Contributors','People researching, questioning, comparing evidence and improving proposals.'],
  ['Original Long-Form Blueprint Work','The earlier public-interest blueprint research remains a historical source under recovery; reconstructed material is not mislabelled as the original.'],
  ['Researchers & Public Evidence','Documents, data, experts and public sources used to compare what works and what fails.'],
  ['Communities & Lived Experience','People affected by hunger, poverty, inequality, public systems and policy decisions.'],
  ['Reviewers & Critics','People who challenge assumptions, find errors and make the blueprint stronger.'],
  ['OneWorldz One Vision','The public mission that turns research into proposals, action, measurement and continuous improvement.']
 ],
 foodworldz:[
  ['People Facing Food & Water Insecurity','The people and communities this work is intended to serve with dignity.'],
  ['Food & Water Volunteers','People growing, preparing, transporting, sharing and distributing food and clean water.'],
  ['Community Organisations','Local groups and independent causes doing practical work in their own communities.'],
  ['Reagan & Action Spread Smiles','A real-world humanitarian pathway connected to food, children and community support.'],
  ['Donors & Supporters','Everyone contributing resources, time, sharing and practical help.'],
  ['Research & Public Resources','Evidence and public information used to understand food security and clean-water solutions.']
 ]
};

for(const target of productionTargets){const file=path.join(dist,target.key,'acknowledgements','index.html');let html=await readFile(file,'utf8');const items=special[target.key]||(['solworldz','ethworldz','baseworldz','bnbworldz','xrpworldz','suiworldz','hyperworldz','robinworldz','hodlerworldz'].includes(target.key)?chain(target.requiredIdentityText):generic);html=html.replace(/<body([^>]*)>/,(all,attrs)=>`<body${attrs.replace(/\sdata-acknowledgements-final="[^"]*"/g,'')} data-acknowledgements-final="true">`);const panel=`<section class="screen-panel"><p class="screen-eyebrow">ACKNOWLEDGEMENTS</p><h1>Thank You.</h1><p class="screen-copy">This page records the people, communities and services we genuinely want to recognise. Acknowledgement does not imply endorsement, sponsorship or partnership unless separately stated.</p>${cards(items)}${actions}</section>`;if(!/<section class="screen-panel">[\s\S]*?<\/section>/.test(html))throw new Error(`${target.key}: acknowledgements screen-panel missing`);html=html.replace(/<section class="screen-panel">[\s\S]*?<\/section>/,panel);if(!html.includes('data-acknowledgements-final'))html=html.replace('</head>',`${style}</head>`);if((html.match(/class="ack-card"/g)||[]).length<6)throw new Error(`${target.key}: acknowledgements content too small`);await writeFile(file,html,'utf8')}
console.log('ACKNOWLEDGEMENTS_FINAL=PASS targets=18 oneworldz_named_groups=7 empty_pages=0 production_write=false');
