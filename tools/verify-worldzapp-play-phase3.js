"use strict";
const fs=require("node:fs");
function read(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function assert(v,m){if(!v)throw new Error("WORLDZAPP_PLAY_PHASE3_FAIL:"+m)}
const pre=read("apps/worldzapp-android/play-final-preflight.v1.json");
const icons=read("apps/worldzapp-android/final-icon-pack.v1.json");
const data=read("apps/worldzapp-android/play-data-safety.v1.json");
const finance=read("apps/worldzapp-android/play-financial-features.v1.json");
const listing=read("apps/worldzapp-android/play-store-listing.v1.json");
const testing=read("apps/worldzapp-android/play-testing-checklist.v1.json");
const shots=read("apps/worldzapp-android/play-screenshot-plan.v1.json");
const signing=read("apps/worldzapp-android/signed-release-preparation.v1.json");

assert(pre.codeSide.finalOwnerApprovedLogoMasterSha256===icons.finalMaster.sha256,"final logo master drift");
assert(icons.finalMaster.sha256==="e23b67694d0a28e2775e57a80511a3407bc9e39751661d1fbf378f560ff97eec","approved master checksum");
assert(pre.codeSide.finalSignedAabPipelineBuilt===true,"signed AAB pipeline");
assert(signing.release.manualDispatchOnly===true&&signing.release.autoSubmitToPlay===false,"manual release boundary");
assert(signing.uploadSigning.keystoreCommitted===false,"keystore boundary");
assert(data.finalPlayFormReady===false,"Data Safety must not be falsely final");
assert(data.currentCore.worldzHostedAccountCreation===false,"account baseline");
assert(data.currentCore.analyticsConfigured===false&&data.currentCore.adSdkConfigured===false,"analytics/ads baseline");
assert(finance.currentExecutionTruth.custodialWallet===false,"non-custodial boundary");
assert(finance.currentExecutionTruth.mainnetAppBroadcast===false,"broadcast boundary");
assert(finance.releaseCandidateDraft.expectedSelection==="Cryptocurrency wallet","financial feature draft");
assert(listing.graphics.finalLogoMasterSha256===icons.finalMaster.sha256,"listing logo master");
assert(listing.graphics.appIconSha256===icons.assets.play512.sha256,"listing Play icon hash");
assert(listing.graphics.maskableIconSha256===icons.assets.maskable512.sha256,"listing maskable hash");
assert(testing.completionEvidence.passed===false,"testing may not be pre-claimed passed");
assert(Array.isArray(shots.phoneShots)&&shots.phoneShots.length>=6,"screenshot capture plan");
assert(fs.existsSync(".github/workflows/worldzapp-final-release-aab.yml"),"final AAB workflow");
console.log("WORLDZAPP_PLAY_PHASE3=PASS");
console.log("final_assets=PREPARED_IMPORT_PENDING data_safety=DRAFT financial_features=DRAFT");
console.log("store_copy=READY screenshots=CAPTURE_PENDING testing=READY signed_release=PIPELINE_BUILT");
