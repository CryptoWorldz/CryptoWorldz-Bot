const crypto = require("node:crypto");

class GraceOAuthError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "GraceOAuthError";
    this.code = options.code || "GRACE_OAUTH_ERROR";
    this.permanent = options.permanent !== false;
    this.status = options.status || null;
  }
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function stateHash(value) {
  return base64Url(sha256(value));
}

function pkceChallenge(verifier) {
  return base64Url(sha256(verifier));
}

function encryptionKey(secret) {
  const value = String(secret || "").trim();
  if (value.length < 32) {
    throw new GraceOAuthError("GRACE_TOKEN_ENCRYPTION_KEY must be at least 32 characters.", {
      code: "OAUTH_ENCRYPTION_KEY_MISSING"
    });
  }
  return sha256(value);
}

function encryptSecret(value, secret) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", base64Url(iv), base64Url(tag), base64Url(ciphertext)].join(".");
}

function decryptSecret(value, secret) {
  if (!value) return null;
  const [version, ivValue, tagValue, ciphertextValue] = String(value).split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new GraceOAuthError("Stored OAuth credential format is invalid.", {
      code: "OAUTH_CREDENTIAL_INVALID"
    });
  }
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(secret),
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new GraceOAuthError("Stored OAuth credential could not be decrypted.", {
      code: "OAUTH_CREDENTIAL_DECRYPT_FAILED"
    });
  }
}

function normalizeHandle(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge }) {
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function tokenRequest({ clientId, clientSecret, params }) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const body = new URLSearchParams(params);
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
  }
  return { headers, body };
}

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

