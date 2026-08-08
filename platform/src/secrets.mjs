import crypto from "node:crypto";

export class SecretError extends Error {
  constructor(message, code = "SECRET_ERROR") {
    super(message);
    this.name = "SecretError";
    this.code = code;
  }
}

export function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

export function hashState(state) {
  return base64url(sha256(state));
}

export function pkceChallenge(verifier) {
  return base64url(sha256(verifier));
}

function encryptionKey(secret) {
  const normalized = String(secret ?? "").trim();
  if (normalized.length < 32) {
    throw new SecretError(
      "GRACE_TOKEN_ENCRYPTION_KEY must be at least 32 characters.",
      "ENCRYPTION_KEY_INVALID",
    );
  }
  return sha256(normalized);
}

export function encrypt(value, secret) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return ["v1", base64url(iv), base64url(cipher.getAuthTag()), base64url(ciphertext)].join(".");
}

export function decrypt(value, secret) {
  if (!value) return null;
  const [version, iv, tag, ciphertext] = String(value).split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new SecretError("Stored secret format is invalid.", "SECRET_FORMAT_INVALID");
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(secret),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new SecretError("Stored secret could not be decrypted.", "SECRET_DECRYPT_FAILED");
  }
}

export function randomState(bytes = 32) {
  return base64url(crypto.randomBytes(bytes));
}
