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
  assert.match(html,/248/);
  assert.match(html,/REX SECUREGUARD™/);
  assert.match(html,/WORLDZ SPOTLIGHT™/);
  assert.equal(campaign.commandCentre.registeredCommandEntries,248);
  for(const item of ["ZED","REX SecureGuard™","DIPSHIT™","Ronald Raider","Worldz Spotlight™"]) {
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
