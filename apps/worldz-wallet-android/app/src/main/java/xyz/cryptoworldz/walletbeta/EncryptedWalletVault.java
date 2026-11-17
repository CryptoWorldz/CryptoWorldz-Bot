package xyz.cryptoworldz.walletbeta;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.util.Base64;
import java.util.Arrays;

/**
 * Internal encrypted-storage building block; not wired to wallet creation.
 * Not a recovery system. Keystore keys may be lost on uninstall/device reset.
 * Never store secrets until recovery, authentication and security review pass.
 */
final class EncryptedWalletVault {
  private static final String KEY_ALIAS = "worldz_wallet_vault_v1";
  private static final String PREFS = "worldz_wallet_vault_ciphertext_v1";
  private static final String KEYSTORE = "AndroidKeyStore";
  private static final int IV_LENGTH = 12;
  private final Context context;

  EncryptedWalletVault(Context context) { this.context = context.getApplicationContext(); }

  private SecretKey key() throws Exception {
    KeyStore store = KeyStore.getInstance(KEYSTORE);
    store.load(null);
    java.security.Key existing = store.getKey(KEY_ALIAS, null);
    if (existing != null) return (SecretKey) existing;
    KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
    generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build());
    return generator.generateKey();
  }

  /** Stores opaque bytes; callers must securely manage and erase input buffers. */
  synchronized void seal(String recordId, byte[] secret) throws Exception {
    if (!"solana_primary".equals(recordId) || secret == null || secret.length == 0)
      throw new IllegalArgumentException("Invalid vault record");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    byte[] iv = cipher.getIV();
    if (iv.length != IV_LENGTH) throw new IllegalStateException("Unexpected GCM IV");
    byte[] ciphertext = cipher.doFinal(secret);
    byte[] envelope = new byte[iv.length + ciphertext.length];
    System.arraycopy(iv, 0, envelope, 0, iv.length);
    System.arraycopy(ciphertext, 0, envelope, iv.length, ciphertext.length);
    boolean ok = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(recordId, Base64.encodeToString(envelope, Base64.NO_WRAP)).commit();
    Arrays.fill(ciphertext, (byte) 0);
    Arrays.fill(envelope, (byte) 0);
    if (!ok) throw new IllegalStateException("Vault write failed");
  }

  /** Returns secret bytes; caller must zeroize returned array immediately after use. */
  synchronized byte[] unseal(String recordId) throws Exception {
    if (!"solana_primary".equals(recordId)) throw new IllegalArgumentException("Invalid record");
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String stored = prefs.getString(recordId, null);
    if (stored == null) return null;
    byte[] envelope = Base64.decode(stored, Base64.NO_WRAP);
    if (envelope.length <= IV_LENGTH + 16) throw new SecurityException("Invalid vault envelope");
    byte[] iv = Arrays.copyOfRange(envelope, 0, IV_LENGTH);
    byte[] ciphertext = Arrays.copyOfRange(envelope, IV_LENGTH, envelope.length);
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
      return cipher.doFinal(ciphertext);
    } finally {
      Arrays.fill(envelope, (byte) 0);
      Arrays.fill(iv, (byte) 0);
      Arrays.fill(ciphertext, (byte) 0);
    }
  }

  synchronized void clear(String recordId) {
    if (!"solana_primary".equals(recordId)) throw new IllegalArgumentException("Invalid record");
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(recordId).commit();
  }
}
