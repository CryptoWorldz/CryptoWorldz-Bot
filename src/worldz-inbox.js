const { createRateLimiter } = require("./core");
const { validateTelegramInitData } = require("./miniapp-auth");
const { cleanText, formatWorldzDm, normalizeWorldzStylePreset, parseWorldzStyleInput, worldzStyleGuide } = require("./worldz-style");

const WORLDZ_INBOX_COMMANDS=Object.freeze([
  ["inbox","Open your private Worldz Inbox"],["dm","Send a private Worldz DM"],["dmstyle","Send a WorldzStyle private DM"],
  ["replydm","Reply to an Inbox message"],["dmsettings","Turn Worldz DMs on or off"],["dmblock","Block a Worldz DM sender"],
  ["dmunblock","Unblock a Worldz DM sender"],["dmdelete","Hide an Inbox message"],["dmstatus","View private messaging status"],
  ["worldzstyle","View WorldzStyle message formats"]
].map(([command,description])=>Object.freeze({command,description})));

const MAX_BODY_LENGTH=2800, OWNER_ALIASES=new Set(["owner","jayjay","jayjayteamdev","worldz"]);
const isPrivateChat=(m)=>String(m?.chat?.type||"")==="private";
const normalizeUsername=(v)=>{const m=String(v||"").trim().match(/^@?([A-Za-z0-9_]{3,64})$/);return m?m[1].toLowerCase():null};
const safeDeliveryError=(e)=>String(e?.response?.body?.description||e?.code||e?.message||"telegram_delivery_failed").replace(/\s+/g," ").slice(0,180);
const displayName=(u,f="Worldz Legend")=>u?.username?`@${String(u.username).replace(/^@/,"")}`:cleanText(u?.first_name,80)||f;
function parseStyledBody(raw){
  const input=cleanText(raw,5000), p=parseWorldzStyleInput(input);
  return p.styled?{preset:p.preset,title:p.title,body:cleanText(p.body,MAX_BODY_LENGTH),ctaLabel:p.ctaLabel,ctaUrl:p.ctaUrl}:{preset:"dm",title:null,body:cleanText(input,MAX_BODY_LENGTH),ctaLabel:null,ctaUrl:null};
}

