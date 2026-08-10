const test = require("node:test");
const assert = require("node:assert/strict");
const { decryptSecret, encryptSecret } = require("../src/grace/oauth");
const {
  FACEBOOK_SCOPES,
  buildFacebookAuthorizationUrl,
  createFacebookOAuthService,
  normalizeName
} = require("../src/grace/facebook-oauth");

const secret = "test-only-encryption-key-that-is-long-enough-123";

test("Facebook authorization URL requests only Page management scopes", () => {
  const value = buildFacebookAuthorizationUrl({
    appId: "123456",
    redirectUri: "https://cryptobotz.cryptoworldz.xyz/grace/oauth/facebook/callback",
    state: "state",
    graphVersion: "v24.0"
  });
  const url = new URL(value);
  assert.equal(url.origin, "https://www.facebook.com");
  assert.equal(url.pathname, "/v24.0/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), "123456");
  assert.equal(url.searchParams.get("redirect_uri"), "https://cryptobotz.cryptoworldz.xyz/grace/oauth/facebook/callback");
  assert.deepEqual(url.searchParams.get("scope").split(","), [...FACEBOOK_SCOPES]);
});

test("Facebook Page matching ignores punctuation and case", () => {
  assert.equal(normalizeName("CryptoWorldz Facebook Page"), "cryptoworldzfacebookpage");
  assert.equal(normalizeName("Crypto Worldz"), "cryptoworldz");
});

test("Facebook OAuth completion stores the exact CryptoWorldz Page token", async () => {
  const saved = [];
  const repository = {
    consumeOAuthState: async () => ({
      account_id: 11,
      requested_by: 8029135300,
      verifier_ciphertext: encryptSecret("nonce", secret)
    }),
    getFacebookAccount: async () => ({
      id: 11,
      account_key: "cryptoworldz_fb",
      display_name: "CryptoWorldz Facebook Page",
      handle: "CryptoWorldz",
      external_account_id: null
    }),
    markConnectionError: async () => { throw new Error("should not mark error"); },
    recordAudit: async () => {},
    saveConnection: async (value) => {
      saved.push(value);
      return { id: 5, account_id: 11, status: "active" };
    }
  };
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) return { ok: true, status: 200, json: async () => ({ access_token: "short-user-token" }) };
    if (call === 2) return { ok: true, status: 200, json: async () => ({ access_token: "long-user-token" }) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: "999", name: "Other Page", access_token: "other-token", tasks: ["PROFILE_PLUS_CREATE_CONTENT"] },
          { id: "123", name: "CryptoWorldz", access_token: "page-token", tasks: ["PROFILE_PLUS_CREATE_CONTENT"] }
        ]
      })
    };
  };
  const service = createFacebookOAuthService({
    repository,
    fetchImpl,
    appId: "app-id",
    appSecret: "app-secret",
    redirectUri: "https://cryptobotz.cryptoworldz.xyz/grace/oauth/facebook/callback",
    encryptionSecret: secret,
    graphVersion: "v24.0"
  });
  const result = await service.completeConnection({ state: "state", code: "code" });
  assert.equal(result.page.id, "123");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].externalAccountId, "123");
  assert.equal(decryptSecret(saved[0].accessTokenCiphertext, secret), "page-token");
});
