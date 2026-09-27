"use strict";
const fs=require("node:fs");
function read(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function assert(v,m){if(!v)throw new Error("WORLDZAPP_UNSIGNED_AAB_CONTRACT_FAIL:"+m)}
const p=read("apps/worldzapp-android/unsigned-aab-proof.v1.json");
const twa=read("apps/worldzapp-android/twa-manifest.template.json");
const android=read("apps/worldzapp-android/android-package.v1.json");
assert(p.schema==="WORLDZ-APP-ANDROID-UNSIGNED-AAB-PROOF-V1","schema");
assert(["CI_PROOF_PENDING","PASSED"].includes(p.state),"state");
assert(p.buildMode==="SKIP_SIGNING"&&p.signed===false,"unsigned only");
assert(p.releaseAuthorized===false,"release authorization must remain false");
assert(p.keystoreCommitted===false,"keystore must not be committed");
assert(p.targetSdk===36&&p.compileSdk===36,"API 36");
assert(twa.packageId===p.applicationId,"application id drift");
assert(typeof twa.iconUrl==="string"&&twa.iconUrl.includes("worldz-app-icon-512.png"),"top-level iconUrl required");
assert(typeof twa.maskableIconUrl==="string"&&twa.maskableIconUrl.includes("worldz-app-icon-maskable-512.png"),"top-level maskableIconUrl required");
assert(twa.signingKey?.path==="WORLDZAPP_RELEASE_KEY_NOT_COMMITTED.keystore","non-secret signing key placeholder drift");
assert(!fs.existsSync("apps/worldzapp-android/WORLDZAPP_RELEASE_KEY_NOT_COMMITTED.keystore"),"keystore must not exist in repository");
assert(android.releaseSecurity.signedReleaseBuilt===false,"signed release must remain false");
assert(android.releaseSecurity.publicReleaseAuthorized===false,"public release must remain false");
console.log("WORLDZAPP_UNSIGNED_AAB_CONTRACT=PASS state="+p.state);
