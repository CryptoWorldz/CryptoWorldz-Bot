const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");const ROOT=path.join(__dirname,"..");
test("Command Centre includes Worldz Inbox MiniApp",()=>{const h=fs.readFileSync(path.join(ROOT,"public/miniapp/index.html"),"utf8"),j=fs.readFileSync(path.join(ROOT,"public/miniapp/inbox.js"),"utf8"),c=fs.readFileSync(path.join(ROOT,"public/miniapp/inbox.css"),"utf8");assert.match(h,/id="inbox"/);assert.match(h,/id="worldz-inbox-root"/);assert.match(h,/data-screen="inbox"/);assert.match(h,/\/miniapp\/inbox\.js/);assert.match(h,/\/miniapp\/inbox\.css/);assert.match(j,/\/api\/mini\/inbox/);assert.match(j,/Exact @username/i);assert.match(c,/\.worldz-inbox-shell/)})

test("MiniApp Inbox has working privacy controls without exposing raw Telegram IDs", () => {
  const server=fs.readFileSync(path.join(ROOT,"src/worldz-inbox.js"),"utf8");
  const client=fs.readFileSync(path.join(ROOT,"public/miniapp/inbox.js"),"utf8");
  assert.match(server,/delete safe\.sender_telegram_id/);
  assert.match(server,/delete safe\.recipient_telegram_id/);
  assert.match(server,/\/api\/mini\/inbox\/hide/);
  assert.match(server,/\/api\/mini\/inbox\/block-sender/);
  assert.match(client,/data-block-id/);
  assert.match(client,/data-hide-id/);
  assert.match(client,/\/api\/mini\/inbox\/block-sender/);
  assert.match(client,/\/api\/mini\/inbox\/hide/);
});
