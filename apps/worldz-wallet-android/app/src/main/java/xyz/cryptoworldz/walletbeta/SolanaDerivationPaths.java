package xyz.cryptoworldz.walletbeta;

/**
 * Explicit Solana BIP44 hardened derivation-path presets.
 * Metadata only: no mnemonic processing, key derivation or import enabled.
 */
public final class SolanaDerivationPaths {
  private SolanaDerivationPaths() {}
  public static final String[] LABELS = {
    "Solana account (m/44'/501'/0'/0')",
    "Solana account (m/44'/501'/0')",
    "Solana root (m/44'/501')"
  };
  public static final String[] TEMPLATES = {
    "m/44'/501'/{account}'/0'",
    "m/44'/501'/{account}'",
    "m/44'/501'"
  };
  public static String path(int preset, int account) {
    if (preset < 0 || preset >= TEMPLATES.length) throw new IllegalArgumentException("Unknown path preset");
    if (account < 0 || account > 1000) throw new IllegalArgumentException("Account index outside supported preview range");
    if (preset == 2 && account != 0) throw new IllegalArgumentException("Root path has no account index");
    return TEMPLATES[preset].replace("{account}", Integer.toString(account));
  }
}
