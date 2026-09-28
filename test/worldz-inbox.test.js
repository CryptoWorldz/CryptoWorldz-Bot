const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");const {WORLDZ_INBOX_COMMANDS,isPrivateChat,normalizeUsername,parseStyledBody,safeDeliveryError}=require("../src/worldz-inbox");const ROOT=path.join(__dirname,"..");
test("Worldz Inbox exposes private DM controls",()=>{const n=WORLDZ_INBOX_COMMANDS.map(x=>x.command);for(const r of ["inbox","dm","dmstyle","replydm","dmsettings","dmblock","dmunblock","dmdelete","dmstatus","worldzstyle"])assert.ok(n.includes(r),r)});
test("Worldz Inbox private-chat boundary",()=>{assert.equal(isPrivateChat({chat:{type:"private"}}),true);assert.equal(isPrivateChat({chat:{type:"supergroup"}}),false);assert.equal(isPrivateChat({chat:{type:"channel"}}),false)});
test("exact username normalisation blocks directory-like input",()=>{assert.equal(normalizeUsername("@JayJayTeamDev"),"jayjayteamdev");assert.equal(normalizeUsername("owner"),"owner");assert.equal(normalizeUsername("https://t.me/user"),null);assert.equal(normalizeUsername("two words"),null)});
test("styled DM parser recognises impact preset",()=>{const p=parseStyledBody("impact | COMMUNITY UPDATE | Food delivery confirmed");assert.equal(p.preset,"impact");assert.equal(p.title,"COMMUNITY UPDATE");assert.equal(p.body,"Food delivery confirmed")});
test("DM migration is private by default and separates sent/read",()=>{const s=fs.readFileSync(path.join(ROOT,"supabase/migrations/20260928233100_worldz_inbox_dm.sql"),"utf8");assert.match(s,/enable row level security/i);assert.match(s,/revoke all on table public\.worldz_dm_messages from anon,authenticated/i);assert.match(s,/telegram_sent/);assert.match(s,/read_at/);assert.doesNotMatch(s,/create policy/i)});
test("delivery errors are bounded",()=>assert.ok(safeDeliveryError({message:"x".repeat(400)}).length<=180));

test("contact refresh does not hard-code DM receiving back on", () => {
  const source=fs.readFileSync(path.join(ROOT,"src/worldz-inbox.js"),"utf8");
  const touch=source.match(/async function touch\(user\)\{([\s\S]*?)\n  \}/);
  assert.ok(touch);
  assert.doesNotMatch(touch[1],/enabled:true/);
  assert.match(touch[1],/telegram_dm_reachable:true/);
});


test("Worldz Inbox has protected server runtime bridge without authenticated public access", () => {
  const bridge=fs.readFileSync(path.join(ROOT,"supabase/migrations/20260928235200_worldz_inbox_runtime_bridge.sql"),"utf8");
  assert.match(bridge,/zed_runtime_authorized\(\)/);
  assert.match(bridge,/to service_role/);
  assert.match(bridge,/to anon/);
  assert.match(bridge,/revoke all[\s\S]*from authenticated/);
  assert.match(bridge,/worldz_dm_messages_id_seq/);
});
