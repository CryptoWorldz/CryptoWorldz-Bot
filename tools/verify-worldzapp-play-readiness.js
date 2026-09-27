"use strict";
const fs=require("node:fs");
const crypto=require("node:crypto");

function read(path){return JSON.parse(fs.readFileSync(path,"utf8"))}
function assert(value,message){if(!value)throw new Error("WORLDZAPP_PLAY_READINESS_FAIL:"+message)}
function sha256(path){return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex")}

const release=read("apps/worldzapp-android/play-release.v1.json");
const data=read("apps/worldzapp-android/play-data-safety.v1.json");
const finance=read("apps/worldzapp-android/play-financial-features.v1.json");
const access=read("apps/worldzapp-android/play-review-access.v1.json");
const listing=read("apps/worldzapp-android/play-store-listing.v1.json");
const android=read("apps/worldzapp-android/android-package.v1.json");
const worldz=read("worldzpad-omnichain/fullscope/worldz-app.v1.json");
const emblem=read("apps/worldzapp-android/approved-emblem.v1.json");

assert(release.schema==="WORLDZ-APP-GOOGLE-PLAY-RELEASE-V1","release schema");
assert(release.submissionReady===false,"submission may not be claimed ready");
assert(release.publicReleaseAuthorized===false,"public release authorization must remain false");
assert(release.android.targetSdk>=36,"targetSdk must be API 36 or higher");
assert(release.android.compileSdk>=36,"compileSdk must be API 36 or higher");
assert(release.android.releaseFormat==="ANDROID_APP_BUNDLE_AAB","AAB release required");
assert(release.android.applicationId===android.androidIdentity.candidateApplicationId,"application ID drift");

assert(data.finalPlayFormReady===false,"Data safety final form may not be pre-claimed");
assert(data.currentCore.worldzHostedAccountCreation===false,"current account-creation baseline drift");
assert(data.currentCore.walletCustody==="EXTERNAL_NON_CUSTODIAL","wallet custody boundary drift");
for(const forbidden of ["seed phrase","private key","recovery phrase"]){
  assert(data.currentCore.forbiddenData.includes(forbidden),"forbidden data inventory missing "+forbidden);
}

assert(finance.financialFeaturesFormRequired===true,"financial features declaration must remain required");
assert(finance.expectedSelectionsForCurrentCore.some(x=>x.playCategory==="Cryptocurrency wallet"),"crypto wallet declaration candidate required");
assert(finance.currentExecutionTruth.custodialWallet===false,"custody claim drift");
assert(finance.currentExecutionTruth.seedPhraseCollection===false,"seed phrase collection forbidden");
assert(finance.currentExecutionTruth.privateKeyCollection===false,"private key collection forbidden");
assert(finance.currentExecutionTruth.mainnetAppBroadcast===false,"mainnet app broadcast must remain off");

assert(access.publicCoreAccess.requiresWorldzAccount===false,"public core must remain reviewable without Worldz account");
assert(access.publicCoreAccess.requiresWallet===false,"reviewer must not need a wallet for public core");
assert(access.publicCoreAccess.requiresPayment===false,"reviewer must not need payment for public core");

assert(listing.appName==="WorldzApp","listing name drift");
assert(!/profit|guaranteed return|guaranteed yield/i.test(listing.fullDescriptionDraft),"prohibited/misleading investment language in draft listing");
assert(listing.graphics.appIcon===emblem.releaseDerivative.androidAssetPath,"Play listing icon path drift");
assert(listing.graphics.appIconState==="OWNER_APPROVED_AND_REPOSITORY_BOUND","Play listing icon approval state");
assert(listing.graphics.appIconSha256===emblem.releaseDerivative.sha256,"Play listing icon checksum registry drift");
assert(sha256(listing.graphics.appIcon)===emblem.releaseDerivative.sha256,"Play listing icon checksum mismatch");

assert(android.packaging.targetSdk===36&&android.packaging.compileSdk===36,"Android package API drift");
assert(android.releaseSecurity.signedReleaseBuilt===false,"signed AAB may not be falsely claimed");
assert(android.releaseSecurity.publicReleaseAuthorized===false,"Android public release must remain off");
assert(worldz.simulationFoundation?.liveProof?.state==="PASSED","Stage 4B proof prerequisite");
assert(worldz.multisigApprovalFoundation?.liveProof?.squadsWldz?.state==="PASSED" || worldz.multisigApprovalFoundation?.liveProof?.squads?.state==="PASSED","Stage 5B Squads proof prerequisite");
assert(worldz.appSecurity?.mainnetBroadcastEnabled===false,"WorldzApp mainnet broadcast must remain off");

const blockers=release.releaseBlockers;
assert(!blockers.includes("OWNER_APPROVED_CENTER_LOGO_512_AND_MASKABLE_ASSETS"),"approved emblem blocker should be cleared");
assert((release.clearedGates||[]).includes("OWNER_APPROVED_CENTER_LOGO_512_AND_MASKABLE_ASSETS"),"approved emblem cleared gate missing");
for(const required of [
  "VERIFIED_PLAY_DEVELOPER_IDENTITY",
  "PUBLIC_PRIVACY_POLICY_URL",
  "FINAL_DATA_SAFETY_AUDIT_AND_PLAY_FORM",
  "FINAL_FINANCIAL_FEATURES_DECLARATION",
  "PLAY_APP_SIGNING_CONFIGURATION",
  "DEPLOYED_DIGITAL_ASSET_LINKS",
  "SIGNED_AAB",
  "FINAL_HUMAN_RELEASE_AUTHORIZATION"
]) assert(blockers.includes(required),"release blocker missing "+required);

console.log("WORLDZAPP_GOOGLE_PLAY_READINESS_FOUNDATION=PASS");
console.log("submission_ready=false public_release=false");
console.log("target_sdk="+release.android.targetSdk+" format="+release.android.releaseFormat);
console.log("data_safety=FINAL_AUDIT_REQUIRED financial_features=FINAL_CONFIRMATION_REQUIRED");
console.log("approved_icon=OWNER_APPROVED_BOUND play_app_signing=PENDING signed_aab=PENDING");
