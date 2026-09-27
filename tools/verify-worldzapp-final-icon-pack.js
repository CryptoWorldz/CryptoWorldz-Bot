"use strict";
const fs=require("node:fs");
const crypto=require("node:crypto");
const requireAssets=process.argv.includes("--require-assets");
const manifest=JSON.parse(fs.readFileSync("apps/worldzapp-android/final-icon-pack.v1.json","utf8"));
function fail(m){throw new Error("WORLDZAPP_FINAL_ICON_FAIL:"+m)}
function hash(p){return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")}
if(manifest.finalMaster.sha256!=="e23b67694d0a28e2775e57a80511a3407bc9e39751661d1fbf378f560ff97eec") fail("master checksum drift");
const required=["play512","pwa192","maskable512","adaptiveForeground512"];
let missing=[];
for(const key of required){
  const item=manifest.assets[key];
  if(!item?.targetPath||!item.sha256) fail("manifest entry "+key);
  if(!fs.existsSync(item.targetPath)){missing.push(item.targetPath);continue}
  if(hash(item.targetPath)!==item.sha256) fail(key+" checksum mismatch");
}
if(missing.length){
  if(requireAssets) fail("missing final binary assets: "+missing.join(", "));
  console.log("WORLDZAPP_FINAL_ICON_PACK=PENDING_BINARY_IMPORT");
  console.log("missing="+missing.join(","));
  process.exit(0);
}
console.log("WORLDZAPP_FINAL_ICON_PACK=PASS");
console.log("master_sha256="+manifest.finalMaster.sha256);
