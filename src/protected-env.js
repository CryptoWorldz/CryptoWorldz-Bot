const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PROTECTED_DOMAIN = "cryptobotz.cryptoworldz.xyz";

function candidateEnvironmentFiles({ appRoot = path.join(__dirname, ".."), env = process.env, home = os.homedir() } = {}) {
  const files = [];
  if (String(env.ONEWORLDZ_ENV_FILE || "").trim()) files.push(path.resolve(String(env.ONEWORLDZ_ENV_FILE).trim()));
  files.push(path.join(appRoot, ".env"));
  for (let current = path.resolve(appRoot); current !== path.dirname(current); current = path.dirname(current)) {
    if (path.basename(current) === "nodejs") {
      files.push(path.join(current, ".env"));
      break;
    }
  }
  for (const root of [String(env.HOME || "").trim(), String(home || "").trim()]) {
    if (root) files.push(path.join(root, "domains", PROTECTED_DOMAIN, "nodejs", ".env"));
  }
  for (const account of [String(env.USER || "").trim(), String(env.LOGNAME || "").trim()]) {
    if (account && !account.includes(path.sep)) files.push(path.join("/home", account, "domains", PROTECTED_DOMAIN, "nodejs", ".env"));
  }
  return [...new Set(files)];
}

function parseEnvironment(text) {
  const values = {};
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at < 1) continue;
    const key = line.slice(0, at).replace(/^export\s+/, "").trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function loadProtectedEnvironment(options = {}) {
  const env = options.env || process.env;
  for (const file of candidateEnvironmentFiles({ ...options, env })) {
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    const values = parseEnvironment(text);
    for (const [key, value] of Object.entries(values)) {
      const missing = !Object.prototype.hasOwnProperty.call(env, key);
      const blankProtectedOpenAi = key === "OPENAI_API_KEY" && !String(env[key] || "").trim();
      if (missing || blankProtectedOpenAi) env[key] = value;
    }
    return { loaded: true, source: file === path.join(options.appRoot || path.join(__dirname, ".."), ".env") ? "release" : "protected" };
  }
  return { loaded: false, source: "none" };
}

module.exports = { PROTECTED_DOMAIN, candidateEnvironmentFiles, loadProtectedEnvironment, parseEnvironment };
