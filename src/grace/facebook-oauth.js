const crypto = require("node:crypto");
const { decryptSecret, encryptSecret, stateHash } = require("./oauth");

const FACEBOOK_SCOPES = Object.freeze([
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts"
]);

class GraceFacebookOAuthError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "GraceFacebookOAuthError";
    this.code = options.code || "GRACE_FACEBOOK_OAUTH_ERROR";
    this.status = options.status || null;
    this.permanent = options.permanent !== false;
  }
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeVersion(value) {
  const text = String(value || "v24.0").trim();
  return /^v\d+\.\d+$/.test(text) ? text : "v24.0";
}

function buildFacebookAuthorizationUrl({ appId, redirectUri, state, graphVersion = "v24.0" }) {
  const url = new URL(`https://www.facebook.com/${normalizeVersion(graphVersion)}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
  return url.toString();
}

async function json(response) {
  return response.json().catch(() => ({}));
}

function createFacebookOAuthService(options = {}) {
  const repository = options.repository;
  const fetchImpl = options.fetchImpl || global.fetch;
  const appId = String(options.appId || "").trim();
  const appSecret = String(options.appSecret || "").trim();
  const redirectUri = String(options.redirectUri || "").trim();
  const encryptionSecret = String(options.encryptionSecret || "").trim();
  const graphVersion = normalizeVersion(options.graphVersion);

  if (!repository) throw new Error("A Grace Facebook OAuth repository is required.");
  if (typeof fetchImpl !== "function") throw new Error("A Fetch API implementation is required.");

  function configured() {
    return Boolean(appId && appSecret && redirectUri && encryptionSecret.length >= 32);
  }

  function requireConfigured() {
    if (!appId) throw new GraceFacebookOAuthError("GRACE_META_APP_ID is not configured.", { code: "META_APP_ID_MISSING" });
    if (!appSecret) throw new GraceFacebookOAuthError("GRACE_META_APP_SECRET is not configured.", { code: "META_APP_SECRET_MISSING" });
    if (!redirectUri) throw new GraceFacebookOAuthError("GRACE_META_REDIRECT_URI is not configured.", { code: "META_REDIRECT_URI_MISSING" });
    if (encryptionSecret.length < 32) throw new GraceFacebookOAuthError("Grace token encryption is not configured.", { code: "META_ENCRYPTION_MISSING" });
  }

  async function beginConnection(accountId, actorTelegramId) {
    requireConfigured();
    const account = await repository.getFacebookAccount(accountId);
    if (!account) throw new GraceFacebookOAuthError("Grace could not find that Facebook Page account ID.", { code: "FACEBOOK_ACCOUNT_NOT_FOUND" });

    const state = crypto.randomBytes(32).toString("base64url");
    const nonce = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await repository.createOAuthState({
      accountId: account.id,
      stateHash: stateHash(state),
      verifierCiphertext: encryptSecret(nonce, encryptionSecret),
      expectedHandle: String(account.account_key || "cryptoworldz_fb").replace(/[^A-Za-z0-9_]/g, "_"),
      requestedBy: actorTelegramId,
      expiresAt
    });
    await repository.recordAudit("grace_facebook_oauth_started", actorTelegramId, {
      account_id: account.id,
      expected_page: account.display_name,
      expires_at: expiresAt
    });

    return {
      account,
      expiresAt,
      authorizationUrl: buildFacebookAuthorizationUrl({
        appId,
        redirectUri,
        state,
        graphVersion
      })
    };
  }

  async function exchangeCode(code) {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    const payload = await json(response);
    if (!response.ok || !payload.access_token) {
      throw new GraceFacebookOAuthError(
        payload?.error?.message || `Meta token exchange returned HTTP ${response.status}.`,
        { code: "META_TOKEN_EXCHANGE_FAILED", status: response.status }
      );
    }
    return payload;
  }

  async function exchangeLongLivedToken(shortToken) {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortToken);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    const payload = await json(response);
    if (!response.ok || !payload.access_token) return shortToken;
    return payload.access_token;
  }

  async function listManagedPages(userToken) {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
    url.searchParams.set("fields", "id,name,access_token,tasks");
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", userToken);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    const payload = await json(response);
    if (!response.ok || !Array.isArray(payload.data)) {
      throw new GraceFacebookOAuthError(
        payload?.error?.message || `Meta Page lookup returned HTTP ${response.status}.`,
        { code: "META_PAGE_LOOKUP_FAILED", status: response.status }
      );
    }
    return payload.data;
  }

  function selectPage(account, pages) {
    if (account.external_account_id) {
      const byId = pages.find((page) => String(page.id) === String(account.external_account_id));
      if (byId) return byId;
    }
    const wanted = new Set([
      normalizeName(account.display_name),
      normalizeName(account.handle),
      normalizeName(account.account_key.replace(/_fb$/i, ""))
    ].filter(Boolean));
    return pages.find((page) => wanted.has(normalizeName(page.name))) || null;
  }

  async function completeConnection({ state, code, error, errorDescription }) {
    requireConfigured();
    if (error) throw new GraceFacebookOAuthError(errorDescription || error, { code: "META_AUTHORIZATION_DENIED" });
    if (!state || !code) throw new GraceFacebookOAuthError("The Meta callback is missing its authorization code or state.", { code: "META_CALLBACK_INVALID" });

    const oauthState = await repository.consumeOAuthState(stateHash(state));
    if (!oauthState) throw new GraceFacebookOAuthError("This Meta connection link is invalid, expired or already used.", { code: "META_OAUTH_STATE_INVALID" });
    decryptSecret(oauthState.verifier_ciphertext, encryptionSecret);

    const account = await repository.getFacebookAccount(oauthState.account_id);
    if (!account) throw new GraceFacebookOAuthError("The Facebook Page record no longer exists in Grace.", { code: "FACEBOOK_ACCOUNT_NOT_FOUND" });

    const token = await exchangeCode(code);
    const userToken = await exchangeLongLivedToken(token.access_token);
    const pages = await listManagedPages(userToken);
    const page = selectPage(account, pages);
    if (!page || !page.access_token) {
      await repository.markConnectionError(account.id, `CryptoWorldz Page not found among ${pages.length} authorised Page(s).`);
      throw new GraceFacebookOAuthError("Meta login succeeded, but the CryptoWorldz Facebook Page was not available in the authorised Page list.", { code: "META_PAGE_NOT_FOUND" });
    }

    const connection = await repository.saveConnection({
      accountId: account.id,
      externalAccountId: String(page.id),
      username: String(account.account_key || "cryptoworldz_fb").replace(/[^A-Za-z0-9_]/g, "_"),
      pageName: page.name,
      accessTokenCiphertext: encryptSecret(page.access_token, encryptionSecret),
      scope: FACEBOOK_SCOPES.join(" ")
    });
    await repository.recordAudit("grace_facebook_oauth_connected", oauthState.requested_by, {
      account_id: account.id,
      facebook_page_id: String(page.id),
      page_name: page.name,
      tasks: Array.isArray(page.tasks) ? page.tasks : []
    });
    return { connection, page };
  }

  async function getAccessToken(accountId) {
    requireConfigured();
    const connection = await repository.getConnection(accountId);
    if (!connection) return null;
    return decryptSecret(connection.access_token_ciphertext, encryptionSecret);
  }

  return {
    beginConnection,
    completeConnection,
    configured,
    getAccessToken,
    graphVersion
  };
}

module.exports = {
  FACEBOOK_SCOPES,
  GraceFacebookOAuthError,
  buildFacebookAuthorizationUrl,
  createFacebookOAuthService,
  normalizeName,
  normalizeVersion
};
