const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BUILD = 'worldz-problem-solving-v1';
const DOMAIN = 'cryptobotz.cryptoworldz.xyz';
const WEBHOOK_PATH = '/telegram/webhook';
const WEBHOOK_URL = 'https://' + DOMAIN + WEBHOOK_PATH;

function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const at = line.indexOf('=');
      if (at < 1) continue;
      const key = line.slice(0, at).replace(/^export\s+/, '').trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (String(process.env[key] || '').trim()) continue;
      let value = line.slice(at + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] = value;
    }
  } catch {}
}
loadEnv();

const BOT_TOKEN = String(process.env.BOT_TOKEN || '').trim();
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');
const API = 'https://api.telegram.org/bot' + BOT_TOKEN;
const WEBHOOK_SECRET = crypto.createHash('sha256').update(BOT_TOKEN).digest('hex').slice(0, 64);

const COMMANDS = [
  { command: 'start', description: 'Open the OneWorldz problem-solving system' },
  { command: 'help', description: 'Show the Command Centre' },
  { command: 'system', description: 'Research → Worldz → Law → Action' },
  { command: 'research', description: 'ResearchWorldz evidence engine' },
  { command: 'food', description: 'FoodWorldz — food systems and rescue' },
  { command: 'water', description: 'WaterWorldz — safe water systems' },
  { command: 'grow', description: 'FarmWorldz / GrowWorldz — food production' },
  { command: 'health', description: 'HealthWorldz — prevention and care' },
  { command: 'shelter', description: 'HomeWorldz / ShelterWorldz — housing' },
  { command: 'education', description: 'EducationWorldz — opportunity and skills' },
  { command: 'energy', description: 'EnergyWorldz — dependable power' },
  { command: 'waste', description: 'WasteWorldz — stop wasting resources' },
  { command: 'transport', description: 'TransportWorldz — move resources safely' },
  { command: 'money', description: 'MoneyWorldz / TaxWorldz — public money' },
  { command: 'integrity', description: 'IntegrityWorldz — transparency and controls' },
  { command: 'law', description: 'LawWorldz — lawful change engine' },
  { command: 'oneworldz', description: 'OneWorldz — bring the mission together' },
  { command: 'donate', description: 'DonateWorldz — fund and deliver the work' }
];

const RULE = 'Find what humanity already knows works. Research the best examples. Improve them where possible. Make the solution understandable and reproducible. Where existing law blocks the better solution, send the evidence to LawWorldz and pursue lawful change.';

