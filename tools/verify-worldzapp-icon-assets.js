"use strict";

const fs=require("node:fs");
const crypto=require("node:crypto");

const PLAY_SHA="27bea13731d943511429b74f75d175e5613e24bdc53079d4cf1b906e45a4692d";
const MASK_SHA="b09b93d8462ca96aba9d16f96eacf758b2bb6e41879016342919f318a223ac15";

const assets=[
  {id:"play",android:"apps/worldzapp-android/assets/worldz-app-icon-512.png",hosted:"launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-app-icon-512.png",sha256:PLAY_SHA,maxBytes:1024*1024},
  {id:"maskable",android:"apps/worldzapp-android/assets/worldz-app-icon-maskable-512.png",hosted:"launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-app-icon-maskable-512.png",sha256:MASK_SHA,maxBytes:1024*1024}
];

function assert(v,m){if(!v)throw new Error("WORLDZAPP_ICON_ASSET_FAIL:"+m)}
function sha256(buf){return crypto.createHash("sha256").update(buf).digest("hex")}
function inspectPng(buf){
  assert(buf.length>33,"png too small");
  assert(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"png signature");
  assert(buf.subarray(12,16).toString("ascii")==="IHDR","IHDR missing");
  return {
    width:buf.readUInt32BE(16),height:buf.readUInt32BE(20),
    bitDepth:buf[24],colorType:buf[25],
    hasIccProfile:buf.includes(Buffer.from("iCCP","ascii")),
    hasSrgbChunk:buf.includes(Buffer.from("sRGB","ascii"))
  };
}
for(const asset of assets){
  const android=fs.readFileSync(asset.android), hosted=fs.readFileSync(asset.hosted);
  assert(android.equals(hosted),asset.id+" hosted/android bytes drift");
  assert(android.length<=asset.maxBytes,asset.id+" exceeds 1MB");
  assert(sha256(android)===asset.sha256,asset.id+" sha256 drift");
  const png=inspectPng(android);
  assert(png.width===512&&png.height===512,asset.id+" must be 512x512");
  assert(png.bitDepth===8,asset.id+" must use 8-bit channels");
  assert(png.colorType===6,asset.id+" must be RGBA 32-bit PNG");
  assert(png.hasIccProfile||png.hasSrgbChunk,asset.id+" must declare sRGB/ICC profile");
  console.log("WORLDZAPP_ICON_"+asset.id.toUpperCase()+"=PASS bytes="+android.length+" sha256="+asset.sha256);
}
console.log("WORLDZAPP_APPROVED_ICON_ASSETS=PASS");
