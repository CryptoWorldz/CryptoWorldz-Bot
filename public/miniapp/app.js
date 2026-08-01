const tg = window.Telegram && window.Telegram.WebApp;
const state = { data: null, community: null };
const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const empty = (message) => `<div class="panel empty">${escapeHtml(message)}</div>`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": tg ? tg.initData : "", ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
  if (!response.ok) throw new Error(payload.error || "request_failed");
  return payload;
}

function missionCard(mission, current = false) {
  return `<article class="panel mission"><div class="mission-meta">${current ? "CURRENT RAAIIIDD • " : ""}MISSION #${escapeHtml(mission.id)}</div><h3>🎯 ${escapeHtml(mission.title)}</h3><div class="mission-meta">🌐 ${escapeHtml(mission.platform || "Community")} • ⭐ ${Number(mission.reward_points) || 0} Legend Points</div><p>${escapeHtml(mission.description || "Support this CryptoWorldz mission.")}</p>${mission.expires_at ? `<small>Ends ${formatDate(mission.expires_at)}</small>` : ""}${mission.link || mission.target_url ? `<a class="button" href="${escapeHtml(mission.link || mission.target_url)}" target="_blank" rel="noopener">Open Mission</a>` : ""}</article>`;
}

function render() {
  const data = state.data;
  const profile = data.profile;
  byId("welcome-name").textContent = `Welcome, ${profile ? profile.first_name : data.telegram_user.first_name || "Legend"}`;
  byId("points").textContent = profile ? profile.points : "—";
  byId("rank").textContent = profile ? profile.rank : "Register First";
  byId("completed").textContent = profile ? profile.missions_completed : "—";
  byId("pending").textContent = profile ? profile.pending_submissions : "—";

  byId("current-mission").innerHTML = data.missions.length ? `<div class="section-title"><h2>🔥 Current Raaiiidd</h2></div>${missionCard(data.missions[0], true)}` : empty("No active Raaiiidd right now.");
  byId("mission-list").innerHTML = data.missions.length ? data.missions.map((mission) => missionCard(mission)).join("") : empty("No active Raaiiidds right now.");
  byId("home-rewards").innerHTML = `<div class="section-title"><h2>🎁 Recent Rewards</h2><button class="button secondary" data-open="rewards">View All</button></div>${renderRewards(data.rewards.slice(0, 3))}`;
  byId("reward-list").innerHTML = renderRewards(data.rewards);
  byId("leaderboard-list").innerHTML = data.leaderboard.length ? data.leaderboard.map((legend, index) => `<div class="leader"><span>${["🥇","🥈","🥉"][index] || index + 1}</span><span>${escapeHtml(legend.username ? `@${legend.username}` : legend.first_name || "Legend")}</span><strong>${Number(legend.points) || 0} LP</strong></div>`).join("") : empty("Leaderboard data is not available yet.");
  byId("profile-card").innerHTML = profile ? [["Telegram ID",profile.telegram_id],["Username",profile.username ? `@${profile.username}` : "Not Set"],["Rank",profile.rank],["Legend Points",profile.points],["Raaiiidds Complete",profile.missions_completed],["Pending",profile.pending_submissions],["Wallet",profile.wallet_connected ? profile.wallet : "Not Connected"],["Member Since",formatDate(profile.member_since)]].map(([label,value]) => `<div class="profile-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("") + `<div class="panel security"><p>⚠️ Zed will never ask for your seed phrase or private key.</p></div>` : empty("Use /register with Zed before opening your Legend Profile.");
  byId("governance-list").innerHTML = data.governance.length ? data.governance.map((item) => `<article class="panel proposal"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><small>Status: ${escapeHtml(item.status)}</small></article>`).join("") : empty("Community Governance is being prepared. No financial voting is active.");
  byId("kitty-list").innerHTML = data.treasury.length ? data.treasury.map((account) => `<article class="panel"><h3>💰 ${escapeHtml(account.asset)} on Solana</h3><p>${escapeHtml(account.label)}</p><div class="profile-row"><span>Public Address</span><b>${escapeHtml(account.public_address)}</b></div></article>`).join("") + `<div class="panel security"><p>Contributions receive Points only after verifiable on-chain confirmation.</p><p>⚠️ Zed never asks for private keys and never moves funds automatically.</p></div>` : empty("The Community Kitty is being prepared. No contribution address is active yet.");
  renderCommunity();
  if (data.admin) renderAdmin();
}

function renderRewards(rewards) { return rewards.length ? rewards.map((reward) => `<div class="reward"><span>⭐ ${escapeHtml(reward.reason || reward.reward_type || "Legend Reward")}</span><strong>${Number(reward.amount) > 0 ? "+" : ""}${Number(reward.amount) || 0}</strong></div>`).join("") : empty("No reward transactions yet."); }
function renderCommunity(){const links=state.community||{};const labels={telegram:"Telegram Community",x:"CryptoWorldz on X",announcements:"Announcements",support:"Support",website:"CryptoWorldz Website"};byId("community-links").innerHTML=`<div class="links">${Object.entries(labels).filter(([key])=>links[key]).map(([key,label])=>`<a class="link" href="${escapeHtml(links[key])}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`).join("")}</div><button class="button secondary" data-open="kitty">Open Community Kitty</button><button class="button secondary" data-open="governance">Open Governance</button>${state.data.admin?'<button class="button secondary" data-open="admin">Open Admin Centre</button>':""}`;}
async function renderAdmin(){const access=state.data.admin_access||{};byId("admin-panel").innerHTML=`<div class="panel"><h3>Role: ${escapeHtml(access.role||"Admin")}</h3><p>${(access.permissions||[]).map(escapeHtml).join(" • ")}</p></div><div class="panel loading"><div class="orb"></div><p>Loading submissions…</p></div>`;try{const result=await api('/api/mini/admin/submissions');byId("admin-panel").innerHTML+=result.submissions.length?result.submissions.map((item)=>`<div class="submission"><div><b>#${escapeHtml(item.id)} • Mission #${escapeHtml(item.mission_id)}</b><br><small>${escapeHtml(item.users?.username?`@${item.users.username}`:item.users?.first_name||item.telegram_id)}</small></div><span>Pending</span></div>`).join("")+`<div class="panel"><p>Approval controls remain in Telegram during this safe first release.</p></div>`:empty("No pending submissions.");}catch{byId("admin-panel").innerHTML+=empty("Admin submissions could not be loaded.");}}
function showScreen(id){document.querySelectorAll('.screen').forEach((screen)=>screen.classList.toggle('active',screen.id===id));document.querySelectorAll('.nav button').forEach((button)=>button.classList.toggle('active',button.dataset.screen===id));window.scrollTo({top:0,behavior:'smooth'});}
document.addEventListener('click',(event)=>{const target=event.target.closest('[data-screen],[data-open]');if(target)showScreen(target.dataset.screen||target.dataset.open);});

async function start(){try{if(!tg||!tg.initData)throw new Error('telegram_required');tg.ready();tg.expand();tg.setHeaderColor('#09040f');tg.setBackgroundColor('#07030d');const [bootstrap,config]=await Promise.all([api('/api/mini/bootstrap'),fetch('/api/public/mini-config').then((response)=>response.json())]);state.data=bootstrap;state.community=config.community;render();byId('loading').classList.add('hidden');byId('content').classList.remove('hidden');byId('nav').classList.remove('hidden');byId('status').textContent='Secure';byId('status').classList.add('online');}catch(error){byId('loading').classList.add('hidden');byId('error').classList.remove('hidden');byId('error-text').textContent=error.message==='telegram_required'?'Open the Command Centre through Zed in Telegram.':'Zed could not securely open the Command Centre. Please try again.';byId('status').textContent='Locked';}}
start();