const D = {
  research: ['🔎 ResearchWorldz — Evidence Engine', 'Find the strongest proven systems already working anywhere in the world. Ask: Who does this best? What law or operating system makes it work? What does it cost? What measurable results does it produce? Could another country or community reproduce it? Turn the answer into an evidence package for the relevant specialist Worldz and LawWorldz.', [['Open ResearchWorldz','https://learn.oneworldz.com/'],['Send to LawWorldz','https://law.oneworldz.com/']]],
  food: ['🍲 FoodWorldz', 'Everything food: growing, harvesting, storage, refrigeration, preservation, food rescue, food waste, expiry rules, transport, warehousing, preparation, cooking, nutrition, food safety, community kitchens, school meals, emergency feeding and agricultural systems. Research better systems, make them reproducible and route legal barriers to LawWorldz.', [['Open FoodWorldz','https://foodworldz.com/'],['Support Food Missions','https://donateworldz.com/']]],
  water: ['💧 WaterWorldz', 'Bore drilling, groundwater assessment, filtration, testing, solar pumps, manual backup pumps, tanks, pipelines, irrigation, sanitation, maintenance, spare parts and community ownership. Find reliable systems already working and make them reproducible where safe water is missing.', [['Fresh Water Mission','https://donateworldz.com/fresh-water-mission/']]],
  grow: ['🌱 FarmWorldz / GrowWorldz', 'Seeds, fruit trees, vegetable gardens, soil improvement, composting, irrigation, tools, crop selection, climate suitability, farming education, storage and local enterprise. Help communities move from repeated food dependency toward resilient local food production.', [['Grow Food Mission','https://donateworldz.com/grow-food-mission/']]],
  health: ['🏥 HealthWorldz', 'Prevention, medicines, vaccinations, maternal care, clinics, mobile health, nutrition, dental care, mental health and disease prevention. Compare systems that deliver strong health outcomes efficiently, then turn the evidence into practical projects and reform proposals.'],
  shelter: ['🏠 HomeWorldz / ShelterWorldz', 'Homelessness, emergency accommodation, social housing, low-cost construction, sanitation, energy, Housing First systems and laws that have reduced homelessness. Research what works, reproduce it locally and route legal barriers to LawWorldz.'],
  education: ['📚 EducationWorldz', 'Schools, teachers, books, internet, vocational skills, agricultural education, healthcare training and proven education systems that give children and adults genuine opportunity. Focus on measurable learning, access, cost and reproducibility.'],
  energy: ['⚡ EnergyWorldz', 'Solar, batteries, microgrids, pumps, refrigeration and dependable electricity for water systems, food storage, hospitals, schools and communities. Compare reliable low-maintenance systems and design practical deployment standards.'],
  waste: ['♻️ WasteWorldz', 'Stop throwing away resources people need: food waste, recycling, composting, packaging, redistribution and circular-economy systems. Identify rules or procurement systems that create avoidable waste and send evidence-backed reform proposals to LawWorldz.'],
  transport: ['🚚 TransportWorldz', 'Move food, water equipment, medical supplies and humanitarian resources from where they exist to where they are needed, efficiently and safely. Study routing, cold chain, warehousing, customs, last-mile delivery, fleet use and logistics systems that already work.'],
  money: ['💰 MoneyWorldz / TaxWorldz', 'Public budgets, procurement, waste, transparency, auditing and understandable tools showing citizens where public money goes and what alternative spending could accomplish. Use verified public data, clear assumptions and reproducible calculations.'],
  integrity: ['🧾 IntegrityWorldz', 'Documented transparency systems, anti-corruption controls, open contracting, whistleblower protections and public auditing. Give citizens ways to scrutinise public spending using evidence and due process, without unsupported accusations.'],
  law: ['⚖️ LawWorldz — Change Engine', 'Receive evidence packages from ResearchWorldz and every specialist Worldz. Turn proven recommendations into model laws, reform options, petitions, submissions, consultation material and understandable pathways citizens can use to seek lawful policy and legislative change.', [['Open LawWorldz','https://law.oneworldz.com/']]],
  oneworldz: ['🌍 OneWorldz', 'Bring the specialist departments together. Show the public the problem, the evidence, the proposed solution, the lawful change pathway and the practical way to participate. OneWorldz is a world problem-solving system — not a directory of names.', [['Open OneWorldz','https://oneworldz.com/']]],
  donate: ['💜 DonateWorldz — Delivery Engine', 'Fund and deliver the physical work: food, water, farming, shelter, health, equipment and community projects. Donations belong on approved DonateWorldz pages. Zed never asks for card details, passwords, wallet seed phrases or private keys.', [['Open DonateWorldz','https://donateworldz.com/'],['Fresh Water','https://donateworldz.com/fresh-water-mission/'],['Grow Food','https://donateworldz.com/grow-food-mission/']]]
};

const RETIRED = new Set(['profile','register','rewards','points','leaderboard','raid','raaiiidd','missions','wallet','kitty','governance','vote','impact','cancel','community','website','airdrop','airdrops','events','treasury']);

function mainKeyboard() {
  const rows = [
    [['🔎 Research','research'],['⚖️ Law','law']],
    [['🍲 Food','food'],['💧 Water','water']],
    [['🌱 Grow','grow'],['🏥 Health','health']],
    [['🏠 Shelter','shelter'],['📚 Education','education']],
    [['⚡ Energy','energy'],['♻️ Waste','waste']],
    [['🚚 Transport','transport'],['💰 Money / Tax','money']],
    [['🧾 Integrity','integrity'],['💜 Donate','donate']]
  ];
  return { inline_keyboard: rows.map(function(row){ return row.map(function(x){ return { text:x[0], callback_data:'dept:' + x[1] }; }); }).concat([[{text:'🌍 OneWorldz.com',url:'https://oneworldz.com/'}]]) };
}

function departmentKeyboard(buttons) {
  if (!buttons) return mainKeyboard();
  return { inline_keyboard: buttons.map(function(x){ return [{text:x[0],url:x[1]}]; }) };
}

function startText(name) {
  return '🤖💜 Hello ' + (name || 'there') + '!\n\nI’m Zed — the OneWorldz Command Centre.\n\nThis system exists to solve real-world problems:\n\n🔎 ResearchWorldz finds the best proven systems.\n🧩 Specialist Worldz turn evidence into practical solutions.\n⚖️ LawWorldz develops lawful pathways for policy and legislative change.\n🌍 OneWorldz brings the mission together and opens public participation.\n💜 DonateWorldz funds and delivers physical work.\n\nUse /system for the architecture or choose a department below.';
}

function helpText() {
  return '🌍 Zed — OneWorldz Command Centre\n\nCore: /system • /research • /law • /oneworldz • /donate\n\nSpecialists: /food • /water • /grow • /health • /shelter • /education • /energy • /waste • /transport • /money • /integrity\n\nRule:\n' + RULE;
}

