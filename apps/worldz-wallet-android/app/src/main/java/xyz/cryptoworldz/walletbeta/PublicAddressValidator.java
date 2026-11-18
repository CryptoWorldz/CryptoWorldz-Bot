package xyz.cryptoworldz.walletbeta;

import java.math.BigInteger;

/** Format checks only; does not prove ownership, account existence, or safe transferability. */
public final class PublicAddressValidator {
  private static final String BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  private PublicAddressValidator() {}

  private static int decodedBase58Length(String text) {
    BigInteger n = BigInteger.ZERO;
    for (int i = 0; i < text.length(); i++) {
      int digit = BASE58.indexOf(text.charAt(i));
      if (digit < 0) return -1;
      n = n.multiply(BigInteger.valueOf(58)).add(BigInteger.valueOf(digit));
    }
    int leadingZeroes = 0;
    while (leadingZeroes < text.length() && text.charAt(leadingZeroes) == '1') leadingZeroes++;
    return leadingZeroes + (n.signum() == 0 ? 0 : (n.bitLength() + 7) / 8);
  }

  public static boolean isValidFormat(int chain, String address) {
    if (chain < 0 || chain > 7 || address == null || address.isEmpty()
        || address.length() > 128 || !address.equals(address.trim())) return false;
    if (chain == 0) {
      return address.length() >= 32 && address.length() <= 44
          && decodedBase58Length(address) == 32;
    }
    if (chain == 1) {
      // XRPL classic addresses use a different Base58 alphabet; a full checksum
      // verification is required before using this address for any transfer.
      return address.matches("r[A-Za-z0-9]{24,34}");
    }
    if (chain == 5) return address.matches("0x[0-9a-fA-F]{64}");
    // Base, Ethereum, BNB Chain, HyperEVM and Robinhood use EVM-style addresses.
    return address.matches("0x[0-9a-fA-F]{40}")
        && !address.substring(2).matches("0{40}");
  }
}
