import xyz.cryptoworldz.walletbeta.PublicAddressValidator;

public final class AddressValidationSmoke {
  private static void check(boolean expected, int chain, String address) {
    boolean actual = PublicAddressValidator.isValidFormat(chain, address);
    if (actual != expected) throw new AssertionError("chain=" + chain + " input=" + address);
  }
  public static void main(String[] args) {
    check(true, 0, "11111111111111111111111111111111");
    check(false, 0, "1111111111111111111111111111111");
    check(false, 0, "O1111111111111111111111111111111");
    check(true, 2, "0x1234567890123456789012345678901234567890");
    check(true, 3, "0x1234567890123456789012345678901234567890");
    check(true, 4, "0x1234567890123456789012345678901234567890");
    check(true, 6, "0x1234567890123456789012345678901234567890");
    check(true, 7, "0x1234567890123456789012345678901234567890");
    check(false, 2, "0x0000000000000000000000000000000000000000");
    check(false, 3, "0x123456789012345678901234567890123456789");
    check(true, 5, "0x" + "a".repeat(64));
    check(false, 5, "0x" + "a".repeat(40));
    check(false, 1, "rBAD address");
    check(false, 0, "seed phrase words should never be accepted");
    check(false, 2, null);
    check(false, 8, "0x1234567890123456789012345678901234567890");
    System.out.println("Worldz public address format tests: PASS");
  }
}
