const dns = require("node:dns").promises;
const express = require("express");

const OWNED_DOMAINS = Object.freeze([
  "oneworldz.com",
  "cryptoworldz.xyz",
  "solworldz.xyz",
  "ethworldz.xyz",
  "baseworldz.xyz",
  "xrpworldz.xyz",
  "bnbworldz.xyz",
  "suiworldz.xyz",
  "hyperworldz.xyz",
  "robinworldz.xyz",
  "hodlerworldz.xyz",
  "hodlergalaxy.xyz",
  "purplediamondcrew.com",
  "foodworldz.com",
  "donateworldz.com",
  "impactbased.cryptoworldz.xyz",
  "law.oneworldz.com",
  "learn.oneworldz.com",
  "cryptobotz.cryptoworldz.xyz"
]);

const OWNED_DOMAIN_SET = new Set(OWNED_DOMAINS);
const ONEWORLDZ_GPT_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com",
  "https://cryptoworldz.xyz",
  "https://www.cryptoworldz.xyz",
  "https://donateworldz.com",
  "https://www.donateworldz.com",
  "https://foodworldz.com",
  "https://www.foodworldz.com",
  "https://learn.oneworldz.com",
  "https://law.oneworldz.com",
  "https://purplediamondcrew.com",
  "https://www.purplediamondcrew.com"
]);

const ONEWORLDZ_PUBLIC_GPT_GUARD = Object.freeze({
  profile: "oneworldz-public-low-cost-v1",
  model: "gpt-5.6-luna",
  maxOutputTokens: 320,
  perIpLimit: 8,
  dailyLimit: 1000
});

const ONEWORLDZ_GPT_ROUTES = Object.freeze({
  reagan: { label: "Reagan & Children", href: "https://donateworldz.com/reagan-children/" },
  community: { label: "Community Impact", href: "https://donateworldz.com/community-impact/" },
  davis: { label: "Davis Family", href: "https://donateworldz.com/davis-family/" },
  jayjay: { label: "Support JayJayTeamDev", href: "https://donateworldz.com/jayjayteamdev/" },
  donate: { label: "DonateWorldz", href: "https://donateworldz.com/" },
  food: { label: "FoodWorldz", href: "https://foodworldz.com/" },
  ground: { label: "Purple Diamond Crew — On the Ground", href: "https://purplediamondcrew.com/" },
  learn: { label: "Learn.OneWorldz", href: "https://learn.oneworldz.com/" },
  law: { label: "Law.OneWorldz", href: "https://law.oneworldz.com/" },
  crypto: { label: "CryptoWorldz", href: "https://cryptoworldz.xyz/" },
  home: { label: "OneWorldz", href: "https://oneworldz.com/" }
});

function normalizeOwnedDomain(value) {
  const domain = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!OWNED_DOMAIN_SET.has(domain)) throw new Error("domain_not_in_oneworldz_register");
  return domain;
}

async function settleLookup(fn) {
  try { return { values: await fn(), error: null }; }
  catch (error) { return { values: [], error: error?.code || "lookup_failed" }; }
}

async function diagnoseOwnedDomain(value) {
  const domain = normalizeOwnedDomain(value);
  const [ns, a, aaaa] = await Promise.all([
    settleLookup(() => dns.resolveNs(domain)),
    settleLookup(() => dns.resolve4(domain)),
    settleLookup(() => dns.resolve6(domain))
  ]);
  let www = { values: [], error: null };
  if (domain.split(".").length === 2) www = await settleLookup(() => dns.resolveCname(`www.${domain}`));
  return {
    domain,
    nameservers: ns.values,
    a: a.values,
    aaaa: aaaa.values,
    www_cname: www.values,
    errors: { ns: ns.error, a: a.error, aaaa: aaaa.error, www: www.error },
    nameservers_present: ns.values.length > 0,
    root_resolves: a.values.length > 0 || aaaa.values.length > 0
  };
}

function normalizeGuideHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-4).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim().slice(0, 1000);
    return role && content ? [{ role, content }] : [];
  });
}

