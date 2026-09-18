#!/usr/bin/env python3
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "purplediamondcrew.com"
BUILD = "2026-09-19-pdc-five"

TOKENS = [
    ("Original PDC","F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump"),
    ("First PDC1","PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw"),
    ("PDC1-2","PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52"),
    ("PDCMAGA","7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump"),
    ("PDCShares","PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE"),
    ("PurpleDC","9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf"),
    ("OG Purple","DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump"),
    ("PCC1 legacy","DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv"),
    ("INVEST","VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC"),
    ("Limited Edition","Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY"),
]

NAV = [
    ("/","On The Ground","🏠"),
    ("/hope-chest/","Hope Chest","💎"),
    ("/make-the-difference/","Make The Difference","🌏"),
    ("/hodlerz-special/","Hodlerz Special","◆"),
    ("/acknowledgements/","Acknowledgements","★"),
]

def nav(active):
    out = ['<nav class="pdc-float" aria-label="Purple Diamond Crew pages">']
    for href,label,icon in NAV:
        cls = ' class="active"' if href == active else ''
        out.append(f'<a{cls} href="{href}"><b>{icon}</b><span>{escape(label)}</span></a>')
    out.append('</nav>')
    return ''.join(out)

def head(title, desc):
    return f'''<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} | Purple Diamond Crew</title>
<meta name="description" content="{escape(desc)}">
<meta name="theme-color" content="#12051f">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/mobile-safe.css">
<link rel="stylesheet" href="/pdc-five.css">
</head>'''

def shell(title, desc, active, body, extra=""):
    return f'''<!doctype html>
<html lang="en">
{head(title,desc)}
<body class="pdc-five" data-oneworldz-build="{BUILD}">
{nav(active)}
<main>{body}</main>
{extra}
</body>
</html>'''

home = shell(
    "On The Ground",
    "Purple Diamond Crew — real people, real action, real impact.",
    "/",
    '''<section class="visual-page home-visual">
<img src="https://cdn.jsdelivr.net/gh/CryptoWorldz/CryptoWorldz-Bot@main/purplediamondcrew.com/action-team.png" alt="Purple Diamond Crew on the ground">
<div class="visual-shade"></div>
<div class="home-mark">
<p>REAL PEOPLE • REAL ACTION • REAL IMPACT</p>
<h1>Purple Diamond Crew</h1>
<h2>ON THE GROUND</h2>
<span>Helping the People who Help the People.</span>
</div>
</section>'''
)

token_cards = ''.join(
    f'''<article class="legacy-card">
<div><span>LEGACY TOKEN</span><h3>{escape(label)}</h3></div>
<code>{mint}</code>
<a target="_blank" rel="noopener" href="https://solscan.io/token/{mint}">View on Solscan →</a>
</article>''' for label,mint in TOKENS
)

chest = shell(
    "OneWorldz Hope Chest 1927",
    "The Purple Diamond Crew Hope Chest and the ten genuine legacy token records.",
    "/hope-chest/",
    f'''<section class="visual-page chest-visual">
<img src="https://cdn.jsdelivr.net/gh/CryptoWorldz/CryptoWorldz-Bot@main/purplediamondcrew.com/hero.png" alt="OneWorldz Hope Chest 1927">
<div class="visual-shade"></div>
<div class="chest-mark"><p>THE ORIGINAL HISTORY STAYS.</p><h1>OneWorldz Hope Chest</h1><span>1927 • Purple Diamond Crew Legacy</span></div>
</section>
<section class="pdc-section">
<p class="kicker">THE 10 GENUINE LEGACY RECORDS</p>
<h2>The Chest Keeps the History.</h2>
<p class="lead">No invented tokens. No rewritten history. These are the ten legacy mint records carried forward by Purple Diamond Crew.</p>
<div class="legacy-grid">{token_cards}</div>
</section>'''
)

