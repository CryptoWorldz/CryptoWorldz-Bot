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
assert(release.branding?.ownerApprovedCentreEmblem===true,"owner-approved centre emblem must be locked");
assert(release.branding?.sourceSha256==="685fac492b05fc104ebb368517292d43eb1ac1ac890d353e7db73a8c9feb7050","approved emblem checksum drift");
assert(release.branding?.regenerationAllowed===false,"approved emblem must not be regenerated");
assert(release.branding?.androidAssetImport==="COMMITTED_AND_VERIFIED","production emblem asset import must be verified");
assert(release.branding?.androidAssetsReady===true,"production emblem assets must be ready");
assert(release.branding?.playIcon?.sha256==="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d","Play release icon hash drift");
assert(release.branding?.maskableIcon?.sha256==="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15","Play release maskable hash drift");
assert(listing.graphics.appIcon==="apps/worldzapp-android/assets/worldz-app-icon-512.png","listing Play icon path drift");
assert(listing.graphics.appIconSha256==="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d","listing Play icon hash drift");
assert(listing.graphics.maskableIconSha256==="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15","listing maskable hash drift");
assert(emblem.masterSource.sha256===release.branding.sourceSha256,"approved emblem registry/source hash drift");
assert(emblem.approval.regenerationAllowed===false,"approved emblem registry regeneration rule drift");
assert(fs.existsSync(emblem.repositoryPreview.path),"approved emblem preview missing");
assert(sha256(emblem.repositoryPreview.path)===emblem.repositoryPreview.sha256,"approved emblem preview checksum mismatch");
assert(listing.graphics.approvedEmblemPreview===emblem.repositoryPreview.path,"listing preview path drift");

assert(android.packaging.targetSdk===36&&android.packaging.compileSdk===36,"Android package API drift");
assert(android.releaseSecurity.signedReleaseBuilt===false,"signed AAB may not be falsely claimed");
assert(android.releaseSecurity.publicReleaseAuthorized===false,"Android public release must remain off");
assert(worldz.simulationFoundation?.liveProof?.state==="PASSED","Stage 4B proof prerequisite");
assert(worldz.multisigApprovalFoundation?.liveProof?.squadsWldz?.state==="PASSED" || worldz.multisigApprovalFoundation?.liveProof?.squads?.state==="PASSED","Stage 5B Squads proof prerequisite");
assert(worldz.appSecurity?.mainnetBroadcastEnabled===false,"WorldzApp mainnet broadcast must remain off");

const blockers=release.releaseBlockers;
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
console.log("approved_emblem=LOCKED preview=CHECKSUM_VERIFIED production_icons=READY play_app_signing=PENDING signed_aab=PENDING");
