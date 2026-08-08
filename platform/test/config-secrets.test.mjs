import assert from "node:assert/strict";
import test from "node:test";
import {
  EXACT_GRACE_X_REDIRECT_URI,
  loadConfig,
  runtimeReadiness,
} from "../src/config.mjs";
import { decrypt, encrypt, hashState, pkceChallenge } from "../src/secrets.mjs";

const encryptionKey = "test-only-encryption-key-that-is-at-least-32-chars";

test("configuration locks Grace to the one exact X callback", () => {
  assert.equal(loadConfig({}).graceXRedirectUri, EXACT_GRACE_X_REDIRECT_URI);
  assert.throws(
    () => loadConfig({ GRACE_X_REDIRECT_URI: "https://cryptobotz.cryptoworldz.xyz/grace/" }),
    /must exactly equal/,
  );
  assert.throws(
    () => loadConfig({ GRACE_X_REDIRECT_URI: `${EXACT_GRACE_X_REDIRECT_URI}/` }),
    /must exactly equal/,
  );
});

test("public readiness reports booleans without exposing configured secrets", () => {
  const config = loadConfig({
    GRACE_X_CLIENT_ID: "client-id-sensitive",
    GRACE_X_CLIENT_SECRET: "client-secret-sensitive",
    GRACE_TOKEN_ENCRYPTION_KEY: encryptionKey,
    TELEGRAM_BOT_TOKEN: "telegram-token-sensitive",
    TELEGRAM_WEBHOOK_SECRET: "telegram-webhook-sensitive",
    OWNER_TELEGRAM_ID: "123",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-sensitive",
  });
  const serialized = JSON.stringify(runtimeReadiness(config));
  assert.match(serialized, /"x_oauth_configured":true/);
  assert.match(serialized, /"telegram_configured":true/);
  assert.doesNotMatch(serialized, /sensitive/);
});

test("AES-GCM token encryption round-trips and detects tampering", () => {
  const ciphertext = encrypt("top-secret-token", encryptionKey);
  assert.notEqual(ciphertext, "top-secret-token");
  assert.equal(decrypt(ciphertext, encryptionKey), "top-secret-token");
  const parts = ciphertext.split(".");
  const altered = Buffer.from(parts[3], "base64url");
  altered[0] ^= 0xff;
  parts[3] = altered.toString("base64url");
  const tampered = parts.join(".");
  assert.throws(() => decrypt(tampered, encryptionKey), /could not be decrypted/);
});

test("OAuth state hashing and PKCE produce stable URL-safe values", () => {
  assert.equal(hashState("same"), hashState("same"));
  assert.notEqual(hashState("same"), hashState("different"));
  assert.match(pkceChallenge("verifier"), /^[A-Za-z0-9_-]{43}$/);
});