difference = shell(
    "Make The Difference",
    "Practical ways to join Purple Diamond Crew and help people on the ground.",
    "/make-the-difference/",
    '''<section class="pdc-hero-text">
<p class="kicker">PURPLE DIAMOND CREW</p>
<h1>Make The Difference.</h1>
<p>Show up. Bring what you can. Help the people already helping people.</p>
</section>
<section class="pdc-section action-grid">
<a class="action-card" href="https://foodworldz.com/"><b>🍲</b><h2>Food</h2><p>Meals, food rescue, storage, preparation and practical local supply.</p></a>
<a class="action-card" href="https://donateworldz.com/fresh-water-mission/"><b>💧</b><h2>Clean Water</h2><p>Bores, pumps, water infrastructure, equipment and expertise.</p></a>
<a class="action-card" href="https://oneworldz.com/shelterworldz/"><b>🏠</b><h2>Shelter</h2><p>Tents, blankets, mattresses, safer places to sleep and rebuild.</p></a>
<a class="action-card" href="https://oneworldz.com/healthworldz/"><b>❤</b><h2>Health</h2><p>Practical medical, hygiene and wellbeing support pathways.</p></a>
<a class="action-card" href="https://donateworldz.com/grow-food-mission/"><b>🌱</b><h2>Grow</h2><p>Seeds, gardens, farms, tools, irrigation and food-producing skills.</p></a>
<a class="action-card" href="https://oneworldz.com/educationworldz/"><b>📚</b><h2>Education</h2><p>Learning, practical skills, school support and opportunity.</p></a>
<a class="action-card" href="mailto:hello@oneworldz.com?subject=Purple%20Diamond%20Crew%20-%20Join%20The%20Crew"><b>💎</b><h2>Join The Crew</h2><p>Volunteer time, transport, trade skills, equipment or community connections.</p></a>
<a class="action-card" href="https://donateworldz.com/"><b>🌏</b><h2>Contribute</h2><p>Choose a transparent DonateWorldz pathway and support practical action.</p></a>
</section>
<section class="pdc-cta"><h2>Real help beats another page of promises.</h2><p>Food • Water • Shelter • Clothing • Medical Care • Education • Farming • Community Support • Volunteers • Equipment</p></section>'''
)

token_options = ''.join(f'<option value="{mint}">{escape(label)} — {mint[:8]}…</option>' for label,mint in TOKENS)
hodlerz = shell(
    "The Hodlerz Special",
    "Legacy holder wallet registry, private ownership claims and the Purple Diamond Crew legacy holder bonus policy.",
    "/hodlerz-special/",
    f'''<section class="pdc-hero-text hodler-head">
<p class="kicker">THE HODLERZ SPECIAL</p>
<h1>We Remember The People Who Were There.</h1>
<p>Legacy wallet addresses are public on-chain. The person behind a wallet stays private unless they choose otherwise.</p>
<div class="bonus-banner"><strong>1% LEGACY HODLER BONUS</strong><span>Once JayJayTeamDev + Stepper verify the person behind a qualifying legacy-holder wallet, that verified person is designated for a 1% allocation of each newly created ecosystem token — additional to any other allocation, bonus or reward they may separately qualify for.</span><small>1% means token-supply allocation, not a promise of price, profit or monetary return.</small></div>
</section>
<section class="pdc-section">
<div class="registry-head">
<div><p class="kicker">LIVE ON-CHAIN REGISTRY</p><h2>Legacy Holder Wallet Addresses</h2><p class="lead">The page scans the ten genuine legacy mints and lists every non-zero holder wallet returned by the Solana RPC.</p></div>
<button id="scanAll" class="purple-btn" type="button">Scan All 10 Legacy Tokens</button>
</div>
<div id="scanStatus" class="status-box">Ready to scan.</div>
<div class="holder-table-wrap">
<table class="holder-table"><thead><tr><th>Legacy Token</th><th>Wallet Address</th><th>Balance</th><th></th></tr></thead><tbody id="holderRows"><tr><td colspan="4">Press “Scan All 10 Legacy Tokens”.</td></tr></tbody></table>
</div>
</section>
<section class="pdc-section claim-zone" id="claim">
<p class="kicker">PRIVATE CLAIM</p>
<h2>That Wallet Is Mine.</h2>
<p class="lead">Your name/contact is stored privately for verification. It is never added to the public holder list. Purple Diamond Crew will never ask for your seed phrase or private key.</p>
<form id="claimForm">
<input class="honey" name="website" tabindex="-1" autocomplete="off">
<label>Legacy Token<select id="claimMint" name="mint" required><option value="">Choose legacy token…</option>{token_options}</select></label>
<label>Holder Wallet<input id="claimWallet" name="wallet" required placeholder="Solana wallet address"></label>
<label>Name / Alias <span>(private, optional)</span><input id="claimAlias" name="alias" maxlength="100"></label>
<label>Private Contact <span>(email / Telegram / X — not published)</span><input id="claimContact" name="contact" maxlength="240" placeholder="How JayJayTeamDev / Stepper can reach you"></label>
<label>Anything we should know? <span>(private, optional)</span><textarea id="claimNote" name="note" maxlength="1000"></textarea></label>
<div class="claim-actions">
<button id="signClaim" class="purple-btn" type="button">Sign With Phantom + Submit</button>
<button id="manualClaim" class="ghost-btn" type="submit">Submit For Private Manual Verification</button>
</div>
<p id="claimStatus" class="status-box">No seed phrase. No private key. A wallet signature proves control without handing over the wallet.</p>
</form>
</section>''',
    '<script src="/pdc-hodlerz.js" defer></script>'
)

