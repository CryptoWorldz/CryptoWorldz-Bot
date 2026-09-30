const test = require("node:test");
const assert = require("node:assert/strict");
const { decryptSecret, encryptSecret, privateIp, sha256 } = require("../src/community-api");

test("webhook signing secrets encrypt and decrypt with authenticated encryption", () => {
  const encrypted = encryptSecret("wzhk_secret", "master-key-for-test");
  assert.notEqual(encrypted, "wzhk_secret");
  assert.equal(decryptSecret(encrypted, "master-key-for-test"), "wzhk_secret");
});

test("API keys can be stored as irreversible hashes", () => {
  assert.equal(sha256("key").length, 64);
  assert.notEqual(sha256("key"), "key");
});

test("webhook private-address guard blocks common local ranges", () => {
  for (const ip of ["127.0.0.1","10.1.2.3","192.168.1.1","172.16.0.1","169.254.169.254","::1","fd00::1"]) {
    assert.equal(privateIp(ip), true, ip);
  }
  assert.equal(privateIp("8.8.8.8"), false);
});
