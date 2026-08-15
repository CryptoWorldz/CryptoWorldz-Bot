const dns = require("node:dns").promises;

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
    errors: {
      ns: ns.error,
      a: a.error,
      aaaa: aaaa.error,
      www: www.error
    },
    nameservers_present: ns.values.length > 0,
    root_resolves: a.values.length > 0 || aaaa.values.length > 0
  };
}

function hubHtml() {
  const options = OWNED_DOMAINS.map((domain) => `<option value="${domain}">${domain}</option>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#170426">
<title>OneWorldz Hub Central | Full Support</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:#08010d;color:#fff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#4d1682 0,#170526 36%,#08010d 74%)}main{width:min(900px,100%);margin:auto;padding:28px 16px 60px}.hero{display:flex;gap:15px;align-items:center;margin-bottom:18px}.orb{display:grid;place-items:center;width:62px;height:62px;border-radius:20px;background:linear-gradient(145deg,#a64cff,#431071);font-size:31px;box-shadow:0 0 38px #872cff55}h1,h2,p{margin-top:0}h1{margin-bottom:4px;font-size:clamp(2rem,10vw,3.4rem)}.eyebrow{margin:0 0 5px;color:#dfc1ff;font-weight:800;font-size:.72rem;letter-spacing:.14em}.sub{color:#d8cce2;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card,.panel{border:1px solid #d1a8ff33;background:#170725dd;border-radius:20px;box-shadow:0 18px 50px #0005}.card{padding:14px}.card span{display:block;color:#a995b8;font-size:.7rem;letter-spacing:.1em}.card strong{display:block;margin-top:7px}.ok{color:#70f0a5}.wait{color:#ffd36e}.panel{padding:18px;margin-top:14px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}select,button{font:inherit;border-radius:13px;padding:13px;border:1px solid #d3afff33}select{background:#0d0314;color:#fff;width:100%}button{border:0;background:linear-gradient(135deg,#943bff,#5c20bd);color:#fff;font-weight:800}.out{margin-top:12px;min-height:120px;white-space:pre-wrap;overflow:auto;background:#07010b;border:1px solid #d3afff22;border-radius:14px;padding:13px;color:#d9cde1;font:12px/1.5 ui-monospace,SFMono-Regular,monospace}.note{color:#baabc6;font-size:.86rem;line-height:1.5}@media(min-width:720px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:560px){.row{grid-template-columns:1fr}.row button{width:100%}}
</style>
</head>
<body>
<main>
<section class="hero"><div class="orb">🌐</div><div><p class="eyebrow">ONEWORLDZ 🌐 FULL SUPPORT™</p><h1>Hub Central™</h1><p class="sub">One control point for Worldz diagnostics, deployment status and approved hosting actions.</p></div></section>
<section class="grid">
<div class="card"><span>CRYPTOBOTZ</span><strong class="ok">LIVE</strong></div>
<div class="card"><span>DOMAIN REGISTER</span><strong class="ok">19 DESTINATIONS</strong></div>
<div class="card"><span>DNS DIAGNOSTICS</span><strong class="ok">READY</strong></div>
<div class="card"><span>HOSTINGER WRITES</span><strong class="wait">SECURE AUTH PENDING</strong></div>
</section>
<section class="panel"><p class="eyebrow">LIVE DIAGNOSTICS</p><h2>Check a Worldz destination</h2><div class="row"><select id="domain">${options}</select><button id="go">Diagnose</button></div><pre class="out" id="out">Ready.</pre></section>
<section class="panel"><p class="eyebrow">CONTROL LAW</p><p class="note">Diagnostics are read-only. DNS, subdomain, cache or deployment writes remain approval-controlled and will only be enabled after a secure Hostinger authentication rail is present. No Hostinger password or token is exposed in this page.</p></section>
</main>
<script>
const out=document.getElementById('out');
document.getElementById('go').addEventListener('click',async()=>{const domain=document.getElementById('domain').value;out.textContent='Diagnosing '+domain+'…';try{const r=await fetch('/api/hub-central/public-dns?domain='+encodeURIComponent(domain),{cache:'no-store'});const j=await r.json();out.textContent=JSON.stringify(j,null,2)}catch(e){out.textContent=JSON.stringify({ok:false,error:String(e.message||e)},null,2)}});
</script>
</body>
</html>`;
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
    write_mode: "approval_controlled"
  }));

  app.get("/api/hub-central/public-dns", async (req, res) => {
    try {
      return res.json({ ok: true, dns: await diagnoseOwnedDomain(req.query?.domain) });
    } catch (error) {
      const status = error?.message === "domain_not_in_oneworldz_register" ? 400 : 502;
      return res.status(status).json({ ok: false, error: error?.message || "dns_diagnostic_failed" });
    }
  });
}

module.exports = {
  OWNED_DOMAINS,
  diagnoseOwnedDomain,
  hubHtml,
  normalizeOwnedDomain,
  registerHubCentralLive
};