ack = shell(
    "Acknowledgements",
    "Purple Diamond Crew acknowledgements for the people, holders and helpers who built the history and continue the work.",
    "/acknowledgements/",
    '''<section class="pdc-hero-text">
<p class="kicker">ACKNOWLEDGEMENTS</p>
<h1>Never Forget Who Helped Build It.</h1>
<p>Purple Diamond Crew exists because people showed up — online, on-chain and on the ground.</p>
</section>
<section class="pdc-section acknowledgements">
<article><h2>JayJayTeamDev</h2><p>Creator and mission designer — carrying the original Purple Diamond Crew history into OneWorldz.</p></article>
<article><h2>Stepper</h2><p>Core collaborator and one of the people entrusted with helping verify genuine legacy-holder claims.</p></article>
<article><h2>The Core Crew</h2><p>Remedy / Remediy • Sxvage / Savage • SolMussic / Solmusic • Mahammad — and the people who kept contributing when there was nothing easy about it.</p></article>
<article><h2>The Original Hodlerz</h2><p>Every genuine wallet that held the legacy Purple Diamond Crew tokens. The blockchain kept the record. The Hodlerz Special is designed so the real people behind those wallets can privately step forward and be recognised.</p></article>
<article><h2>The People On The Ground</h2><p>Volunteers, churches, charities, support workers, businesses, cooks, drivers, builders, growers, donors and ordinary people who help another person because it needs doing.</p></article>
<article><h2>The Mission</h2><p><strong>Helping the People who Help the People.</strong><br>One World • One Vision • One Fam.</p></article>
</section>'''
)

