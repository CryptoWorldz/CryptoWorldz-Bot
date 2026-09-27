"use strict";
const fs=require("node:fs");
function read(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function ok(v,m){if(!v)throw new Error("WORLDZAPP_PLAY_RELEASE_PACK_FAIL:"+m)}
const test=read("apps/worldzapp-android/play-testing-checklist.v1.json");
const shots=read("apps/worldzapp-android/play-screenshot-plan.v1.json");
const copy=read("apps/worldzapp-android/play-console-copy.v1.json");
const sign=read("apps/worldzapp-android/signed-release-preparation.v1.json");
const data=read("apps/worldzapp-android/play-data-safety.v1.json");
const finance=read("apps/worldzapp-android/play-financial-features.v1.json");
const pre=read("apps/worldzapp-android/play-final-preflight.v1.json");
ok(test.schema==="WORLDZ-APP-PLAY-TESTING-CHECKLIST-V1","testing schema");
ok(test.security.transactionSigning===false && test.security.mainnetBroadcast===false,"security boundary");
ok(shots.phoneShots.length>=4,"screenshot plan");
ok(shots.rules.some(x=>/retired public branding/i.test(x)),"branding rule");
ok(copy.appName==="WorldzApp","app name");
ok(copy.privacyPolicy===pre.publicUrls.privacyCandidate,"privacy URL drift");
ok(copy.supportWebsite===pre.publicUrls.supportCandidate,"support URL drift");
ok(sign.inputs.applicationId===pre.identity.applicationIdCandidate,"package drift");
ok(sign.inputs.finalLogoSha256===pre.codeSide.finalOwnerApprovedLogoMasterSha256,"logo checksum drift");
ok(sign.releaseAuthorized===false,"release authorization");
ok(data.finalPlayFormReady===false,"Data Safety must remain final-audit pending");
ok(finance.financialFeaturesFormRequired===true,"financial declaration required");
ok(sign.inputs.playAppSigningCertificateSha256==="PENDING_FROM_PLAY_CONSOLE","must not invent signing certificate");
const joined=JSON.stringify({test,shots,copy,sign,data,finance});
ok(!/OneWorldz/i.test(joined),"retired public branding");
console.log("WORLDZAPP_PLAY_RELEASE_PACK=PASS");
console.log("screenshots=PLAN_READY device_capture=PENDING signing=PENDING data_safety=FINAL_AUDIT_PENDING financial_features=FINAL_CONFIRMATION_PENDING release=false");
