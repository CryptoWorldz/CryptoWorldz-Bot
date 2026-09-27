"use strict";
const fs=require("node:fs");
const crypto=require("node:crypto");

function read(path){return JSON.parse(fs.readFileSync(path,"utf8"))}
function assert(value,message){if(!value)throw new Error("WORLDZAPP_ANDROID_PRECHECK_FAIL:"+message)}
function sha256(path){return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex")}

const contract=read("apps/worldzapp-android/android-package.v1.json");
const twa=read("apps/worldzapp-android/twa-manifest.template.json");
const assetlinks=read("apps/worldzapp-android/assetlinks.template.json");
const web=read("launchpad.cryptoworldz.xyz/worldz-app/manifest.webmanifest");
const worldz=read("worldzpad-omnichain/fullscope/worldz-app.v1.json");
const emblem=read("apps/worldzapp-android/approved-emblem.v1.json");

assert(contract.schema==="WORLDZ-APP-ANDROID-PACKAGE-V1","contract schema");
assert(contract.packaging.technology==="TRUSTED_WEB_ACTIVITY","TWA required");
assert(contract.packaging.bubblewrapVersion==="1.25.0","Bubblewrap pin");
assert(contract.packaging.targetSdk===36&&contract.packaging.compileSdk===36,"API 36 required");
assert(contract.packaging.requiredOutput==="ANDROID_APP_BUNDLE_AAB","AAB required");
assert(contract.packaging.rebuildWebApp===false,"must reuse proven PWA");

assert(/^([a-zA-Z][a-zA-Z0-9_]*\.)+[a-zA-Z][a-zA-Z0-9_]*$/.test(twa.packageId),"candidate package id format");
assert(twa.packageId===contract.androidIdentity.candidateApplicationId,"package id drift");
assert(twa.host==="launchpad.cryptoworldz.xyz","host drift");
assert(twa.startUrl==="/worldz-app/","start URL drift");
assert(twa.fullScopeUrl==="https://launchpad.cryptoworldz.xyz/worldz-app/","scope drift");
assert(twa.minSdkVersion>=23,"minSdk too low");
assert(Array.isArray(twa.fingerprints)&&twa.fingerprints.length===0,"fingerprint may not be invented");
assert(twa.releaseGate&&twa.releaseGate.templateOnly===true,"template gate required");
assert(twa.releaseGate.iconUrl==="PENDING_FINAL_512_PNG_EXPORT_FROM_OWNER_APPROVED_WORLDZ_EMBLEM","final icon must remain gated");
assert(twa.releaseGate.maskableIconUrl==="PENDING_FINAL_512_MASKABLE_PNG_EXPORT_FROM_OWNER_APPROVED_WORLDZ_EMBLEM","final maskable icon must remain gated");
assert(twa.releaseGate.iconApproval==="OWNER_APPROVED_SOURCE_REGISTERED","owner approval marker required");
assert(twa.releaseGate.signingKey==="NOT_COMMITTED_TO_REPOSITORY","signing secret boundary");

assert(web.name==="WorldzApp™","PWA name drift");
assert(web.start_url==="/worldz-app/"&&web.scope==="/worldz-app/","PWA route drift");
assert(["standalone","fullscreen","minimal-ui"].includes(web.display),"PWA display unsupported");
assert(web.icons.some(icon=>icon.src==="/worldz-app/worldz-app-icon.svg"),"existing PWA fallback icon missing");
assert(web.approvedWorldzEmblem?.state==="OWNER_APPROVED_SOURCE_REGISTERED__FINAL_PNG_PENDING","PWA approved-emblem state drift");

assert(assetlinks.length===1,"assetlinks template");
assert(assetlinks[0].target.package_name===twa.packageId,"assetlinks package drift");
assert(assetlinks[0].target.sha256_cert_fingerprints[0]==="__PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINT_REQUIRED__","certificate fingerprint must remain explicit gate");

assert(contract.releaseSecurity.signedReleaseBuilt===false,"signed release cannot be claimed");
assert(contract.releaseSecurity.publicReleaseAuthorized===false,"release authorization must remain false");
assert(contract.releaseSecurity.mainnetBroadcastEnabledByAndroidPackage===false,"Android package cannot unlock broadcast");
assert(contract.releaseSecurity.privateKeyOrSeedPhraseBundled===false,"secret material forbidden");
assert(contract.assetGates.officialCenterLogoRasterReady===true,"approved Worldz emblem raster must be ready");
assert(contract.assetGates.ownerApproved===true,"owner-approved emblem flag required");
assert(emblem.approval.ownerApproved===true,"approved emblem registry must record owner approval");
assert(fs.existsSync(emblem.releaseDerivative.androidAssetPath),"Android approved emblem asset missing");
assert(fs.existsSync(emblem.releaseDerivative.publicPath),"public approved emblem asset missing");
assert(sha256(emblem.releaseDerivative.androidAssetPath)===emblem.releaseDerivative.sha256,"Android approved emblem checksum mismatch actual="+sha256(emblem.releaseDerivative.androidAssetPath)+" expected="+emblem.releaseDerivative.sha256);
assert(sha256(emblem.releaseDerivative.publicPath)===emblem.releaseDerivative.sha256,"public approved emblem checksum mismatch");
assert(worldz.simulationFoundation?.liveProof?.state==="PASSED","Stage 4B proof prerequisite");
assert(worldz.multisigApprovalFoundation?.liveProof?.squadsWldz?.state==="PASSED","Stage 5B Squads proof prerequisite");
assert(worldz.appSecurity?.mainnetBroadcastEnabled===false,"WorldzApp mainnet broadcast must remain off");

console.log("WORLDZAPP_ANDROID_API36_FOUNDATION=PASS");
console.log("package_id_candidate="+twa.packageId);
console.log("target_sdk=36 compile_sdk=36 bubblewrap=1.25.0");
console.log("signed_aab=OFF public_release=OFF digital_asset_links=PENDING approved_emblem_source=BOUND final_512_raster=PENDING");
