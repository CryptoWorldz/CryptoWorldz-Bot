"use strict";
const fs=require("node:fs");
const cp=require("node:child_process");

function assert(v,m){if(!v)throw new Error("WORLDZAPP_PLAY_PHASE2_FAIL:"+m)}
function read(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
const preflight=read("apps/worldzapp-android/play-final-preflight.v1.json");
const release=read("apps/worldzapp-android/play-release.v1.json");
const listing=read("apps/worldzapp-android/play-store-listing.v1.json");

assert(preflight.schema==="WORLDZ-APP-PLAY-FINAL-PREFLIGHT-V1","preflight schema");
assert(preflight.codeSide.api36===true,"API 36");
assert(preflight.codeSide.unsignedAabCompilationProven===true,"unsigned AAB proof");
assert(preflight.codeSide.approvedProductionIconsReady===true,"approved production icons");
assert(preflight.codeSide.privacySurfaceBuilt===true,"privacy surface");
assert(preflight.codeSide.supportSurfaceBuilt===true,"support surface");
assert(preflight.codeSide.assetlinksRendererBuilt===true,"assetlinks renderer");
assert(preflight.releaseAuthorized===false,"release authorization must stay false");
assert(fs.existsSync("launchpad.cryptoworldz.xyz/worldz-app/privacy/index.html"),"privacy page missing");
assert(fs.existsSync("launchpad.cryptoworldz.xyz/worldz-app/support/index.html"),"support page missing");
assert(!fs.existsSync("launchpad.cryptoworldz.xyz/.well-known/assetlinks.json"),"real assetlinks must not be committed before Play signing fingerprint exists");
for(const p of ["launchpad.cryptoworldz.xyz/worldz-app/privacy/index.html","launchpad.cryptoworldz.xyz/worldz-app/support/index.html"]){
  const text=fs.readFileSync(p,"utf8");
  assert(!/OneWorldz/i.test(text),"retired public brand found in "+p);
  assert(!/seed phrase.*send|private key.*send/i.test(text),"unsafe support wording in "+p);
}
assert(listing.privacyPolicyUrl===preflight.publicUrls.privacyCandidate,"privacy URL drift");
assert(listing.supportWebsite===preflight.publicUrls.supportCandidate,"support URL drift");
assert(release.android.applicationId===preflight.identity.applicationIdCandidate,"application ID drift");

cp.execFileSync(process.execPath,["tools/render-worldzapp-assetlinks.js","--check"],{
  env:{...process.env,WORLDZAPP_PLAY_SIGNING_SHA256:"11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00"},
  stdio:"pipe"
});

console.log("WORLDZAPP_PLAY_PHASE2=PASS");
console.log("privacy_surface=BUILT support_surface=BUILT assetlinks_renderer=READY");
console.log("play_identity=PENDING signing=PENDING deployment_verification=PENDING release=false");
