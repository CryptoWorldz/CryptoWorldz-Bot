import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Prevent accidentally enabling secret entry or payouts before security review. */
public final class WalletSecurityGateSmoke {
  private static void require(boolean value, String message) {
    if (!value) throw new AssertionError(message);
  }
  public static void main(String[] args) throws Exception {
    Path root = Path.of("apps/worldz-wallet-android");
    String ui = Files.readString(root.resolve("app/src/main/java/xyz/cryptoworldz/walletbeta/MainActivity.java"));
    String rewards = Files.readString(root.resolve("welcome-rewards.v1.json"));
    String vault = Files.readString(root.resolve("app/src/main/java/xyz/cryptoworldz/walletbeta/EncryptedWalletVault.java"));
    require(ui.contains("Private wallet security gate"), "Missing private-wallet lockout");
    require(ui.contains("NEVER enter a recovery phrase or private key"), "Missing secret-entry warning");
    require(!ui.contains("new EncryptedWalletVault("), "Secret vault must not be wired to beta UI");
    require(!ui.contains(".seal(") && !ui.contains(".unseal("), "Beta UI must not handle private keys");
    require(rewards.contains("\"claimsEnabled\": false"), "Claims must remain disabled");
    require(rewards.contains("\"payoutsEnabled\": false"), "Payouts must remain disabled");
    require(rewards.contains("\"totalTokens\": \"5000000\""), "Reward pool cap changed");
    require(rewards.contains("\"maximumParticipants\": 1000"), "Reward spots changed");
    require(vault.contains("AndroidKeyStore") && vault.contains("AES/GCM/NoPadding"), "Vault protection missing");
    System.out.println("Wallet private-key and reward release gates: PASS");
  }
}
