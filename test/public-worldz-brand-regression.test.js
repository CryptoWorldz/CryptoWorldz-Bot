const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("launch announcement workflows are manual-only and cannot resurrect retired control/branding",()=>{
  for(const file of [
    ".github/workflows/announce-worldzlaunchpad-global.yml",
    ".github/workflows/publish-worldzlaunchpad-x-direct.yml"
  ]){
    const text=read(file);
    const trigger=text.slice(text.indexOf("on:"),text.indexOf("permissions:"));
    assert.match(trigger,/workflow_dispatch:/,file);
    assert.doesNotMatch(trigger,/\bpush:/,file);
    assert.doesNotMatch(text,/\bRECAP\b|RecapThisBot|@OneWorldzX|OneWorldz is the humanitarian mission|oneworldz\.com/i,file);
    assert.doesNotMatch(text,/missions, wallets|governance & more/i,file);
  }
});

test("WorldzLaunch Pack exposes current ZED-led modules and Spotlight",()=>{
  const html=read("launchpad.cryptoworldz.xyz/worldz-launch/index.html");
  const campaign=JSON.parse(read("launchpad.cryptoworldz.xyz/worldz-launch/campaign.json"));
  assert.match(html,/252/);
  assert.match(html,/REXSECURE ULTIMATE™/);
  assert.match(html,/WORLDZ SPOTLIGHT™/);
  assert.equal(campaign.commandCentre.registeredCommandEntries,252);
  for(const item of ["ZED","REXSECURE ULTIMATE™","DIPSHIT™","Ronald Raider","Worldz Spotlight™"]) {
    assert.ok(campaign.commandCentre.modules.includes(item),item);
  }
});

test("visible Raid experience does not present Missions as the primary system",()=>{
  const experience=read("public/miniapp/experience.js");
  const registry=read("src/command-registry.js");
  assert.doesNotMatch(experience,/My Missions|MISSION EVIDENCE|Mission #/);
  assert.match(experience,/My Raids|RAID EVIDENCE|Raid #/);
  assert.match(registry,/Admin • Raids, Reviews, Members & Settings/);
  assert.match(registry,/Ronald Raider Raid/);
});


test("Create Your Own Money campaign is accurate, connected and non-misleading",()=>{
  const html=read("launchpad.cryptoworldz.xyz/create-your-own-money/index.html");
  const launch=read("launchpad.cryptoworldz.xyz/worldz-launch/index.html");
  const campaign=JSON.parse(read("launchpad.cryptoworldz.xyz/worldz-launch/campaign.json"));
  const social=JSON.parse(read("launchpad.cryptoworldz.xyz/worldz-launch/social-pack.json"));
  assert.match(html,/CREATE[\s\S]*YOUR OWN[\s\S]*MONEY/i);
  assert.match(html,/create your own crypto token/i);
  assert.match(html,/not automatically legal tender/i);
  assert.match(html,/does not guarantee value|not automatically.*valuable/i);
  assert.match(html,/BUILD MY TOKEN PLAN/);
  assert.match(html,/\/launch-station\//);
  assert.match(html,/\/community\//);
  assert.match(html,/\/advertise\//);
  assert.doesNotMatch(html,/guaranteed profit|guaranteed returns|guaranteed 1000×/i);
  assert.match(launch,/\/create-your-own-money\//);
  assert.equal(campaign.creatorCampaign.id,"CREATE_YOUR_OWN_MONEY_2026_10_02");
  assert.equal(campaign.creatorCampaign.url,"https://launchpad.cryptoworldz.xyz/create-your-own-money/");
  assert.ok(Array.isArray(social.creatorCampaign.x));
  assert.ok(social.creatorCampaign.x.length>=2);
});
