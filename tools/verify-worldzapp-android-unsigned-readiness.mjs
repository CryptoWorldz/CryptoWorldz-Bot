#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import crypto from "node:crypto";

const pkg=JSON.parse(fs.readFileSync("apps/worldzapp-android/android-package.v1.json","utf8"));
const unsigned=JSON.parse(fs.readFileSync("apps/worldzapp-android/unsigned-build.v1.json","utf8"));
const logo=JSON.parse(fs.readFileSync("apps/worldzapp-android/approved-center-logo.v1.json","utf8"));
const manifest=JSON.parse(fs.readFileSync("launchpad.cryptoworldz.xyz/worldz-app/manifest.webmanifest","utf8"));
const index=fs.readFileSync("launchpad.cryptoworldz.xyz/worldz-app/index.html","utf8");
const worker=fs.readFileSync("launchpad.cryptoworldz.xyz/worldz-app/service-worker.js","utf8");

const failures=[];
if(pkg.packaging?.targetSdk!==36 || pkg.packaging?.compileSdk!==36) failures.push("API_36_CONTRACT_REQUIRED");
if(unsigned.bubblewrapVersion!=="1.25.0") failures.push("BUBBLEWRAP_PIN_REQUIRED");
if(unsigned.commands.build!=="bubblewrap build --skipSigning") failures.push("UNSIGNED_BUILD_COMMAND_REQUIRED");
if(unsigned.releaseBoundary.signing!==false || unsigned.releaseBoundary.playUpload!==false) failures.push("UNSIGNED_RELEASE_BOUNDARY_INVALID");
if(logo.sourceEvidence.sha256!=="ca401c3a559ffcd8b1829118595138a9c1efa33c4838df45e1565f6bdc751a35") failures.push("APPROVED_LOGO_SOURCE_HASH_DRIFT");
const rejected="worldz-app-icon.svg";
if(JSON.stringify(manifest).includes(rejected) || index.includes(rejected) || worker.includes(rejected)) failures.push("REJECTED_W_ICON_STILL_ACTIVE");

const iconReady=Boolean(logo.androidRequirements.approvedFirstPartyIconUrl && logo.androidRequirements.approvedFirstPartyMaskableIconUrl);
const state=iconReady?"READY_FOR_UNSIGNED_PROJECT_GENERATION":"APPROVED_LOGO_WEB_DEPLOYMENT_REQUIRED";
const proof={
  schema:"WORLDZ-APP-ANDROID-UNSIGNED-READINESS-V1",
  generatedAt:new Date().toISOString(),
  api36:true,
  bubblewrapVersion:unsigned.bubblewrapVersion,
  approvedLogoSourceHash:logo.sourceEvidence.sha256,
  rejectedWIconActive:false,
  iconReady,
  state,
  unsignedBuildCommand:unsigned.commands.build,
  signing:false,
  playUpload:false,
  mainnetBroadcast:false,
  failures
};
const canonical=JSON.stringify(proof,null,2)+"\n";
fs.writeFileSync("worldzapp-android-unsigned-readiness.json",canonical);
console.log(canonical.trim());
console.log("WORLDZAPP_ANDROID_UNSIGNED_READINESS_SHA256="+crypto.createHash("sha256").update(canonical).digest("hex"));
if(failures.length) process.exit(1);
console.log("WORLDZAPP_ANDROID_UNSIGNED_GATE=PASS");
