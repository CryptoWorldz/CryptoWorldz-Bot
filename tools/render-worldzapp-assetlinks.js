"use strict";
const fs=require("node:fs");

const CHECK_ONLY=process.argv.includes("--check");
const fp=(process.env.WORLDZAPP_PLAY_SIGNING_SHA256||"").trim().toUpperCase();
const PACKAGE="xyz.cryptoworldz.worldzapp";
const OUT="launchpad.cryptoworldz.xyz/.well-known/assetlinks.json";

function fail(msg){throw new Error("WORLDZAPP_ASSETLINKS_FAIL:"+msg)}
function normalize(value){
  const hex=value.replace(/:/g,"");
  if(!/^[0-9A-F]{64}$/.test(hex)) fail("WORLDZAPP_PLAY_SIGNING_SHA256 must be a 32-byte SHA-256 certificate fingerprint");
  return hex.match(/.{2}/g).join(":");
}
if(!fp) fail("WORLDZAPP_PLAY_SIGNING_SHA256 is required");
const normalized=normalize(fp);
const doc=[{
  relation:["delegate_permission/common.handle_all_urls"],
  target:{
    namespace:"android_app",
    package_name:PACKAGE,
    sha256_cert_fingerprints:[normalized]
  }
}];

if(CHECK_ONLY){
  console.log("WORLDZAPP_ASSETLINKS_FINGERPRINT=PASS");
  console.log("package="+PACKAGE);
  process.exit(0);
}
fs.mkdirSync("launchpad.cryptoworldz.xyz/.well-known",{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(doc,null,2)+"\n");
console.log("WORLDZAPP_ASSETLINKS_RENDERED="+OUT);
console.log("package="+PACKAGE);
