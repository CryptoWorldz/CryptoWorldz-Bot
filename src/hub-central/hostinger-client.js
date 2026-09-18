const dns = require("node:dns").promises;

const HOSTINGER_API_BASE = "https://developers.hostinger.com";
const WRITE_CONFIRMATION = "APPROVE HOSTINGER WRITE";

function cleanDomain(value) {
  const domain = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error("invalid_domain");
  }
  return domain;
}

function cleanSubdomain(value) {
  const subdomain = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) throw new Error("invalid_subdomain");
  return subdomain;
}

function cleanIpv4(value) {
  const ip = String(value || "").trim();
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) throw new Error("invalid_ipv4");
  return ip;
}

function cleanTtl(value) {
  const ttl = Number(value || 14400);
  if (!Number.isSafeInteger(ttl) || ttl < 60 || ttl > 604800) throw new Error("invalid_ttl");
  return ttl;
}

function requireWriteConfirmation(value) {
  if (String(value || "") !== WRITE_CONFIRMATION) throw new Error("write_confirmation_required");
}

function buildARecordUpdate({ name = "@", content, ttl = 14400, overwrite = true }) {
  const recordName = String(name || "@").trim().toLowerCase();
  if (recordName !== "@" && !/^[a-z0-9*](?:[a-z0-9*-]{0,61}[a-z0-9*])?$/.test(recordName)) throw new Error("invalid_record_name");
  return {
    overwrite: Boolean(overwrite),
    zone: [{
      name: recordName,
      type: "A",
      ttl: cleanTtl(ttl),
      records: [{ content: cleanIpv4(content) }]
    }]
  };
}

function createHostingerClient({ token, fetchImpl = globalThis.fetch } = {}) {
  const apiToken = String(token || "").trim();
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");

  async function request(path, { method = "GET", body } = {}) {
    if (!apiToken) throw new Error("hostinger_api_not_configured");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetchImpl(`${HOSTINGER_API_BASE}${path}`, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${apiToken}`
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try { payload = JSON.parse(raw); }
        catch { payload = { message: raw.slice(0, 500) }; }
      }
      if (!response.ok) {
        const error = new Error(`hostinger_api_${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  const getDnsZone = (domain) => request(`/api/dns/v1/zones/${encodeURIComponent(cleanDomain(domain))}`);
  const validateDnsUpdate = (domain, body) => request(`/api/dns/v1/zones/${encodeURIComponent(cleanDomain(domain))}/validate`, { method: "POST", body });
  const updateDnsZone = (domain, body) => request(`/api/dns/v1/zones/${encodeURIComponent(cleanDomain(domain))}`, { method: "PUT", body });
  const listWebsites = () => request("/api/hosting/v1/websites");

  async function findWebsite(domain) {
    const wanted = cleanDomain(domain);
    const payload = await listWebsites();
    const websites = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    return websites.find((site) => String(site?.domain || "").toLowerCase() === wanted) || null;
  }

  async function listSubdomains(domain) {
    const site = await findWebsite(domain);
    if (!site?.username) throw new Error("hostinger_website_not_found");
    return request(`/api/hosting/v1/accounts/${encodeURIComponent(site.username)}/websites/${encodeURIComponent(cleanDomain(domain))}/subdomains`);
  }

  async function createSubdomain(domain, subdomain, options = {}) {
    const site = await findWebsite(domain);
    if (!site?.username) throw new Error("hostinger_website_not_found");
    const body = { subdomain: cleanSubdomain(subdomain) };
    if (options.directory) body.directory = String(options.directory).trim();
    if (typeof options.isUsingPublicDirectory === "boolean") body.is_using_public_directory = options.isUsingPublicDirectory;
    return request(`/api/hosting/v1/accounts/${encodeURIComponent(site.username)}/websites/${encodeURIComponent(cleanDomain(domain))}/subdomains`, { method: "POST", body });
  }

  async function clearCache(domain) {
    const site = await findWebsite(domain);
    if (!site?.username) throw new Error("hostinger_website_not_found");
    return request(`/api/hosting/v1/accounts/${encodeURIComponent(site.username)}/websites/${encodeURIComponent(cleanDomain(domain))}/cache/clear`, { method: "DELETE" });
  }

  async function setARecord(domain, input) {
    const body = buildARecordUpdate(input);
    await validateDnsUpdate(domain, body);
    await updateDnsZone(domain, body);
    return getDnsZone(domain);
  }

  return {
    configured: () => Boolean(apiToken),
    request,
    getDnsZone,
    validateDnsUpdate,
    updateDnsZone,
    setARecord,
    listWebsites,
    findWebsite,
    listSubdomains,
    createSubdomain,
    clearCache
  };
}

async function diagnosePublicDns(domain) {
  const target = cleanDomain(domain);
  const result = { domain: target, ns: [], a: [], aaaa: [], cname_www: [], errors: {} };
  const lookups = [
    ["ns", () => dns.resolveNs(target)],
    ["a", () => dns.resolve4(target)],
    ["aaaa", () => dns.resolve6(target)],
    ["cname_www", () => dns.resolveCname(`www.${target}`)]
  ];
  await Promise.all(lookups.map(async ([key, fn]) => {
    try { result[key] = await fn(); }
    catch (error) { result.errors[key] = error?.code || "lookup_failed"; }
  }));
  result.root_resolves = result.a.length > 0 || result.aaaa.length > 0;
  result.nameservers_present = result.ns.length > 0;
  return result;
}

module.exports = {
  HOSTINGER_API_BASE,
  WRITE_CONFIRMATION,
  cleanDomain,
  cleanSubdomain,
  cleanIpv4,
  cleanTtl,
  requireWriteConfirmation,
  buildARecordUpdate,
  createHostingerClient,
  diagnosePublicDns
};