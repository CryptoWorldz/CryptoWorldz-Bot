package xyz.cryptoworldz.walletbeta;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Arrays;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * BIP-39 PBKDF2-HMAC-SHA512 seed derivation foundation.
 * Not mnemonic generation, checksum validation, SLIP-0010 Ed25519 derivation,
 * wallet recovery, or a permission to accept real recovery phrases in the beta.
 */
public final class Bip39SeedDerivation {
  private Bip39SeedDerivation() {}

  public static byte[] deriveSeed(char[] mnemonic, char[] passphrase) throws Exception {
    if (mnemonic == null || mnemonic.length == 0 || passphrase == null)
      throw new IllegalArgumentException("Mnemonic and passphrase required");
    char[] normalizedMnemonic = Normalizer.normalize(
        new String(mnemonic), Normalizer.Form.NFKD).toCharArray();
    char[] normalizedPassphrase = Normalizer.normalize(
        new String(passphrase), Normalizer.Form.NFKD).toCharArray();
    char[] salt = new char[8 + normalizedPassphrase.length];
    "mnemonic".getChars(0, 8, salt, 0);
    System.arraycopy(normalizedPassphrase, 0, salt, 8, normalizedPassphrase.length);
    PBEKeySpec spec = new PBEKeySpec(normalizedMnemonic, salt, 2048, 512);
    try {
      return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512")
          .generateSecret(spec).getEncoded();
    } finally {
      spec.clearPassword();
      Arrays.fill(normalizedMnemonic, '\0');
      Arrays.fill(normalizedPassphrase, '\0');
      Arrays.fill(salt, '\0');
    }
  }
}
