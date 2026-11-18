import java.util.Arrays;
import xyz.cryptoworldz.walletbeta.Bip39SeedDerivation;

/** BIP-39 published vector #1: all-zero entropy, passphrase TREZOR. */
public final class Bip39SeedDerivationSmoke {
  private static final String EXPECTED =
      "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e5349553" +
      "1f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04";
  public static void main(String[] args) throws Exception {
    char[] words = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".toCharArray();
    char[] passphrase = "TREZOR".toCharArray();
    byte[] seed = Bip39SeedDerivation.deriveSeed(words, passphrase);
    try {
      StringBuilder hex = new StringBuilder();
      for (byte b : seed) hex.append(String.format("%02x", b & 255));
      if (!EXPECTED.equals(hex.toString())) throw new AssertionError("BIP39 published seed vector mismatch");
      if (seed.length != 64) throw new AssertionError("BIP39 seed must be 64 bytes");
      System.out.println("BIP39 seed derivation published test vector: PASS");
    } finally {
      Arrays.fill(words, '\0');
      Arrays.fill(passphrase, '\0');
      Arrays.fill(seed, (byte) 0);
    }
  }
}
