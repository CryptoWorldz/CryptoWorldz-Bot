const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorizeUrl,
  createXOAuthService,
  decryptSecret,
  encryptSecret,
  normalizeHandle,
  pkceChallenge,
  stateHash,
  tokenRequest
} = require("../src/grace/oauth");

const secret = "test-only-encryption-key-that-is-long-enough-123";

test("OAuth secrets round trip with authenticated encryption", () => {
  const encrypted = encryptSecret("private-token", secret);
  assert.notEqual(encrypted, "private-token");
  assert.equal(decryptSecret(encrypted, secret), "private-token");
  assert.throws(() => decryptSecret(encrypted, `${secret}-wrong`));
});

test("PKCE challenge and state hashes are deterministic URL-safe values", () => {
  assert.equal(pkceChallenge("verifier"), pkceChallenge("verifier"));
  assert.equal(stateHash("state"), stateHash("state"));
  assert.match(pkceChallenge("verifier"), /^[A-Za-z0-9_-]+$/);
});

test("X authorization URL requests only required posting scopes", () => {
  const value = buildAuthorizeUrl({
    clientId: "client",
    redirectUri: "https://example.com/grace/oauth/x/callback",
    state: "state",
    codeChallenge: "challenge"
  });
  const url = new URL(value);
  assert.equal(url.origin, "https://x.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), "tweet.read tweet.write users.read offline.access");
});

test("public X clients send the Client ID in the token body", () => {
  const request = tokenRequest({ clientId: "public-id", clientSecret: "", params: { grant_type: "refresh_token" } });
  assert.equal(request.body.get("client_id"), "public-id");
  assert.equal(request.headers.Authorization, undefined);
});

test("confidential X clients authenticate with HTTP Basic", () => {
  const request = tokenRequest({ clientId: "client-id", clientSecret: "client-secret", params: { grant_type: "refresh_token" } });
  assert.equal(request.body.get("client_id"), null);
  assert.equal(request.headers.Authorization, `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
});

test("handle normalization is exact and case-insensitive", () => {
  assert.equal(normalizeHandle("@CryptoWorldzX"), "cryptoworldzx");
  assert.equal(normalizeHandle("cryptoworldzx"), "cryptoworldzx");
});

test("OAuth completion rejects a different authorized X account", async () => {
  const events = [];
  const repository = {
    consumeOAuthState: async () => ({
      account_id: 1,
      expected_handle: "cryptoworldzx",
      requested_by: 99,
      verifier_ciphertext: encryptSecret("verifier", secret)
    }),
    markConnectionError: async (...args) => events.push(["error", ...args]),
    recordAudit: async (...args) => events.push(["audit", ...args]),
    saveConnection: async () => { throw new Error("should not save"); }
  };
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: true, status: 200, json: async () => ({ access_token: "token", refresh_token: "refresh", expires_in: 7200 }) };
    }
    return { ok: true, status: 200, json: async () => ({ data: { id: "22", username: "SomeOtherAccount" } }) };
  };
  const service = createXOAuthService({
    repository,
    fetchImpl,
    clientId: "client",
    redirectUri: "https://example.com/grace/oauth/x/callback",
    encryptionSecret: secret
  });
  await assert.rejects(
    () => service.completeConnection({ state: "state", code: "code" }),
    (error) => error.code === "X_ACCOUNT_MISMATCH"
  );
  assert.equal(events[0][0], "error");
});