function extractOpenAIText(payload) {
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function suggestedGuideRoutes(text = "") {
  const value = String(text).toLowerCase();
  const keys = [];
  const add = (key) => { if (!keys.includes(key)) keys.push(key); };
  if (/reagan|uganda|action spreads smiles|children|orphan/.test(value)) add("reagan");
  if (/community impact|community support|35|cause|causes/.test(value)) add("community");
  if (/davis family|davis/.test(value)) add("davis");
  if (/jayjay|teamdev|developer support|support the build/.test(value)) add("jayjay");
  if (/food|meal|hunger|garden|gardening|grow|water/.test(value)) add("food");
  if (/volunteer|on the ground|blanket|tent|repair|purple diamond/.test(value)) add("ground");
  if (/learn|education|research|swift grow|skill/.test(value)) add("learn");
  if (/law|policy|robin hood|rights/.test(value)) add("law");
  if (/crypto|blockchain|token|solana|ethereum|base|bnb|xrp/.test(value)) add("crypto");
  if (/donate|support|give|payment/.test(value)) add("donate");
  if (!keys.length) add("home");
  return keys.slice(0, 4).map((key) => ONEWORLDZ_GPT_ROUTES[key]);
}

const guideBuckets = new Map();
let guideDay = new Date().toISOString().slice(0, 10);
let guideDayCount = 0;

function allowGuideRequest(req) {
  const now = Date.now();
  const key = String(req.ip || req.socket?.remoteAddress || "unknown");
  const current = guideBuckets.get(key);
  if (!current || current.resetAt <= now) {
    guideBuckets.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= ONEWORLDZ_PUBLIC_GPT_GUARD.perIpLimit;
}

function allowGuideDailyRequest() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== guideDay) {
    guideDay = today;
    guideDayCount = 0;
  }
  guideDayCount += 1;
  return guideDayCount <= ONEWORLDZ_PUBLIC_GPT_GUARD.dailyLimit;
}

function setGuideCors(req, res) {
  const origin = String(req.get("origin") || "").trim();
  if (origin && ONEWORLDZ_GPT_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
}

async function moderateGuideInput(apiKey, input, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`openai_moderation_${response.status}`);
  return Boolean(payload?.results?.[0]?.flagged);
}

async function askOneWorldzGuide({ message, history, page, fetchImpl = globalThis.fetch }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = ONEWORLDZ_PUBLIC_GPT_GUARD.model;
  if (!apiKey) {
    const error = new Error("openai_api_not_configured");
    error.status = 503;
    throw error;
  }
  const cleanMessage = String(message || "").trim().slice(0, 1200);
  if (!cleanMessage) {
    const error = new Error("message_required");
    error.status = 400;
    throw error;
  }
  if (await moderateGuideInput(apiKey, cleanMessage, fetchImpl)) {
    const error = new Error("message_not_supported");
    error.status = 400;
    throw error;
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: ONEWORLDZ_PUBLIC_GPT_GUARD.maxOutputTokens,
      instructions: [
        "You are OneWorldz GPT, the shared public AI guide for OneWorldz Full Support and the CryptoWorldz GTP surface.",
        "Mission: Helping the People Who Help People. Be clear, practical, respectful and concise.",
        "OneWorldz is the human/global gateway. CryptoWorldz is the separate crypto and blockchain branch. Do not turn normal OneWorldz questions into crypto promotion.",
        "Keep the four separated support pathways separate: Reagan & Children at https://donateworldz.com/reagan-children/ ; Community Impact at https://donateworldz.com/community-impact/ ; Davis Family at https://donateworldz.com/davis-family/ ; Support JayJayTeamDev at https://donateworldz.com/jayjayteamdev/ .",
        "PurpleDiamondCrew.com is On the Ground action. FoodWorldz.com covers food relief, growing, water and food-system projects. Learn.OneWorldz.com covers practical learning and research. Law.OneWorldz.com is public-interest policy information and not individual legal advice.",
        "The 2026–2030 Help the People movement is a planned march, concert and participation movement. Never invent a confirmed event, sponsor, partner, donation, deployment status or endorsement.",
        "Never ask for card numbers, bank details, passwords, API keys, wallet seed phrases or private keys. Payments happen only on approved DonateWorldz/Stripe pages, never in chat.",
        "Do not claim tax deductibility or completed fund transfers unless explicitly verified. Do not give individual legal, medical or financial advice.",
        "When useful, finish with one short next action.",
        `Current website surface: ${String(page || "oneworldz").slice(0, 80)}.`
      ].join(" "),
      input: [...normalizeGuideHistory(history), { role: "user", content: cleanMessage }]
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload?.error?.code || payload?.error?.type || "");
    const error = new Error(code === "insufficient_quota" || code === "billing_hard_limit_reached" ? "openai_quota_exhausted" : `openai_api_${response.status}`);
    error.status = response.status;
    throw error;
  }
  const text = extractOpenAIText(payload) || "I can help you find the right OneWorldz support pathway.";
  if (payload.usage) {
    console.info(JSON.stringify({
      event: "oneworldz_gpt_usage",
      model,
      response_id: payload.id || null,
      input_tokens: Number(payload.usage.input_tokens || 0),
      output_tokens: Number(payload.usage.output_tokens || 0),
      total_tokens: Number(payload.usage.total_tokens || 0)
    }));
  }
  return { text, suggestions: suggestedGuideRoutes(`${cleanMessage}\n${text}`), response_id: payload.id || null, model };
}