function systemText() {
  return '🌍 OneWorldz World Problem-Solving System\n\n1. ResearchWorldz — find and prove what already works.\n2. Specialist Worldz — turn evidence into practical, reproducible solutions.\n3. LawWorldz — convert evidence into lawful reform pathways.\n4. OneWorldz — bring the mission together and let the public participate.\n5. DonateWorldz — fund and deliver the physical work.\n\nOperating rule:\n' + RULE;
}

async function telegram(method, payload) {
  const response = await fetch(API + '/' + method, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload || {}), signal:AbortSignal.timeout(15000) });
  const data = await response.json().catch(function(){ return {}; });
  if (!response.ok || data.ok !== true) throw new Error('telegram_' + method + '_' + response.status);
  return data.result;
}

async function send(chatId, text, markup) {
  return telegram('sendMessage', { chat_id:chatId, text:text, disable_web_page_preview:true, reply_markup:markup || undefined });
}

async function sendDepartment(chatId, key) {
  const dept = D[key];
  if (!dept) return send(chatId, helpText(), mainKeyboard());
  return send(chatId, dept[0] + '\n\n' + dept[1] + '\n\nOperating rule:\n' + RULE, departmentKeyboard(dept[2]));
}

function command(text) {
  const first = String(text || '').trim().split(/\s+/)[0] || '';
  return first.replace(/^\//,'').split('@')[0].toLowerCase();
}

async function handleUpdate(update) {
  if (update.callback_query) {
    const q = update.callback_query;
    telegram('answerCallbackQuery',{callback_query_id:q.id}).catch(function(){});
    const match = /^dept:([a-z]+)$/.exec(String(q.data || ''));
    if (match && q.message && q.message.chat) await sendDepartment(q.message.chat.id, match[1]);
    return;
  }
  const msg = update.message;
  if (!msg || !msg.chat || typeof msg.text !== 'string') return;
  const cmd = command(msg.text);
  if (cmd === 'start') return send(msg.chat.id, startText(msg.from && msg.from.first_name), mainKeyboard());
  if (cmd === 'help') return send(msg.chat.id, helpText(), mainKeyboard());
  if (cmd === 'system') return send(msg.chat.id, systemText(), mainKeyboard());
  if (D[cmd]) return sendDepartment(msg.chat.id, cmd);
  if (cmd === 'farm') return sendDepartment(msg.chat.id, 'grow');
  if (cmd === 'home') return sendDepartment(msg.chat.id, 'shelter');
  if (cmd === 'tax') return sendDepartment(msg.chat.id, 'money');
  if (RETIRED.has(cmd)) return send(msg.chat.id, 'That old CryptoWorldz feature has been retired from Zed.\n\nZed is now focused on the OneWorldz problem-solving system. Use /help to open the current Command Centre.', mainKeyboard());
  if (String(msg.text).trim().startsWith('/')) return send(msg.chat.id, helpText(), mainKeyboard());
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1048576) throw new Error('payload_too_large');
  }
  return raw ? JSON.parse(raw) : {};
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async function(req,res){
  const pathname = String(req.url || '').split('?')[0];
  if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) return json(res,200,{ok:true,service:'Zed OneWorldz Command Centre',build:BUILD,commands:COMMANDS.length,webhook:WEBHOOK_PATH});
  if (req.method === 'GET' && pathname === '/commands') return json(res,200,{ok:true,commands:COMMANDS});
  if (req.method === 'POST' && pathname === WEBHOOK_PATH) {
    const supplied = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    if (!supplied || supplied !== WEBHOOK_SECRET) return json(res,403,{ok:false});
    try {
      const update = await readJson(req);
      json(res,200,{ok:true});
      handleUpdate(update).catch(function(error){ console.error('telegram_update_failed', error && error.message || error); });
      return;
    } catch (error) {
      return json(res,400,{ok:false,error:String(error && error.message || 'invalid_update')});
    }
  }
  return json(res,404,{ok:false,error:'not_found'});
});

async function configure() {
  await telegram('setMyCommands',{commands:COMMANDS});
  await telegram('setChatMenuButton',{menu_button:{type:'commands'}});
  await telegram('setWebhook',{url:WEBHOOK_URL,secret_token:WEBHOOK_SECRET,allowed_updates:['message','callback_query'],drop_pending_updates:false});
  try {
    await telegram('setMyDescription',{description:'Zed is the OneWorldz Command Centre: ResearchWorldz → specialist Worldz → LawWorldz → OneWorldz → DonateWorldz.'});
    await telegram('setMyShortDescription',{short_description:'OneWorldz world problem-solving system.'});
  } catch {}
  console.log('ZED_TELEGRAM_CONFIGURED build=' + BUILD);
}

const port = Number(process.env.PORT || 3000);
server.listen(port,'0.0.0.0',function(){
  console.log('Zed OneWorldz Command Centre listening on ' + port + ' • ' + BUILD);
  configure().catch(function(error){ console.error('telegram_configuration_failed', error && error.message || error); });
});