CSS = r'''/* Purple Diamond Crew — locked five-page surface */
.pdc-five{margin:0;background:#050208;color:#fff;min-height:100vh;overflow-x:hidden}
.pdc-five main{min-height:100vh}
.pdc-float{position:fixed;z-index:9999;right:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:9px}
.pdc-float a{display:flex;align-items:center;gap:9px;min-width:52px;max-width:52px;height:52px;padding:0 15px;border:1px solid rgba(211,139,255,.52);border-radius:999px;background:rgba(10,3,17,.78);backdrop-filter:blur(10px);box-shadow:0 0 20px rgba(150,35,255,.2);overflow:hidden;transition:.2s;color:#fff}
.pdc-float a:hover,.pdc-float a:focus-visible,.pdc-float a.active{max-width:230px;border-color:#d98bff;box-shadow:0 0 28px rgba(179,71,255,.55);outline:0}
.pdc-float b{font-size:1.08rem;min-width:20px;text-align:center}.pdc-float span{white-space:nowrap;font-weight:900;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}
.visual-page{position:relative;min-height:100vh;display:grid;place-items:center;background:#000;overflow:hidden}
.visual-page>img{width:100%;height:100vh;object-fit:contain;background:#000}
.visual-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.12) 55%,rgba(0,0,0,.62))}
.home-mark,.chest-mark{position:absolute;left:clamp(18px,4vw,68px);bottom:clamp(22px,5vw,70px);max-width:880px;text-shadow:0 3px 20px #000}
.home-mark p,.chest-mark p,.kicker{margin:0 0 8px;color:#df9aff;font-weight:950;letter-spacing:.16em;text-transform:uppercase}
.home-mark h1,.chest-mark h1{font-size:clamp(2.4rem,7vw,7rem);line-height:.86;margin:0;letter-spacing:-.045em}
.home-mark h2{font-size:clamp(1.3rem,3vw,3.1rem);margin:.25em 0;letter-spacing:.22em}.home-mark span,.chest-mark span{font-size:clamp(1rem,2vw,1.45rem);font-weight:800}
.pdc-hero-text{padding:clamp(70px,10vw,140px) clamp(20px,8vw,120px) 60px;min-height:55vh;display:flex;flex-direction:column;justify-content:end;background:radial-gradient(circle at 80% 10%,rgba(152,40,255,.3),transparent 35%),linear-gradient(160deg,#150522,#040206)}
.pdc-hero-text h1{font-size:clamp(3rem,8vw,8rem);line-height:.88;margin:.1em 0;max-width:1100px;letter-spacing:-.05em}.pdc-hero-text>p:not(.kicker){font-size:clamp(1rem,2vw,1.45rem);max-width:880px;color:#ded5e5}
.pdc-section{padding:clamp(28px,5vw,70px) clamp(18px,7vw,110px);max-width:1700px;margin:auto}.pdc-section h2{font-size:clamp(2rem,4vw,4rem);margin:.15em 0}.lead{color:#cfc4d7;max-width:900px;font-size:1.08rem;line-height:1.6}
.legacy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:26px}.legacy-card{padding:18px;border:1px solid rgba(200,103,255,.42);border-radius:18px;background:linear-gradient(145deg,rgba(49,8,75,.72),rgba(8,3,14,.95));box-shadow:inset 0 0 30px rgba(138,44,214,.11)}.legacy-card span{font-size:.72rem;color:#d992ff;letter-spacing:.14em;font-weight:900}.legacy-card h3{margin:.25em 0 .7em;font-size:1.35rem}.legacy-card code{display:block;word-break:break-all;color:#c8bdcf;font-size:.82rem}.legacy-card a{display:inline-block;margin-top:16px;color:#e5aaff;font-weight:900}
.action-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.action-card{padding:24px;min-height:230px;border-radius:20px;border:1px solid rgba(202,112,255,.35);background:linear-gradient(145deg,rgba(49,8,75,.55),rgba(8,3,14,.97));color:#fff}.action-card:hover{transform:translateY(-3px);border-color:#d98bff}.action-card b{font-size:2rem}.action-card h2{font-size:1.6rem;margin:.5em 0}.action-card p{color:#cec4d5;line-height:1.5}.pdc-cta{padding:55px 20px;text-align:center;border-top:1px solid rgba(255,255,255,.1)}.pdc-cta h2{font-size:clamp(2rem,5vw,5rem);margin:0}.pdc-cta p{color:#d5c8dc}
.bonus-banner{display:grid;gap:9px;max-width:1050px;margin-top:24px;padding:20px;border:1px solid #d98bff;border-radius:20px;background:linear-gradient(135deg,rgba(132,23,210,.34),rgba(10,3,17,.92));box-shadow:0 0 35px rgba(162,46,255,.2)}.bonus-banner strong{font-size:clamp(1.4rem,3vw,2.4rem);color:#f0c3ff}.bonus-banner span{font-size:1.08rem;line-height:1.5}.bonus-banner small{color:#baafc1}
.registry-head{display:flex;align-items:end;justify-content:space-between;gap:20px}.purple-btn,.ghost-btn{border-radius:13px;padding:13px 18px;font-weight:950;cursor:pointer;color:#fff}.purple-btn{border:1px solid #dd9aff;background:linear-gradient(135deg,#8125cf,#be4fff);box-shadow:0 0 20px rgba(184,73,255,.28)}.ghost-btn{border:1px solid rgba(255,255,255,.24);background:#100819}.status-box{margin:14px 0;padding:12px 14px;border:1px solid rgba(219,147,255,.25);border-radius:12px;background:#0e0715;color:#cabed0}.holder-table-wrap{overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:15px}.holder-table{width:100%;border-collapse:collapse;min-width:880px}.holder-table th,.holder-table td{padding:12px 13px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}.holder-table th{color:#e6b4ff;font-size:.77rem;text-transform:uppercase;letter-spacing:.1em}.holder-table code{font-size:.78rem}.claim-zone form{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:1000px}.claim-zone label{display:grid;gap:6px;font-weight:850}.claim-zone label span{font-weight:500;color:#a99daf;font-size:.8rem}.claim-zone input,.claim-zone select,.claim-zone textarea{width:100%;padding:12px;border-radius:11px;border:1px solid rgba(220,151,255,.3);background:#0d0614;color:#fff}.claim-zone textarea{min-height:110px;resize:vertical}.claim-zone label:nth-of-type(5),.claim-actions,#claimStatus{grid-column:1/-1}.claim-actions{display:flex;gap:10px;flex-wrap:wrap}.honey{position:absolute!important;left:-10000px!important}
.acknowledgements{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.acknowledgements article{padding:25px;border-radius:20px;border:1px solid rgba(206,119,255,.32);background:linear-gradient(145deg,rgba(49,8,75,.45),rgba(8,3,14,.97))}.acknowledgements h2{font-size:1.7rem}.acknowledgements p{line-height:1.6;color:#d1c5d8}
@media(max-width:1050px){.action-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:780px){.pdc-float{top:auto;right:8px;left:8px;bottom:8px;transform:none;flex-direction:row;justify-content:center;background:rgba(4,1,8,.78);padding:7px;border-radius:18px;backdrop-filter:blur(12px)}.pdc-float a,.pdc-float a:hover,.pdc-float a:focus-visible,.pdc-float a.active{width:48px;min-width:48px;max-width:48px;height:46px;padding:0;justify-content:center}.pdc-float span{display:none}.visual-page>img{height:auto;max-height:calc(100vh - 60px);object-fit:contain}.visual-page{min-height:calc(100vh - 60px)}.home-mark,.chest-mark{bottom:78px}.legacy-grid,.acknowledgements,.claim-zone form{grid-template-columns:1fr}.claim-zone label:nth-of-type(5),.claim-actions,#claimStatus{grid-column:auto}.registry-head{align-items:stretch;flex-direction:column}.pdc-section{padding-bottom:80px}}
@media(max-width:560px){.action-grid{grid-template-columns:1fr}.pdc-hero-text{padding:60px 16px 40px}.home-mark h1,.chest-mark h1{font-size:2.35rem}.home-mark h2{font-size:1.1rem}.home-mark p,.chest-mark p{font-size:.72rem}.home-mark span,.chest-mark span{font-size:.9rem}}
'''

