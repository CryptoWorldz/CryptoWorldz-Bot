import xyz.cryptoworldz.walletbeta.SolanaDerivationPaths;
public final class SolanaDerivationPathsSmoke {
  private static void eq(String expected, String actual) {
    if (!expected.equals(actual)) throw new AssertionError(expected + " != " + actual);
  }
  private static void invalid(int preset, int index) {
    try { SolanaDerivationPaths.path(preset, index); throw new AssertionError("Expected rejection"); }
    catch (IllegalArgumentException expected) {}
  }
  public static void main(String[] args) {
    eq("m/44'/501'/0'/0'", SolanaDerivationPaths.path(0, 0));
    eq("m/44'/501'/7'/0'", SolanaDerivationPaths.path(0, 7));
    eq("m/44'/501'/1'", SolanaDerivationPaths.path(1, 1));
    eq("m/44'/501'", SolanaDerivationPaths.path(2, 0));
    invalid(-1, 0); invalid(3, 0); invalid(0, -1); invalid(1, 1001); invalid(2, 1);
    System.out.println("Solana derivation path preview tests: PASS");
  }
}
