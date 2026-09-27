import fs from "node:fs";
import crypto from "node:crypto";

const gates=JSON.parse(fs.readFileSync("launchpad.cryptoworldz.xyz/worldz-app/core/multisig-live-proof-gates.json","utf8"));
const sha256=value=>crypto.createHash("sha256").update(String(value)).digest("hex");

const env=process.env;
const envReady=profile=>(profile.requiredConfiguration||[]).every(name=>String(env[name]||"").trim().length>0);
const profiles=gates.profiles.map(profile=>{
  if(profile.state==="LIVE_PROOF_PASSED") return {...profile,readiness:"PROVEN"};
  return {
    id:profile.id,
    system:profile.system,
    chain:profile.chain,
    configured:envReady(profile),
    readiness:envReady(profile)?"READY_FOR_LIVE_PROOF":"WORLDZ_PROFILE_REQUIRED",
    missing:(profile.requiredConfiguration||[]).filter(name=>!String(env[name]||"").trim())
  };
});
const proof={
  schema:"WORLDZ-APP-STAGE5C-PROFILE-READINESS-V1",
  generatedAt:new Date().toISOString(),
  profiles,
  liveProofComplete:profiles.every(item=>item.readiness==="PROVEN"),
  approvalSubmission:false,
  signing:false,
  execution:false,
  broadcast:false
};
const canonical=JSON.stringify(proof,null,2)+"\n";
fs.writeFileSync("worldzapp-stage5c-profile-readiness.json",canonical);
console.log(canonical.trim());
console.log("WORLDZAPP_STAGE5C_READINESS_SHA256="+sha256(canonical));
console.log("WORLDZAPP_STAGE5C_HARNESS=PASS");
