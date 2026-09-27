#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const TEMPLATE=path.join(ROOT,"apps/worldzapp-android/twa-manifest.template.json");
const CONTRACT=path.join(ROOT,"apps/worldzapp-android/android-package.v1.json");
const LOGO=path.join(ROOT,"apps/worldzapp-android/approved-center-logo.v1.json");
const OUT=process.env.WORLDZ_ANDROID_OUTPUT_DIR || path.join(ROOT,"build/worldzapp-android-unsigned");

function requiredHttps(value,name){
  if(!value) throw new Error("WORLDZ_ANDROID_"+name+"_REQUIRED");
  const url=new URL(String(value));
  if(url.protocol!=="https:") throw new Error("WORLDZ_ANDROID_"+name+"_HTTPS_REQUIRED");
  if(url.username||url.password) throw new Error("WORLDZ_ANDROID_"+name+"_INLINE_CREDENTIALS_FORBIDDEN");
  if(url.hostname!=="launchpad.cryptoworldz.xyz") throw new Error("WORLDZ_ANDROID_"+name+"_FIRST_PARTY_HOST_REQUIRED");
  if(/placeholder|example|worldz-app-icon\.svg/i.test(url.pathname)) throw new Error("WORLDZ_ANDROID_"+name+"_PLACEHOLDER_OR_REJECTED_ASSET");
  return url.toString();
}

function packageId(value){
  const id=String(value||"").trim();
  if(!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(id)) throw new Error("WORLDZ_ANDROID_APPLICATION_ID_INVALID");
  return id;
}

export function buildUnsignedManifest({template,contract,logo,iconUrl,maskableIconUrl,applicationId}){
  if(logo.state!=="APPROVED_SOURCE_IDENTIFIED__FIRST_PARTY_WEB_DERIVATIVE_PENDING" &&
     logo.state!=="APPROVED_SOURCE_DEPLOYED") throw new Error("WORLDZ_ANDROID_APPROVED_LOGO_STATE_INVALID");
  const id=packageId(applicationId||contract.applicationId.candidate);
  return {
    ...template,
    packageId:id,
    iconUrl:requiredHttps(iconUrl,"APPROVED_ICON_URL"),
    maskableIconUrl:requiredHttps(maskableIconUrl,"APPROVED_MASKABLE_ICON_URL"),
    signingKey:{path:"__UNSIGNED_BUILD_NO_KEY__",alias:"unsigned"},
    appVersion:template.appVersion||"0.1.0",
    appVersionCode:template.appVersionCode||1,
    generatorApp:"WorldzApp Android unsigned build gate"
  };
}

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex")}

if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const template=JSON.parse(fs.readFileSync(TEMPLATE,"utf8"));
  const contract=JSON.parse(fs.readFileSync(CONTRACT,"utf8"));
  const logo=JSON.parse(fs.readFileSync(LOGO,"utf8"));
  const manifest=buildUnsignedManifest({
    template,contract,logo,
    iconUrl:process.env.WORLDZ_ANDROID_APPROVED_ICON_URL,
    maskableIconUrl:process.env.WORLDZ_ANDROID_APPROVED_MASKABLE_ICON_URL,
    applicationId:process.env.WORLDZ_ANDROID_APPLICATION_ID
  });
  fs.mkdirSync(OUT,{recursive:true});
  const manifestPath=path.join(OUT,"twa-manifest.json");
  const json=JSON.stringify(manifest,null,2)+"\n";
  fs.writeFileSync(manifestPath,json);
  const proof={
    schema:"WORLDZ-APP-ANDROID-UNSIGNED-PREP-V1",
    manifestPath:path.relative(ROOT,manifestPath),
    manifestSha256:sha256(json),
    packageId:manifest.packageId,
    iconHost:new URL(manifest.iconUrl).hostname,
    signing:false,
    publicRelease:false,
    nextCommands:[
      "npx --yes @bubblewrap/cli@1.25.0 update --skipVersionUpgrade --manifest="+manifestPath,
      "npx --yes @bubblewrap/cli@1.25.0 build --skipSigning --manifest="+manifestPath
    ]
  };
  fs.writeFileSync(path.join(OUT,"unsigned-prep-proof.json"),JSON.stringify(proof,null,2)+"\n");
  console.log(JSON.stringify(proof,null,2));
}
