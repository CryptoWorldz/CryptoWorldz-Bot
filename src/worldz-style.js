const PRESETS=Object.freeze({
  worldz:["🌐","WORLDZ"],dm:["📥","PRIVATE DM"],announcement:["⚡","ANNOUNCEMENT"],
  update:["🌐","UPDATE"],launch:["🚀","LAUNCH"],mission:["🎯","MISSION"],
  impact:["💜","IMPACT"],proof:["🔎","PROOF"],alert:["🚨","ALERT"],celebration:["🎉","CELEBRATION"]
});
const KEYS=Object.freeze(Object.keys(PRESETS));
const clean=(v,n=8000)=>String(v||"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim().slice(0,n);
function preset(v){const k=clean(v,32).toLowerCase().replace(/[^a-z]/g,"");return PRESETS[k]?k:null}
function httpsUrl(v){const raw=clean(v,1000);if(!raw)return null;try{const u=new URL(raw);return u.protocol==="https:"?u.toString():null}catch{return null}}
function parse(v){
  const raw=clean(v);if(!raw)return{styled:false,raw:""};
  const p=raw.split("|").map(x=>x.trim()), k=preset(p[0]);
  if(!k||p.length<3)return{styled:false,raw};
  const title=clean(p[1],180),body=clean(p[2],6500),ctaLabel=clean(p[3],80),ctaUrl=httpsUrl(p[4]);
  if(!title||!body)throw Object.assign(new Error("worldzstyle_format_required"),{code:"worldzstyle_format_required"});
  if(p[4]&&!ctaUrl)throw Object.assign(new Error("worldzstyle_https_required"),{code:"worldzstyle_https_required"});
  return{styled:true,preset:k,title,body,ctaLabel:ctaLabel||null,ctaUrl,raw};
}
function format({preset:kind="worldz",title,body,ctaLabel,ctaUrl,meta=[],footer="WORLDZFULLBUILD™ • BUILD • PROVE • SHARE"}={}){
  const k=preset(kind)||"worldz",[emoji,label]=PRESETS[k], lines=[`${emoji} WORLDZSTYLE™ • ${label}`,"━━━━━━━━━━━━━━━━━━━━",`🌐 ${clean(title,180)||label}`,""];
  const b=clean(body,6500); if(b)lines.push(b);
  const m=(Array.isArray(meta)?meta:[meta]).map(x=>clean(x,240)).filter(Boolean).slice(0,8);if(m.length)lines.push("",...m.map(x=>`• ${x}`));
  const url=httpsUrl(ctaUrl);if(url)lines.push("",`🔗 ${clean(ctaLabel,80)||"OPEN"}`,url);
  lines.push("","━━━━━━━━━━━━━━━━━━━━",clean(footer,180));return lines.join("\n");
}
function formatInput(v){const p=parse(v);return p.styled?format(p):p.raw}
function dm({id,senderLabel,body,preset:kind="dm",title,ctaLabel,ctaUrl}={}){
  return format({preset:preset(kind)||"dm",title:title||"Worldz Inbox™",body,ctaLabel,ctaUrl,
    meta:[`From: ${clean(senderLabel,100)||"Worldz Legend"}`,`Message #${Number(id)||0}`,`Reply: /replydm ${Number(id)||0} your message`],
    footer:"WORLDZ INBOX™ • PRIVATE • WORLDZSTYLE™"});
}
function guide(){return["💯 WORLDZSTYLE™ — TELEGRAM MESSAGING","","Presets:","⚡ announcement • 🌐 update • 🚀 launch • 🎯 mission","💜 impact • 🔎 proof • 🚨 alert • 🎉 celebration • 📥 dm","","Format:","PRESET | TITLE | MESSAGE | BUTTON LABEL | https://optional-link","","Examples:","/dmstyle @username launch | PHENIX UPDATE | New build is ready","/worldzcast announcement | WORLDZ UPDATE | Build checks are green","/worldping alert | SYSTEM ALERT | Command Centre maintenance","","WorldzCast keeps its draft → explicit confirm safety gate."].join("\n")}
module.exports={WORLDZ_STYLE_KEYS:KEYS,WORLDZ_STYLE_PRESETS:PRESETS,cleanText:clean,formatWorldzDm:dm,formatWorldzStyleInput:formatInput,formatWorldzTelegram:format,normalizeWorldzStylePreset:preset,parseWorldzStyleInput:parse,validWorldzUrl:httpsUrl,worldzStyleGuide:guide};