JS = r'''(() => {
const TOKENS = [
["Original PDC","F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump"],
["First PDC1","PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw"],
["PDC1-2","PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52"],
["PDCMAGA","7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump"],
["PDCShares","PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE"],
["PurpleDC","9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf"],
["OG Purple","DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump"],
["PCC1 legacy","DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv"],
["INVEST","VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC"],
["Limited Edition","Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY"]
];
const TOKEN_PROGRAMS=["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const RPC="https://api.mainnet-beta.solana.com";
const CLAIM="https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/pdc-hodler-claim";
const rows=document.getElementById("holderRows"), scan=document.getElementById("scanAll"), scanStatus=document.getElementById("scanStatus");
const mintEl=document.getElementById("claimMint"), walletEl=document.getElementById("claimWallet"), claimStatus=document.getElementById("claimStatus"), form=document.getElementById("claimForm");

async function rpc(method,params){
 const r=await fetch(RPC,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:method,params:params})});
 if(!r.ok) throw new Error("RPC HTTP "+r.status);
 const j=await r.json(); if(j.error) throw new Error(j.error.message||"RPC error"); return j.result;
}
async function holdersFor(label,mint){
 const byOwner=new Map();
 for(const program of TOKEN_PROGRAMS){
  try{
   const res=await rpc("getProgramAccounts",[program,{encoding:"jsonParsed",commitment:"confirmed",filters:[{memcmp:{offset:0,bytes:mint}}]}]);
   for(const item of res||[]){
    const info=item && item.account && item.account.data && item.account.data.parsed && item.account.data.parsed.info;
    const owner=info && info.owner, ta=info && info.tokenAmount;
    if(!owner||!ta||!ta.amount||BigInt(ta.amount)<=0n) continue;
    const prev=byOwner.get(owner)||{raw:0n,decimals:Number(ta.decimals||0)};
    prev.raw+=BigInt(ta.amount); prev.decimals=Number(ta.decimals||prev.decimals||0); byOwner.set(owner,prev);
   }
  }catch(e){ console.warn(program,mint,e); }
 }
 const out=[];
 for(const pair of byOwner){
  const owner=pair[0],x=pair[1],s=x.raw.toString().padStart(x.decimals+1,"0");
  const whole=x.decimals?s.slice(0,-x.decimals):s;
  const frac=x.decimals?s.slice(-x.decimals).replace(/0+$/,""):"";
  out.push({label:label,mint:mint,owner:owner,balance:frac?whole+"."+frac:whole,raw:x.raw});
 }
 out.sort((a,b)=>a.raw===b.raw?0:(a.raw>b.raw?-1:1)); return out;
}
function addRow(h){
 const tr=document.createElement("tr");
 const td1=document.createElement("td"); td1.textContent=h.label;
 const td2=document.createElement("td"); const code=document.createElement("code"); code.textContent=h.owner; td2.append(code);
 const td3=document.createElement("td"); td3.textContent=h.balance;
 const td4=document.createElement("td"); const b=document.createElement("button"); b.type="button"; b.className="ghost-btn"; b.textContent="Claim Privately";
 b.onclick=()=>{mintEl.value=h.mint;walletEl.value=h.owner;document.getElementById("claim").scrollIntoView({behavior:"smooth"});};
 td4.append(b); tr.append(td1,td2,td3,td4); rows.append(tr);
}
if(scan) scan.addEventListener("click",async()=>{
 scan.disabled=true; rows.innerHTML=""; let total=0,failed=0;
 for(let i=0;i<TOKENS.length;i++){
  const label=TOKENS[i][0],mint=TOKENS[i][1]; scanStatus.textContent="Scanning "+(i+1)+"/10 — "+label+"…";
  try{
   const hs=await holdersFor(label,mint); hs.forEach(addRow); total+=hs.length;
   if(!hs.length){const tr=document.createElement("tr");tr.innerHTML="<td>"+label+"</td><td colspan='3'>No non-zero holders returned by public RPC.</td>";rows.append(tr);}
  }catch(e){
   failed++;const tr=document.createElement("tr");tr.innerHTML="<td>"+label+"</td><td colspan='3'>Live scan unavailable: "+String(e.message||e)+"</td>";rows.append(tr);
  }
  await new Promise(r=>setTimeout(r,350));
 }
 scanStatus.textContent="Scan complete: "+total+" holder-wallet rows across 10 legacy tokens"+(failed?" • "+failed+" token scans had RPC errors":"")+".";
 scan.disabled=false;
});

function b58(bytes){
 const A="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; let digits=[0];
 for(const byte of bytes){let carry=byte;for(let j=0;j<digits.length;j++){carry+=digits[j]<<8;digits[j]=carry%58;carry=(carry/58)|0;}while(carry){digits.push(carry%58);carry=(carry/58)|0;}}
 let out="";for(let k=0;k<bytes.length&&bytes[k]===0;k++)out+=A[0];for(let q=digits.length-1;q>=0;q--)out+=A[digits[q]];return out;
}
async function submit(extra){
 extra=extra||{};
 const payload={wallet:walletEl.value.trim(),mint:mintEl.value,alias:document.getElementById("claimAlias").value.trim(),contact:document.getElementById("claimContact").value.trim(),note:document.getElementById("claimNote").value.trim(),website:form.website.value,...extra};
 claimStatus.textContent="Submitting private claim…";
 const r=await fetch(CLAIM,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const j=await r.json().catch(()=>({error:"Unexpected server response"}));
 if(!r.ok) throw new Error(j.error||"Claim failed");
 claimStatus.textContent="Claim saved privately. "+j.wallet_proof+". "+j.holding_check+(j.balance?" • Current balance: "+j.balance:"")+". Claim ID: "+j.claim_id;
}
if(form) form.addEventListener("submit",async e=>{e.preventDefault();try{await submit();}catch(err){claimStatus.textContent=String(err.message||err);}});
const signBtn=document.getElementById("signClaim");
if(signBtn) signBtn.addEventListener("click",async()=>{
 try{
  const provider=window.solana;
  if(!provider||!provider.isPhantom) throw new Error("Phantom was not detected. Use the manual private claim button or open this page in Phantom.");
  const mint=mintEl.value;if(!mint) throw new Error("Choose the legacy token first.");
  const resp=await provider.connect(); const wallet=resp.publicKey.toString(); walletEl.value=wallet;
  const nonce=Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
  const msg="PurpleDiamondCrew Hodlerz Special Claim\nWallet: "+wallet+"\nLegacy Mint: "+mint+"\nTimestamp: "+new Date().toISOString()+"\nNonce: "+nonce;
  const signed=await provider.signMessage(new TextEncoder().encode(msg),"utf8");
  await submit({message:msg,signature:b58(signed.signature)});
 }catch(err){claimStatus.textContent=String(err.message||err);}
});
})();'''

