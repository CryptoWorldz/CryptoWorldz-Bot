import {
  decrypt,
  encrypt,
  hashState,
  pkceChallenge,
  randomState,
} from "./secrets.mjs";

export const X_OAUTH_SCOPES = Object.freeze([
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
]);

export class GraceXError extends Error {
  constructor(message, code = "GRACE_X_ERROR", options = {}) {
    super(message);
    this.name = "GraceXError";
    this.code = code;
    this.status = options.status ?? null;
    this.permanent = options.permanent !== false;
  }
}

export function normalizeHandle(value) {
  return String(value ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function buildAuthorizationUrl({ clientId, redirectUri, state, verifier }) {
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", X_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function tokenRequest({ clientId, clientSecret, values }) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const body = new URLSearchParams(values);
  headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  return { headers, body };
}

async function json(response) {
  return response.json().catch(() => ({}));
}

export function createGraceX({ config, repository, fetchImpl = global.fetch, now = () => Date.now() }) {
  if (!repository) throw new Error("Grace X requires a repository.");
  if (typeof fetchImpl !== "function") throw new Error("Grace X requires Fetch API support.");

  function assertConfigured() {
    if (!config.graceXClientId || !config.graceXClientSecret) {
      throw new GraceXError("Grace X Client ID and Client Secret are not configured.", "X_CLIENT_MISSING");
    }
    if (!config.graceTokenEncryptionKey || config.graceTokenEncryptionKey.length < 32) {
      throw new GraceXError("Grace token encryption is not configured.", "X_ENCRYPTION_MISSING");
    }
  }

  async function beginConnection(accountId, actorTelegramId) {
    assertConfigured();
    const account = await repository.getXAccount(accountId);
    if (!account) throw new GraceXError("Grace could not find that X account ID.", "X_ACCOUNT_NOT_FOUND");
    const expectedHandle = normalizeHandle(account.handle);
    if (!expectedHandle) throw new GraceXError("The approved X account needs an exact handle.", "X_HANDLE_MISSING");

    const state = randomState(32);
    const verifier = randomState(64);
    const expiresAt = new Date(now() + 10 * 60 * 1000).toISOString();
    await repository.createOAuthState({
      accountId: account.id,
      stateHash: hashState(state),
      verifierCiphertext: encrypt(verifier, config.graceTokenEncryptionKey),
      expectedHandle,
      requestedBy: actorTelegramId,
      expiresAt,
    });
    await repository.recordAudit("grace_x_oauth_started", actorTelegramId, {
      account_id: account.id,
      expected_handle: expectedHandle,
      expires_at: expiresAt,
    });
    return {
      account,
      expiresAt,
      authorizationUrl: buildAuthorizationUrl({
        clientId: config.graceXClientId,
        redirectUri: config.graceXRedirectUri,
        state,
        verifier,
      }),
    };
  }

  async function exchangeCode(code, verifier) {
    const request = tokenRequest({
      clientId: config.graceXClientId,
      clientSecret: config.graceXClientSecret,
      values: {
        code,
        grant_type: "authorization_code",
        redirect_uri: config.graceXRedirectUri,
        code_verifier: verifier,
      },
    });
    const response = await fetchImpl("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(20000),
    });
    const payload = await json(response);
    if (!response.ok || !payload.access_token) {
      throw new GraceXError(
        payload.error_description || payload.error || `X token exchange returned HTTP ${response.status}.`,
        "X_TOKEN_EXCHANGE_FAILED",
        { status: response.status },
      );
    }
    return payload;
  }

  async function authenticatedUser(accessToken) {
    const response = await fetchImpl(
      "https://api.x.com/2/users/me?user.fields=id,name,username",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20000),
      },
    );
    const payload = await json(response);
    if (!response.ok || !payload?.data?.id || !payload?.data?.username) {
      throw new GraceXError(
        payload.detail || payload.title || `X account verification returned HTTP ${response.status}.`,
        "X_ACCOUNT_VERIFICATION_FAILED",
        { status: response.status },
      );
    }
    return payload.data;
  }

  async function completeConnection({ state, code, error, errorDescription }) {
    assertConfigured();
    if (error) throw new GraceXError(errorDescription || error, "X_AUTHORIZATION_DENIED");
    if (!state || !code) throw new GraceXError("The X callback is missing its code or state.", "X_CALLBACK_INVALID");

    const oauthState = await repository.consumeOAuthState(hashState(state));
    if (!oauthState) {
      throw new GraceXError(
        "This X connection link is invalid, expired or already used.",
        "X_OAUTH_STATE_INVALID",
      );
    }

    const verifier = decrypt(oauthState.verifier_ciphertext, config.graceTokenEncryptionKey);
    const token = await exchangeCode(code, verifier);
    const user = await authenticatedUser(token.access_token);
    const expected = normalizeHandle(oauthState.expected_handle);
    const actual = normalizeHandle(user.username);
    if (expected !== actual) {
      await repository.markConnectionError(
        oauthState.account_id,
        `Expected @${expected}; X authorized @${actual}.`,
      );
      await repository.recordAudit("grace_x_oauth_account_mismatch", oauthState.requested_by, {
        account_id: oauthState.account_id,
        expected_handle: expected,
        authorized_handle: actual,
      });
      throw new GraceXError(
        `Wrong X account selected. Expected @${expected}, but X authorized @${actual}.`,
        "X_ACCOUNT_MISMATCH",
      );
    }

    const expiresAt = Number(token.expires_in) > 0
      ? new Date(now() + Number(token.expires_in) * 1000).toISOString()
      : null;
    const connection = await repository.saveConnection({
      accountId: oauthState.account_id,
      externalAccountId: String(user.id),
      username: user.username,
      accessTokenCiphertext: encrypt(token.access_token, config.graceTokenEncryptionKey),
      refreshTokenCiphertext: encrypt(token.refresh_token, config.graceTokenEncryptionKey),
      tokenType: token.token_type || "bearer",
      scope: token.scope || X_OAUTH_SCOPES.join(" "),
      expiresAt,
    });
    await repository.recordAudit("grace_x_oauth_connected", oauthState.requested_by, {
      account_id: oauthState.account_id,
      x_account_id: String(user.id),
      username: user.username,
    });
    return { connection, user };
  }

  async function refreshConnection(connection) {
    const refreshToken = decrypt(
      connection.refresh_token_ciphertext,
      config.graceTokenEncryptionKey,
    );
    if (!refreshToken) throw new GraceXError("This X connection has no refresh token.", "X_REFRESH_MISSING");
    const request = tokenRequest({
      clientId: config.graceXClientId,
      clientSecret: config.graceXClientSecret,
      values: { refresh_token: refreshToken, grant_type: "refresh_token" },
    });
    const response = await fetchImpl("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(20000),
    });
    const token = await json(response);
    if (!response.ok || !token.access_token) {
      await repository.markConnectionError(connection.account_id, token.error || "X token refresh failed.");
      throw new GraceXError(token.error_description || token.error || "X token refresh failed.", "X_REFRESH_FAILED");
    }
    const expiresAt = Number(token.expires_in) > 0
      ? new Date(now() + Number(token.expires_in) * 1000).toISOString()
      : null;
    await repository.saveConnection({
      accountId: connection.account_id,
      externalAccountId: connection.external_account_id,
      username: connection.username,
      accessTokenCiphertext: encrypt(token.access_token, config.graceTokenEncryptionKey),
      refreshTokenCiphertext: encrypt(token.refresh_token || refreshToken, config.graceTokenEncryptionKey),
      tokenType: token.token_type || connection.token_type,
      scope: token.scope || connection.scope,
      expiresAt,
    });
    return token.access_token;
  }

  async function accessToken(accountId) {
    assertConfigured();
    const connection = await repository.getConnection(accountId);
    if (!connection || connection.status !== "active") return null;
    const expiry = connection.expires_at ? Date.parse(connection.expires_at) : Number.POSITIVE_INFINITY;
    if (Number.isFinite(expiry) && expiry <= now() + 120000) return refreshConnection(connection);
    return decrypt(connection.access_token_ciphertext, config.graceTokenEncryptionKey);
  }

  async function publishText(accountId, text, linkUrl = "") {
    const caption = [String(text ?? "").trim(), String(linkUrl ?? "").trim()]
      .filter(Boolean)
      .join("\n\n");
    if (!caption || caption.length > 280) {
      throw new GraceXError("An X post must contain 1–280 characters.", "X_POST_LENGTH_INVALID");
    }
    const token = await accessToken(accountId);
    if (!token) throw new GraceXError("The approved X account is not connected.", "X_ACCOUNT_NOT_CONNECTED");
    const response = await fetchImpl("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: caption }),
      signal: AbortSignal.timeout(20000),
    });
    const payload = await json(response);
    if (!response.ok || !payload?.data?.id) {
      const transient = [408, 425, 429].includes(response.status) || response.status >= 500;
      throw new GraceXError(
        payload.detail || payload.title || `X publishing returned HTTP ${response.status}.`,
        "X_PUBLISH_FAILED",
        { status: response.status, permanent: !transient },
      );
    }
    return { externalPostId: String(payload.data.id) };
  }

  return {
    accessToken,
    beginConnection,
    completeConnection,
    publishText,
  };
}
