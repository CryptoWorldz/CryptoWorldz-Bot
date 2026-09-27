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
assert(twa.releaseGate.iconUrl==="https://launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-app-icon-512.png","approved Play icon URL drift");
assert(twa.releaseGate.maskableIconUrl==="https://launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-app-icon-maskable-512.png","approved maskable icon URL drift");
assert(twa.releaseGate.playIconSha256==="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d","approved Play icon hash drift");
assert(twa.releaseGate.maskableIconSha256==="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15","approved maskable icon hash drift");
assert(twa.releaseGate.signingKey==="NOT_COMMITTED_TO_REPOSITORY","signing secret boundary");

assert(web.name==="WorldzApp™","PWA name drift");
assert(web.start_url==="/worldz-app/"&&web.scope==="/worldz-app/","PWA route drift");
assert(["standalone","fullscreen","minimal-ui"].includes(web.display),"PWA display unsupported");

assert(assetlinks.length===1,"assetlinks template");
assert(assetlinks[0].target.package_name===twa.packageId,"assetlinks package drift");
assert(assetlinks[0].target.sha256_cert_fingerprints[0]==="__PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINT_REQUIRED__","certificate fingerprint must remain explicit gate");

assert(contract.releaseSecurity.signedReleaseBuilt===false,"signed release cannot be claimed");
assert(contract.releaseSecurity.publicReleaseAuthorized===false,"release authorization must remain false");
assert(contract.releaseSecurity.mainnetBroadcastEnabledByAndroidPackage===false,"Android package cannot unlock broadcast");
assert(contract.releaseSecurity.privateKeyOrSeedPhraseBundled===false,"secret material forbidden");
assert(contract.assetGates.officialCenterLogoRasterReady===true,"final production raster must be ready");
assert(contract.assetGates.playIcon?.sha256==="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d","Play icon contract hash drift");
assert(contract.assetGates.maskableIcon?.sha256==="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15","maskable icon contract hash drift");
assert(contract.assetGates.ownerApprovedSourceRegistered===true,"approved emblem source must be registered");
assert(emblem.approval.ownerApproved===true,"owner approval missing");
assert(emblem.approval.regenerationAllowed===false,"approved emblem must not be regenerated");
assert(emblem.masterSource.sha256==="685fac492b05fc104ebb368517292d43eb1ac1ac890d353e7db73a8c9feb7050","approved source hash drift");
assert(fs.existsSync(emblem.repositoryPreview.path),"approved emblem preview missing");
assert(sha256(emblem.repositoryPreview.path)===emblem.repositoryPreview.sha256,"approved emblem preview checksum mismatch");
assert(emblem.finalProductionAssets.state==="VERIFIED_AND_CHECKSUM_BOUND","final production icon state drift");
assert(emblem.finalProductionAssets.playIcon?.sha256==="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d","emblem registry Play icon hash drift");
assert(emblem.finalProductionAssets.maskableIcon?.sha256==="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15","emblem registry maskable hash drift");
const webIcons=Array.isArray(web.icons)?web.icons:[];
assert(webIcons.some(x=>x.src==="/worldz-app/assets/worldz-app-icon-512.png"&&x.sizes==="512x512"&&x.type==="image/png"&&x.purpose==="any"),"PWA Play icon binding missing");
assert(webIcons.some(x=>x.src==="/worldz-app/assets/worldz-app-icon-maskable-512.png"&&x.sizes==="512x512"&&x.type==="image/png"&&x.purpose==="maskable"),"PWA maskable icon binding missing");
assert(worldz.simulationFoundation?.liveProof?.state==="PASSED","Stage 4B proof prerequisite");
assert(worldz.multisigApprovalFoundation?.liveProof?.squadsWldz?.state==="PASSED","Stage 5B Squads proof prerequisite");
assert(worldz.appSecurity?.mainnetBroadcastEnabled===false,"WorldzApp mainnet broadcast must remain off");

console.log("WORLDZAPP_ANDROID_API36_FOUNDATION=PASS");
console.log("package_id_candidate="+twa.packageId);
console.log("target_sdk=36 compile_sdk=36 bubblewrap=1.25.0");
console.log("approved_emblem_source=BOUND production_icons=READY signed_aab=OFF public_release=OFF digital_asset_links=PENDING");