SITE.mkdir(parents=True, exist_ok=True)
(SITE / "index.html").write_text(home, encoding="utf-8")
for route, content in {
    "hope-chest": chest,
    "make-the-difference": difference,
    "hodlerz-special": hodlerz,
    "acknowledgements": ack,
}.items():
    p = SITE / route
    p.mkdir(parents=True, exist_ok=True)
    (p / "index.html").write_text(content, encoding="utf-8")

(SITE / "pdc-five.css").write_text(CSS, encoding="utf-8")
(SITE / "pdc-hodlerz.js").write_text(JS, encoding="utf-8")

urls = [
    "https://purplediamondcrew.com/",
    "https://purplediamondcrew.com/hope-chest/",
    "https://purplediamondcrew.com/make-the-difference/",
    "https://purplediamondcrew.com/hodlerz-special/",
    "https://purplediamondcrew.com/acknowledgements/",
]
xml = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
xml += [f"  <url><loc>{u}</loc></url>" for u in urls]
xml.append("</urlset>")
(SITE / "sitemap.xml").write_text("\n".join(xml)+"\n", encoding="utf-8")
(SITE / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: https://purplediamondcrew.com/sitemap.xml\n", encoding="utf-8")

manifest = ROOT / ".ecosystem-urls.txt"
all_urls = set(x.strip() for x in manifest.read_text(encoding="utf-8").splitlines() if x.strip()) if manifest.exists() else set()
all_urls.update(urls)
manifest.write_text("\n".join(sorted(all_urls))+"\n", encoding="utf-8")

print("PDC_FIVE_PAGE=PASS pages=5 legacy_tokens=10 private_claim=1 hodler_bonus=1pct")
