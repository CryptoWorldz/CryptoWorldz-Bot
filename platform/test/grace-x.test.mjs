import assert from "node:assert/strict";
import test from "node:test";
import { EXACT_GRACE_X_REDIRECT_URI, loadConfig } from "../src/config.mjs";
import { createGraceX, X_OAUTH_SCOPES } from "../src/grace-x.mjs";
import { decrypt, encrypt, hashState } from "../src/secrets.mjs";

const encryptionKey = "test-only-encryption-key-that-is-at-least-32-chars";

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fixture({ username = "CryptoWorldzX" } = {}) {
  const records = { states: [], audits: [], errors: [], connections: [] };
  const repository = {
    getXAccount: async (id) => ({ id, handle: "@CryptoWorldzX", platform: "x" }),
    createOAuthState: async (state) => records.states.push(state),
    consumeOAuthState: async (stateHash) => {
      const found = records.states.find((state) => state.stateHash === stateHash && !state.used);
      if (!found) return null;
      found.used = true;
      return {
        account_id: found.accountId,
        verifier_ciphertext: found.verifierCiphertext,
        expected_handle: found.expectedHandle,
        requested_by: found.requestedBy,
      };
    },
    saveConnection: async (connection) => {
      records.connections.push(connection);
      return { id: 9, account_id: connection.accountId, status: "active" };
    },
    getConnection: async () => null,
    markConnectionError: async (...values) => records.errors.push(values),
    recordAudit: async (...values) => records.audits.push(values),
  };
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/oauth2/token")) {
      return response({
        access_token: "access-token-from-x",
        refresh_token: "refresh-token-from-x",
        token_type: "bearer",
        expires_in: 7200,
        scope: X_OAUTH_SCOPES.join(" "),
      });
    }
    if (String(url).includes("/users/me")) {
      return response({ data: { id: "777", name: "CryptoWorldz", username } });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const config = loadConfig({
    GRACE_X_CLIENT_ID: "oauth2-client-id",
    GRACE_X_CLIENT_SECRET: "oauth2-client-secret",
    GRACE_TOKEN_ENCRYPTION_KEY: encryptionKey,
  });
  const graceX = createGraceX({
    config,
    repository,
    fetchImpl,
    now: () => Date.parse("2026-08-09T00:00:00.000Z"),
  });
  return { calls, config, graceX, records, repository };
}

test("Grace creates a 10-minute, one-use PKCE URL with exact scopes and callback", async () => {
  const { graceX, records } = fixture();
  const connection = await graceX.beginConnection(1, "123");
  const url = new URL(connection.authorizationUrl);
  assert.equal(url.origin + url.pathname, "https://x.com/i/oauth2/authorize");
  assert.equal(url.searchParams.get("redirect_uri"), EXACT_GRACE_X_REDIRECT_URI);
  assert.deepEqual(url.searchParams.get("scope").split(" "), X_OAUTH_SCOPES);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(records.states.length, 1);
  assert.equal(records.states[0].expiresAt, "2026-08-09T00:10:00.000Z");
  assert.equal(records.states[0].stateHash, hashState(url.searchParams.get("state")));
  assert.notEqual(records.states[0].verifierCiphertext, url.searchParams.get("code_challenge"));
});

test("Grace exchanges one valid callback, verifies the exact handle and encrypts tokens", async () => {
  const { calls, graceX, records } = fixture();
  const started = await graceX.beginConnection(1, "123");
  const state = new URL(started.authorizationUrl).searchParams.get("state");
  const result = await graceX.completeConnection({ state, code: "one-time-code" });
  assert.equal(result.user.username, "CryptoWorldzX");
  assert.equal(records.connections.length, 1);
  const saved = records.connections[0];
  assert.equal(decrypt(saved.accessTokenCiphertext, encryptionKey), "access-token-from-x");
  assert.equal(decrypt(saved.refreshTokenCiphertext, encryptionKey), "refresh-token-from-x");
  assert.notEqual(saved.accessTokenCiphertext, "access-token-from-x");
  const tokenCall = calls.find((call) => call.url.endsWith("/oauth2/token"));
  assert.equal(tokenCall.options.body.get("redirect_uri"), EXACT_GRACE_X_REDIRECT_URI);
  assert.match(tokenCall.options.headers.Authorization, /^Basic /);
  await assert.rejects(
    graceX.completeConnection({ state, code: "reused-code" }),
    (error) => error.code === "X_OAUTH_STATE_INVALID",
  );
});

test("Grace rejects an X login for the wrong handle", async () => {
  const { graceX, records } = fixture({ username: "SomeoneElse" });
  const started = await graceX.beginConnection(1, "123");
  const state = new URL(started.authorizationUrl).searchParams.get("state");
  await assert.rejects(
    graceX.completeConnection({ state, code: "code" }),
    (error) => error.code === "X_ACCOUNT_MISMATCH" && /Expected @cryptoworldzx/i.test(error.message),
  );
  assert.equal(records.connections.length, 0);
  assert.equal(records.errors.length, 1);
});

test("Grace publishes only through X API v2 using the encrypted approved connection", async () => {
  const calls = [];
  const config = loadConfig({
    GRACE_X_CLIENT_ID: "client",
    GRACE_X_CLIENT_SECRET: "secret",
    GRACE_TOKEN_ENCRYPTION_KEY: encryptionKey,
  });
  const repository = {
    getConnection: async () => ({
      account_id: 1,
      status: "active",
      expires_at: "2099-01-01T00:00:00.000Z",
      access_token_ciphertext: encrypt("approved-access-token", encryptionKey),
    }),
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return response({ data: { id: "post-999" } });
  };
  const graceX = createGraceX({ config, repository, fetchImpl });
  const result = await graceX.publishText(1, "OneWorldz 🌏 One Vision");
  assert.deepEqual(result, { externalPostId: "post-999" });
  assert.equal(calls[0].url, "https://api.x.com/2/tweets");
  assert.equal(calls[0].options.headers.Authorization, "Bearer approved-access-token");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    text: "OneWorldz 🌏 One Vision",
  });
});

test("Grace treats X rate limits as retryable and other client rejection as permanent", async () => {
  for (const [status, permanent] of [
    [429, false],
    [500, false],
    [403, true],
  ]) {
    const config = loadConfig({
      GRACE_X_CLIENT_ID: "client",
      GRACE_X_CLIENT_SECRET: "secret",
      GRACE_TOKEN_ENCRYPTION_KEY: encryptionKey,
    });
    const repository = {
      getConnection: async () => ({
        account_id: 1,
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
        access_token_ciphertext: encrypt("token", encryptionKey),
      }),
    };
    const graceX = createGraceX({
      config,
      repository,
      fetchImpl: async () => response({ title: "rejected" }, status),
    });
    await assert.rejects(
      graceX.publishText(1, "test"),
      (error) => error.code === "X_PUBLISH_FAILED" && error.permanent === permanent,
    );
  }
});