function registerWorldzInboxSystem({app,bot,config,supabase}){
  if(!app||!bot||!config||!supabase)throw new Error("Worldz Inbox requires app, bot, config and Supabase.");
  const minute=createRateLimiter({maxEvents:8,intervalMs:60000}), hour=createRateLimiter({maxEvents:40,intervalMs:3600000}), mini=createRateLimiter({maxEvents:60,intervalMs:60000});
  const ownerId=()=>String(config.ownerTelegramId||"");

  async function touch(user){
    if(!user?.id)return;
    const {error}=await supabase.from("worldz_dm_preferences").upsert({
      telegram_id:Number(user.id),telegram_dm_reachable:true,username:user.username||null,first_name:user.first_name||null,
      last_private_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()
    },{onConflict:"telegram_id"});
    if(error)throw error;
  }
  async function profile(id){
    const {data,error}=await supabase.from("users").select("telegram_id,username,first_name").eq("telegram_id",Number(id)).maybeSingle();
    if(error)throw error;
    if(data)return data;
    if(String(id)===ownerId())return{telegram_id:Number(id),username:"JayJayTeamDev",first_name:"JayJay"};
    return null;
  }
  async function target(raw){
    const name=normalizeUsername(raw); if(!name)return null;
    if(OWNER_ALIASES.has(name)&&ownerId())return profile(ownerId());
    const {data,error}=await supabase.from("users").select("telegram_id,username,first_name").ilike("username",name).limit(2);
    if(error)throw error; return data?.length===1?data[0]:null;
  }
  async function pref(id){
    const {data,error}=await supabase.from("worldz_dm_preferences").select("*").eq("telegram_id",Number(id)).maybeSingle();
    if(error)throw error; return data||{telegram_id:Number(id),enabled:true,telegram_dm_reachable:false};
  }
  async function blocked(recipient,sender){
    const {data,error}=await supabase.from("worldz_dm_blocks").select("blocker_telegram_id").eq("blocker_telegram_id",Number(recipient)).eq("blocked_telegram_id",Number(sender)).maybeSingle();
    if(error)throw error; return !!data;
  }
  async function getMessage(id){
    const n=Number(id);if(!Number.isSafeInteger(n)||n<=0)return null;
    const {data,error}=await supabase.from("worldz_dm_messages").select("*").eq("id",n).maybeSingle();if(error)throw error;return data||null;
  }
  async function sendDirect({senderId,recipient,body,preset="dm",title,ctaLabel,ctaUrl}){
    if(!minute(String(senderId))||!hour(String(senderId)))throw Object.assign(new Error("dm_rate_limited"),{code:"dm_rate_limited"});
    const rid=Number(recipient?.telegram_id); if(!Number.isSafeInteger(rid)||rid<=0)throw Object.assign(new Error("recipient_not_found"),{code:"recipient_not_found"});
    if(String(senderId)===String(rid))throw Object.assign(new Error("cannot_dm_self"),{code:"cannot_dm_self"});
    if(await blocked(rid,senderId))throw Object.assign(new Error("recipient_blocked_sender"),{code:"recipient_blocked_sender"});
    if((await pref(rid)).enabled===false)throw Object.assign(new Error("recipient_dm_disabled"),{code:"recipient_dm_disabled"});
    const safe=cleanText(body,MAX_BODY_LENGTH);if(!safe)throw Object.assign(new Error("empty_dm"),{code:"empty_dm"});
    const sender=await profile(senderId);if(!sender)throw Object.assign(new Error("registration_required"),{code:"registration_required"});
    const row={sender_telegram_id:Number(senderId),recipient_telegram_id:rid,body:safe,style_preset:normalizeWorldzStylePreset(preset)||"dm",style_title:cleanText(title,180)||null,cta_label:cleanText(ctaLabel,80)||null,cta_url:ctaUrl||null,status:"queued"};
    const ins=await supabase.from("worldz_dm_messages").insert(row).select("*").single();if(ins.error)throw ins.error;
    const text=formatWorldzDm({id:ins.data.id,senderLabel:displayName(sender),body:safe,preset:row.style_preset,title:row.style_title,ctaLabel:row.cta_label,ctaUrl:row.cta_url});
    try{
      const sent=await bot.sendMessage(rid,text,{reply_markup:{inline_keyboard:[[{text:"📥 Open Worldz Inbox",web_app:{url:"https://cryptobotz.cryptoworldz.xyz/miniapp/#inbox"}}]]}});
      await supabase.from("worldz_dm_messages").update({status:"telegram_sent",telegram_message_id:sent?.message_id||null,sent_at:new Date().toISOString(),error_code:null}).eq("id",ins.data.id);
      return{...ins.data,status:"telegram_sent",recipient};
    }catch(e){
      await supabase.from("worldz_dm_messages").update({status:"failed",failed_at:new Date().toISOString(),error_code:safeDeliveryError(e)}).eq("id",ins.data.id);
      throw Object.assign(new Error("telegram_delivery_failed"),{code:"telegram_delivery_failed"});
    }
  }
  async function rowsFor(id,kind,limit=30){
    const incoming=kind==="incoming", column=incoming?"recipient_telegram_id":"sender_telegram_id", deleted=incoming?"recipient_deleted_at":"sender_deleted_at";
    const {data,error}=await supabase.from("worldz_dm_messages").select("id,sender_telegram_id,recipient_telegram_id,body,style_preset,style_title,status,error_code,created_at,sent_at,read_at").eq(column,Number(id)).is(deleted,null).order("created_at",{ascending:false}).limit(Math.min(50,Math.max(1,Number(limit)||30)));
    if(error)throw error;const rows=data||[], ids=[...new Set(rows.map(r=>Number(incoming?r.sender_telegram_id:r.recipient_telegram_id)).filter(Boolean))];
    let people=[];if(ids.length){const q=await supabase.from("users").select("telegram_id,username,first_name").in("telegram_id",ids);if(q.error)throw q.error;people=q.data||[]}
    const map=new Map(people.map(p=>[String(p.telegram_id),p]));
    return rows.map(r=>({...r,[incoming?"sender":"recipient"]:map.get(String(incoming?r.sender_telegram_id:r.recipient_telegram_id))||(String(incoming?r.sender_telegram_id:r.recipient_telegram_id)===ownerId()?{telegram_id:Number(ownerId()),username:"JayJayTeamDev",first_name:"JayJay"}:null)}));
  }
  function miniRows(rows,kind){
    const incoming=kind==="incoming";
    return (rows||[]).map(row=>{
      const safe={...row};
      delete safe.sender_telegram_id;
      delete safe.recipient_telegram_id;
      const key=incoming?"sender":"recipient";
      const person=safe[key];
      safe[key]=person?{username:person.username||null,first_name:person.first_name||null}:null;
      return safe;
    });
  }
  async function markRead(ids,id){
    const valid=(Array.isArray(ids)?ids:[ids]).map(Number).filter(n=>Number.isSafeInteger(n)&&n>0).slice(0,50);if(!valid.length)return 0;
    const q=await supabase.from("worldz_dm_messages").update({read_at:new Date().toISOString()}).in("id",valid).eq("recipient_telegram_id",Number(id)).is("read_at",null).select("id");if(q.error)throw q.error;return(q.data||[]).length;
  }
  async function unread(id){const q=await supabase.from("worldz_dm_messages").select("id",{count:"exact",head:true}).eq("recipient_telegram_id",Number(id)).eq("status","telegram_sent").is("read_at",null).is("recipient_deleted_at",null);if(q.error)throw q.error;return Number(q.count)||0}
  const needPrivate=(m)=>{if(isPrivateChat(m))return true;bot.sendMessage(m.chat.id,"📥 Worldz Inbox™ is private. Open ZED in a private Telegram chat and run /inbox.");return false};
  const err=(e)=>({recipient_not_found:"❌ Exact registered @username not found. Ask them to register with ZED first.",cannot_dm_self:"😎 Your own inbox already knows where you live.",recipient_blocked_sender:"⛔ That Worldz Legend is not accepting DMs from you.",recipient_dm_disabled:"🔕 That Worldz Legend has private Worldz DMs switched off.",dm_rate_limited:"⚠️ DM rate limit reached. Try again shortly.",registration_required:"❌ Register with ZED before using Worldz Inbox.",telegram_delivery_failed:"⚠️ Telegram did not accept that DM. The recipient may need to open/start ZED privately first.",worldzstyle_https_required:"❌ WorldzStyle links must use HTTPS."}[e?.code]||"❌ Worldz Inbox could not complete that action.");

  bot.onText(/^\/worldzstyle(?:@\w+)?$/i,m=>bot.sendMessage(m.chat.id,worldzStyleGuide()));
  bot.onText(/^\/inbox(?:@\w+)?$/i,async m=>{if(!needPrivate(m))return;try{await touch(m.from);const rows=await rowsFor(m.from.id,"incoming",12),u=rows.filter(r=>!r.read_at&&r.status==="telegram_sent");if(!rows.length)return bot.sendMessage(m.chat.id,"📥 WORLDZ INBOX™\n\nNo private messages yet.\n\nSend one with /dm @username your message");const out=["📥 WORLDZ INBOX™","",`Unread: ${u.length} • Showing: ${rows.length}`,""];for(const r of rows)out.push(`${r.read_at?"▫️":"🟣"} #${r.id} • ${displayName(r.sender)}`,cleanText(r.body,180),`↩️ /replydm ${r.id} your message`,"");await markRead(u.map(r=>r.id),m.from.id);return bot.sendMessage(m.chat.id,out.join("\n"))}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  bot.onText(/^\/dm(?:@\w+)?(?:\s+(\S+))?(?:\s+([\s\S]+))?$/i,async(m,x)=>{if(!needPrivate(m))return;try{await touch(m.from);if(!x?.[1]||!x?.[2])return bot.sendMessage(m.chat.id,"✉️ Use: /dm @username your private message\nOwner shortcut: /dm owner your message");const r=await target(x[1]);if(!r)throw Object.assign(new Error(),{code:"recipient_not_found"});const s=await sendDirect({senderId:m.from.id,recipient:r,body:x[2]});return bot.sendMessage(m.chat.id,`✅ Worldz DM #${s.id} accepted by Telegram for ${displayName(r)}. Read status is separate.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  bot.onText(/^\/dmstyle(?:@\w+)?(?:\s+(\S+))?(?:\s+([\s\S]+))?$/i,async(m,x)=>{if(!needPrivate(m))return;try{await touch(m.from);if(!x?.[1]||!x?.[2])return bot.sendMessage(m.chat.id,"💯 Use: /dmstyle @username launch | TITLE | MESSAGE | BUTTON | https://optional-link");const r=await target(x[1]);if(!r)throw Object.assign(new Error(),{code:"recipient_not_found"});const s=await sendDirect({senderId:m.from.id,recipient:r,...parseStyledBody(x[2])});return bot.sendMessage(m.chat.id,`✅ WorldzStyle DM #${s.id} accepted by Telegram for ${displayName(r)}.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  bot.onText(/^\/replydm(?:@\w+)?(?:\s+(\d+))?(?:\s+([\s\S]+))?$/i,async(m,x)=>{if(!needPrivate(m))return;try{await touch(m.from);const src=await getMessage(x?.[1]);if(!src||String(src.recipient_telegram_id)!==String(m.from.id)||!x?.[2])return bot.sendMessage(m.chat.id,"↩️ Use: /replydm MESSAGE_ID your message");const r=await profile(src.sender_telegram_id);if(!r)throw Object.assign(new Error(),{code:"recipient_not_found"});const s=await sendDirect({senderId:m.from.id,recipient:r,...parseStyledBody(x[2])});await markRead([src.id],m.from.id);return bot.sendMessage(m.chat.id,`✅ Reply DM #${s.id} accepted by Telegram for ${displayName(r)}.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  bot.onText(/^\/dmsettings(?:@\w+)?(?:\s+(on|off))?$/i,async(m,x)=>{if(!needPrivate(m))return;try{await touch(m.from);if(!x?.[1]){const p=await pref(m.from.id);return bot.sendMessage(m.chat.id,`📥 Worldz DM receiving: ${p.enabled===false?"OFF 🔕":"ON ✅"}`)}const enabled=x[1].toLowerCase()==="on";const q=await supabase.from("worldz_dm_preferences").upsert({telegram_id:Number(m.from.id),enabled,telegram_dm_reachable:true,username:m.from.username||null,first_name:m.from.first_name||null,last_private_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"telegram_id"});if(q.error)throw q.error;return bot.sendMessage(m.chat.id,`✅ Worldz DM receiving is now ${enabled?"ON":"OFF"}.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  async function blockCmd(m,raw,on){if(!needPrivate(m))return;try{await touch(m.from);const r=await target(raw);if(!r)throw Object.assign(new Error(),{code:"recipient_not_found"});if(String(r.telegram_id)===String(m.from.id))return bot.sendMessage(m.chat.id,"❌ You cannot block yourself.");let q;if(on)q=await supabase.from("worldz_dm_blocks").upsert({blocker_telegram_id:Number(m.from.id),blocked_telegram_id:Number(r.telegram_id),created_at:new Date().toISOString()},{onConflict:"blocker_telegram_id,blocked_telegram_id"});else q=await supabase.from("worldz_dm_blocks").delete().eq("blocker_telegram_id",Number(m.from.id)).eq("blocked_telegram_id",Number(r.telegram_id));if(q.error)throw q.error;return bot.sendMessage(m.chat.id,`${on?"⛔ Blocked":"✅ Unblocked"} ${displayName(r)} for Worldz DMs.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}}
  bot.onText(/^\/dmblock(?:@\w+)?(?:\s+(\S+))?$/i,(m,x)=>x?.[1]?blockCmd(m,x[1],true):bot.sendMessage(m.chat.id,"Use /dmblock @username"));
  bot.onText(/^\/dmunblock(?:@\w+)?(?:\s+(\S+))?$/i,(m,x)=>x?.[1]?blockCmd(m,x[1],false):bot.sendMessage(m.chat.id,"Use /dmunblock @username"));
  bot.onText(/^\/dmdelete(?:@\w+)?(?:\s+(\d+))?$/i,async(m,x)=>{if(!needPrivate(m))return;try{const src=await getMessage(x?.[1]);if(!src)return bot.sendMessage(m.chat.id,"❌ Message not found.");const patch={};if(String(src.sender_telegram_id)===String(m.from.id))patch.sender_deleted_at=new Date().toISOString();if(String(src.recipient_telegram_id)===String(m.from.id))patch.recipient_deleted_at=new Date().toISOString();if(!Object.keys(patch).length)return bot.sendMessage(m.chat.id,"⛔ That message is not in your Worldz Inbox.");const q=await supabase.from("worldz_dm_messages").update(patch).eq("id",src.id);if(q.error)throw q.error;return bot.sendMessage(m.chat.id,`🗑️ Message #${src.id} hidden from your Worldz Inbox.`)}catch(e){return bot.sendMessage(m.chat.id,err(e))}});
  bot.onText(/^\/dmstatus(?:@\w+)?$/i,async m=>{if(!needPrivate(m))return;try{await touch(m.from);const p=await pref(m.from.id),u=await unread(m.from.id);return bot.sendMessage(m.chat.id,["📥 WORLDZ INBOX™ STATUS","",`Receiving: ${p.enabled===false?"OFF 🔕":"ON ✅"}`,`Unread: ${u}`,"Reachability: Telegram private chat confirmed ✅","","Privacy: exact-username targeting • private records • no WorldzCast exposure"].join("\n"))}catch(e){return bot.sendMessage(m.chat.id,err(e))}});

  function auth(req,res,next){const r=validateTelegramInitData(req.get("x-telegram-init-data")||"",config.botToken);if(!r.ok)return res.status(401).json({ok:false,error:r.error});if(!mini(`${r.user.id}:${req.ip}`))return res.status(429).json({ok:false,error:"rate_limited"});req.telegramUser=r.user;next()}
  app.get("/api/mini/inbox",auth,async(req,res)=>{try{await touch(req.telegramUser);const [incoming,sent,p,u]=await Promise.all([rowsFor(req.telegramUser.id,"incoming",30),rowsFor(req.telegramUser.id,"sent",20),pref(req.telegramUser.id),unread(req.telegramUser.id)]);res.json({ok:true,incoming:miniRows(incoming,"incoming"),sent:miniRows(sent,"sent"),unread:u,settings:{enabled:p.enabled!==false}})}catch{res.status(503).json({ok:false,error:"inbox_unavailable"})}});
  app.post("/api/mini/inbox/send",auth,async(req,res)=>{try{await touch(req.telegramUser);const r=await target(req.body?.recipient);if(!r)return res.status(404).json({ok:false,error:"recipient_not_found"});const s=await sendDirect({senderId:req.telegramUser.id,recipient:r,body:req.body?.body,preset:req.body?.preset,title:req.body?.title,ctaLabel:req.body?.cta_label,ctaUrl:req.body?.cta_url});res.json({ok:true,message:{id:s.id,status:s.status},recipient:displayName(r)})}catch(e){res.status(e?.code==="dm_rate_limited"?429:503).json({ok:false,error:e?.code||"dm_send_failed"})}});
  app.post("/api/mini/inbox/reply",auth,async(req,res)=>{try{const src=await getMessage(req.body?.message_id);if(!src||String(src.recipient_telegram_id)!==String(req.telegramUser.id))return res.status(404).json({ok:false,error:"message_not_found"});const r=await profile(src.sender_telegram_id);if(!r)return res.status(404).json({ok:false,error:"recipient_not_found"});const s=await sendDirect({senderId:req.telegramUser.id,recipient:r,body:req.body?.body,preset:req.body?.preset,title:req.body?.title});await markRead([src.id],req.telegramUser.id);res.json({ok:true,message:{id:s.id,status:s.status}})}catch(e){res.status(e?.code==="dm_rate_limited"?429:503).json({ok:false,error:e?.code||"dm_reply_failed"})}});
  app.post("/api/mini/inbox/read",auth,async(req,res)=>{try{res.json({ok:true,marked_read:await markRead(req.body?.message_ids||[],req.telegramUser.id)})}catch{res.status(503).json({ok:false,error:"read_update_failed"})}});
  app.post("/api/mini/inbox/settings",auth,async(req,res)=>{try{const enabled=req.body?.enabled!==false;const q=await supabase.from("worldz_dm_preferences").upsert({telegram_id:Number(req.telegramUser.id),enabled,telegram_dm_reachable:true,username:req.telegramUser.username||null,first_name:req.telegramUser.first_name||null,last_private_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"telegram_id"});if(q.error)throw q.error;res.json({ok:true,enabled})}catch{res.status(503).json({ok:false,error:"settings_update_failed"})}});
  app.post("/api/mini/inbox/hide",auth,async(req,res)=>{try{const src=await getMessage(req.body?.message_id);if(!src)return res.status(404).json({ok:false,error:"message_not_found"});const patch={};if(String(src.sender_telegram_id)===String(req.telegramUser.id))patch.sender_deleted_at=new Date().toISOString();if(String(src.recipient_telegram_id)===String(req.telegramUser.id))patch.recipient_deleted_at=new Date().toISOString();if(!Object.keys(patch).length)return res.status(403).json({ok:false,error:"not_your_message"});const q=await supabase.from("worldz_dm_messages").update(patch).eq("id",src.id);if(q.error)throw q.error;res.json({ok:true,message_id:src.id})}catch{res.status(503).json({ok:false,error:"hide_failed"})}});
  app.post("/api/mini/inbox/block-sender",auth,async(req,res)=>{try{const src=await getMessage(req.body?.message_id);if(!src||String(src.recipient_telegram_id)!==String(req.telegramUser.id))return res.status(404).json({ok:false,error:"message_not_found"});const sender=await profile(src.sender_telegram_id);if(!sender)return res.status(404).json({ok:false,error:"sender_not_found"});const q=await supabase.from("worldz_dm_blocks").upsert({blocker_telegram_id:Number(req.telegramUser.id),blocked_telegram_id:Number(src.sender_telegram_id),created_at:new Date().toISOString()},{onConflict:"blocker_telegram_id,blocked_telegram_id"});if(q.error)throw q.error;res.json({ok:true,blocked:true,sender:displayName(sender)})}catch{res.status(503).json({ok:false,error:"block_failed"})}});

  return{sendDirect,rowsFor,markRead,unread,target};
}
module.exports={MAX_BODY_LENGTH,WORLDZ_INBOX_COMMANDS,displayName,isPrivateChat,normalizeUsername,parseStyledBody,registerWorldzInboxSystem,safeDeliveryError};