function createXOAuthService(options = {}) {
  const repository = options.repository;
  const fetchImpl = options.fetchImpl || global.fetch;
  const clientId = String(options.clientId || "").trim();
  const clientSecret = String(options.clientSecret || "").trim();
  const redirectUri = String(options.redirectUri || "").trim();
  const encryptionSecret = String(options.encryptionSecret || "").trim();
  if (!repository) throw new Error("A Grace OAuth repository is required.");
  if (typeof fetchImpl !== "function") throw new Error("A Fetch API implementation is required.");

  function configured() {
    return Boolean(clientId && redirectUri && encryptionSecret.length >= 32);
  }

  function requireConfigured() {
    if (!clientId) throw new GraceOAuthError("GRACE_X_CLIENT_ID is not configured.", { code: "X_CLIENT_ID_MISSING" });
    if (!redirectUri) throw new GraceOAuthError("GRACE_X_REDIRECT_URI is not configured.", { code: "X_REDIRECT_URI_MISSING" });
    encryptionKey(encryptionSecret);
  }

  async function beginConnection(accountId, actorTelegramId) {
    requireConfigured();
    const account = await repository.getXAccount(accountId);
    if (!account) {
      throw new GraceOAuthError("Grace could not find that X account ID.", { code: "X_ACCOUNT_NOT_FOUND" });
    }
    const expectedHandle = normalizeHandle(account.handle);
    if (!expectedHandle) {
      throw new GraceOAuthError("The Grace account needs an exact X handle before connection.", {
        code: "X_EXPECTED_HANDLE_MISSING"
      });
    }

    const state = base64Url(crypto.randomBytes(32));
    const verifier = base64Url(crypto.randomBytes(64));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await repository.createOAuthState({
      accountId: account.id,
      stateHash: stateHash(state),
      verifierCiphertext: encryptSecret(verifier, encryptionSecret),
      expectedHandle,
      requestedBy: actorTelegramId,
      expiresAt
    });
    await repository.recordAudit("grace_x_oauth_started", actorTelegramId, {
      account_id: account.id,
      expected_handle: expectedHandle,
      expires_at: expiresAt
    });

    return {
      account,
      expiresAt,
      authorizationUrl: buildAuthorizeUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge: pkceChallenge(verifier)
      })
    };
  }

  async function exchangeCode(code, verifier) {
    const request = tokenRequest({
      clientId,
      clientSecret,
      params: {
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier
      }
    });
    const response = await fetchImpl("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(20000)
    });
    const payload = await parseJson(response);
    if (!response.ok || !payload.access_token) {
      throw new GraceOAuthError(payload.error_description || payload.error || `X token exchange returned HTTP ${response.status}.`, {
        code: "X_TOKEN_EXCHANGE_FAILED",
        status: response.status
      });
    }
    return payload;
  }

  async function getAuthenticatedUser(accessToken) {
    const response = await fetchImpl("https://api.x.com/2/users/me?user.fields=id,name,username", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20000)
    });
    const payload = await parseJson(response);
    if (!response.ok || !payload?.data?.id || !payload?.data?.username) {
      throw new GraceOAuthError(payload.detail || payload.title || `X account verification returned HTTP ${response.status}.`, {
        code: "X_ACCOUNT_VERIFICATION_FAILED",
        status: response.status
      });
    }
    return payload.data;
  }

  async function completeConnection({ state, code, error, errorDescription }) {
    requireConfigured();
    if (error) {
      throw new GraceOAuthError(errorDescription || error, { code: "X_AUTHORIZATION_DENIED" });
    }
    if (!state || !code) {
      throw new GraceOAuthError("The X callback is missing its authorization code or state.", {
        code: "X_CALLBACK_INVALID"
      });
    }

    const oauthState = await repository.consumeOAuthState(stateHash(state));
    if (!oauthState) {
      throw new GraceOAuthError("This X connection link is invalid, expired or already used.", {
        code: "X_OAUTH_STATE_INVALID"
      });
    }

    const verifier = decryptSecret(oauthState.verifier_ciphertext, encryptionSecret);
    const token = await exchangeCode(code, verifier);
    const user = await getAuthenticatedUser(token.access_token);
    const expected = normalizeHandle(oauthState.expected_handle);
    const actual = normalizeHandle(user.username);
    if (!expected || expected !== actual) {
      await repository.markConnectionError(oauthState.account_id, `Expected @${expected}; X authorized @${actual}.`);
      await repository.recordAudit("grace_x_oauth_account_mismatch", oauthState.requested_by, {
        account_id: oauthState.account_id,
        expected_handle: expected,
        authorized_handle: actual,
        authorized_account_id: String(user.id)
      });
      throw new GraceOAuthError(`Wrong X account selected. Expected @${expected}, but X authorized @${actual}.`, {
        code: "X_ACCOUNT_MISMATCH"
      });
    }

    const expiresAt = Number(token.expires_in) > 0
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null;
    const connection = await repository.saveConnection({
      accountId: oauthState.account_id,
      externalAccountId: String(user.id),
      username: user.username,
      accessTokenCiphertext: encryptSecret(token.access_token, encryptionSecret),
      refreshTokenCiphertext: encryptSecret(token.refresh_token, encryptionSecret),
      tokenType: token.token_type,
      scope: token.scope,
      expiresAt
    });
    await repository.recordAudit("grace_x_oauth_connected", oauthState.requested_by, {
      account_id: oauthState.account_id,
      x_account_id: String(user.id),
      username: user.username,
      scopes: String(token.scope || "").split(/\s+/).filter(Boolean)
    });
    return { connection, user };
  }

  async function refreshConnection(connection) {
    const refreshToken = decryptSecret(connection.refresh_token_ciphertext, encryptionSecret);
    if (!refreshToken) {
      throw new GraceOAuthError("The X connection has expired and has no refresh token.", {
        code: "X_REFRESH_TOKEN_MISSING"
      });
    }
    const request = tokenRequest({
      clientId,
      clientSecret,
      params: {
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }
    });
    const response = await fetchImpl("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(20000)
    });
    const token = await parseJson(response);
    if (!response.ok || !token.access_token) {
      await repository.markConnectionError(connection.account_id, token.error_description || token.error || "X token refresh failed.");
      throw new GraceOAuthError(token.error_description || token.error || `X token refresh returned HTTP ${response.status}.`, {
        code: "X_TOKEN_REFRESH_FAILED",
        status: response.status
      });
    }
    const expiresAt = Number(token.expires_in) > 0
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null;
    await repository.saveConnection({
      accountId: connection.account_id,
      externalAccountId: connection.external_account_id,
      username: connection.username,
      accessTokenCiphertext: encryptSecret(token.access_token, encryptionSecret),
      refreshTokenCiphertext: encryptSecret(token.refresh_token || refreshToken, encryptionSecret),
      tokenType: token.token_type || connection.token_type,
      scope: token.scope || connection.scope,
      expiresAt
    });
    return token.access_token;
  }

  async function getAccessToken(accountId) {
    requireConfigured();
    const connection = await repository.getConnection(accountId);
    if (!connection) return null;
    const expiry = connection.expires_at ? Date.parse(connection.expires_at) : Number.POSITIVE_INFINITY;
    if (Number.isFinite(expiry) && expiry <= Date.now() + 120000) {
      return refreshConnection(connection);
    }
    return decryptSecret(connection.access_token_ciphertext, encryptionSecret);
  }

  return {
    beginConnection,
    completeConnection,
    configured,
    getAccessToken
  };
}

module.exports = {
  GraceOAuthError,
  buildAuthorizeUrl,
  createXOAuthService,
  decryptSecret,
  encryptSecret,
  normalizeHandle,
  pkceChallenge,
  stateHash,
  tokenRequest
};