function hubHtml() {
  const options = OWNED_DOMAINS.map((domain) => `<option value="${domain}">${domain}</option>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#170426"><title>OneWorldz Hub Central | Full Support</title><style>:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:#08010d;color:#fff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#4d1682 0,#170526 36%,#08010d 74%)}main{width:min(900px,100%);margin:auto;padding:28px 16px 60px}.hero{display:flex;gap:15px;align-items:center;margin-bottom:18px}.orb{display:grid;place-items:center;width:62px;height:62px;border-radius:20px;background:linear-gradient(145deg,#a64cff,#431071);font-size:31px;box-shadow:0 0 38px #872cff55}h1,h2,p{margin-top:0}h1{margin-bottom:4px;font-size:clamp(2rem,10vw,3.4rem)}.eyebrow{margin:0 0 5px;color:#dfc1ff;font-weight:800;font-size:.72rem;letter-spacing:.14em}.sub{color:#d8cce2;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card,.panel{border:1px solid #d1a8ff33;background:#170725dd;border-radius:20px;box-shadow:0 18px 50px #0005}.card{padding:14px}.card span{display:block;color:#a995b8;font-size:.7rem;letter-spacing:.1em}.card strong{display:block;margin-top:7px}.ok{color:#70f0a5}.wait{color:#ffd36e}.panel{padding:18px;margin-top:14px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}select,button{font:inherit;border-radius:13px;padding:13px;border:1px solid #d3afff33}select{background:#0d0314;color:#fff;width:100%}button{border:0;background:linear-gradient(135deg,#943bff,#5c20bd);color:#fff;font-weight:800}.out{margin-top:12px;min-height:120px;white-space:pre-wrap;overflow:auto;background:#07010b;border:1px solid #d3afff22;border-radius:14px;padding:13px;color:#d9cde1;font:12px/1.5 ui-monospace,SFMono-Regular,monospace}.note{color:#baabc6;font-size:.86rem;line-height:1.5}@media(min-width:720px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:560px){.row{grid-template-columns:1fr}.row button{width:100%}}</style></head><body><main><section class="hero"><div class="orb">🌐</div><div><p class="eyebrow">ONEWORLDZ 🌐 FULL SUPPORT™</p><h1>Hub Central™</h1><p class="sub">One control point for Worldz diagnostics, deployment status and approved hosting actions.</p></div></section><section class="grid"><div class="card"><span>CRYPTOBOTZ</span><strong class="ok">LIVE</strong></div><div class="card"><span>DOMAIN REGISTER</span><strong class="ok">19 DESTINATIONS</strong></div><div class="card"><span>DNS DIAGNOSTICS</span><strong class="ok">READY</strong></div><div class="card"><span>ONEWORLDZ GPT</span><strong class="${String(process.env.OPENAI_API_KEY || "").trim() ? "ok" : "wait"}">${String(process.env.OPENAI_API_KEY || "").trim() ? "OPENAI READY" : "KEY PENDING"}</strong></div></section><section class="panel"><p class="eyebrow">LIVE DIAGNOSTICS</p><h2>Check a Worldz destination</h2><div class="row"><select id="domain">${options}</select><button id="go">Diagnose</button></div><pre class="out" id="out">Ready.</pre></section><section class="panel"><p class="eyebrow">CONTROL LAW</p><p class="note">Diagnostics are read-only. Hosting writes remain approval-controlled. OneWorldz GPT uses the protected server-side OpenAI key only; browser code never receives the key. Public AI is hard-locked to the low-cost guard.</p></section></main><script>const out=document.getElementById('out');document.getElementById('go').addEventListener('click',async()=>{const domain=document.getElementById('domain').value;out.textContent='Diagnosing '+domain+'…';try{const r=await fetch('/api/hub-central/public-dns?domain='+encodeURIComponent(domain),{cache:'no-store'});const j=await r.json();out.textContent=JSON.stringify(j,null,2)}catch(e){out.textContent=JSON.stringify({ok:false,error:String(e.message||e)},null,2)}});</script></body></html>`;
}

function registerHubCentralLive(app) {
  if (!app || typeof app.get !== "function") throw new Error("express_app_required");

  app.get("/hub-central", (req, res) => {
    res.set("Cache-Control", "no-store, max-age=0");
    return res.type("html").send(hubHtml());
  });

  app.get("/api/hub-central/status", (req, res) => res.json({
    ok: true,
    service: "OneWorldz Hub Central",
    runtime_mode: "live-v1-compatible",
    diagnostics: true,
    owned_destinations: OWNED_DOMAINS.length,
    hostinger_write_control: Boolean(String(process.env.HOSTINGER_API_TOKEN || "").trim()) ? "configured" : "awaiting_secure_auth",
    oneworldz_gpt: Boolean(String(process.env.OPENAI_API_KEY || "").trim()) ? "configured" : "awaiting_openai_key",
    oneworldz_gpt_guard: ONEWORLDZ_PUBLIC_GPT_GUARD.profile,
    write_mode: "approval_controlled"
  }));

  app.get("/api/hub-central/public-dns", async (req, res) => {
    try { return res.json({ ok: true, dns: await diagnoseOwnedDomain(req.query?.domain) }); }
    catch (error) {
      const status = error?.message === "domain_not_in_oneworldz_register" ? 400 : 502;
      return res.status(status).json({ ok: false, error: error?.message || "dns_diagnostic_failed" });
    }
  });

  app.use("/api/oneworldz-gpt", express.json({ limit: "16kb" }));
  app.options("/api/oneworldz-gpt/*", (req, res) => { setGuideCors(req, res); return res.status(204).end(); });
  app.get("/api/oneworldz-gpt/status", (req, res) => {
    setGuideCors(req, res);
    return res.json({
      ok: true,
      service: "OneWorldz GPT",
      powered_by: "OpenAI",
      openai_api_configured: Boolean(String(process.env.OPENAI_API_KEY || "").trim()),
      guard_profile: ONEWORLDZ_PUBLIC_GPT_GUARD.profile,
      guard_enforced: true,
      model: ONEWORLDZ_PUBLIC_GPT_GUARD.model,
      max_output_tokens: ONEWORLDZ_PUBLIC_GPT_GUARD.maxOutputTokens,
      per_ip_limit_10m: ONEWORLDZ_PUBLIC_GPT_GUARD.perIpLimit,
      daily_request_limit: ONEWORLDZ_PUBLIC_GPT_GUARD.dailyLimit,
      mode: "public_guidance",
      payments_in_chat: false,
      secrets_in_browser: false
    });
  });
  app.post("/api/oneworldz-gpt/chat", async (req, res) => {
    setGuideCors(req, res);
    const origin = String(req.get("origin") || "").trim();
    if (origin && !ONEWORLDZ_GPT_ORIGINS.has(origin)) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
    if (!allowGuideDailyRequest()) return res.status(429).json({ ok: false, error: "daily_limit_reached" });
    if (!allowGuideRequest(req)) return res.status(429).json({ ok: false, error: "rate_limited" });
    try {
      const result = await askOneWorldzGuide({ message: req.body?.message, history: req.body?.history, page: req.body?.page });
      return res.json({ ok: true, service: "OneWorldz GPT", powered_by: "OpenAI", ...result });
    } catch (error) {
      return res.status(Number(error?.status) || 500).json({ ok: false, error: error?.message || "oneworldz_gpt_failed" });
    }
  });
}

module.exports = {
  OWNED_DOMAINS,
  ONEWORLDZ_GPT_ORIGINS,
  ONEWORLDZ_PUBLIC_GPT_GUARD,
  askOneWorldzGuide,
  diagnoseOwnedDomain,
  extractOpenAIText,
  hubHtml,
  normalizeGuideHistory,
  normalizeOwnedDomain,
  registerHubCentralLive,
  suggestedGuideRoutes
};
