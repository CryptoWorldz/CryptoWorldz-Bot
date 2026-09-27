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
assert(release.branding?.sourceSha256==="e23b67694d0a28e2775e57a80511a3407bc9e39751661d1fbf378f560ff97eec","final approved WorldzApp logo checksum drift");
assert(release.branding?.regenerationAllowed===false,"approved logo must not be regenerated");
assert(release.branding?.androidAssetImport==="FINAL_BINARY_RECONCILIATION_REQUIRED","final logo binary gate must stay explicit");
assert(release.branding?.androidAssetsReady===false,"final Play logo assets may not be pre-claimed ready");
assert(release.branding?.previousBuildAssets?.state==="SUPERSEDED_FOR_FINAL_PLAY_RELEASE","previous icon assets must remain superseded");
assert(listing.graphics.finalLogoMasterSha256===release.branding.sourceSha256,"listing final logo master hash drift");
assert(listing.graphics.appIcon==="PENDING_FINAL_APPROVED_WORLDZAPP_LOGO_512_PNG","final Play icon must remain pending until exact binary reconciliation");
assert(listing.graphics.maskableIcon==="PENDING_FINAL_APPROVED_WORLDZAPP_LOGO_MASKABLE_512_PNG","final maskable icon must remain pending until exact binary reconciliation");
assert(emblem.masterSource.sha256===release.branding.sourceSha256,"final approved logo registry/source hash drift");
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
  "FINAL_APPROVED_LOGO_BINARY_ASSET_RECONCILIATION",
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
console.log("final_worldzapp_logo=LOCKED final_icon_binaries=RECONCILIATION_REQUIRED play_app_signing=PENDING signed_aab=PENDING");
