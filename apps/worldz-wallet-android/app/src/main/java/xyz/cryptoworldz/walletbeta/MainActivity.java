package xyz.cryptoworldz.walletbeta;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import android.widget.Toast;
import android.graphics.Color;
import android.content.SharedPreferences;

/**
 * WORLDZ Wallet: native public-address companion. No seed, private key, signing,
 * trading or wallet creation is implemented. Never collect recovery phrases.
 */
public final class MainActivity extends Activity {
  private static final String[] CHAINS = {
    "Solana", "XRP Ledger", "Base", "Ethereum", "BNB Chain", "Sui", "HyperEVM", "Robinhood"
  };
  private static final String LAUNCHPAD = "https://worldzlaunch.com/";
  private static final String DEXSCREENER = "https://dexscreener.com/";
  private LinearLayout content;
  private Spinner chainPicker;
  private EditText addressInput;
  private TextView saved;
  private SharedPreferences preferences;

  private void openExternal(String url) {
    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
  }
  private TextView label(String value, int size) {
    TextView view = new TextView(this);
    view.setText(value);
    view.setTextSize(size);
    view.setTextColor(Color.WHITE);
    view.setPadding(12, 12, 12, 12);
    return view;
  }
  private Button action(String title, View.OnClickListener listener) {
    Button b = new Button(this);
    b.setText(title);
    b.setAllCaps(false);
    b.setOnClickListener(listener);
    content.addView(b);
    return b;
  }
  private String key() { return "address_" + chainPicker.getSelectedItemPosition(); }
  private String current() { return preferences.getString(key(), ""); }
  private void showSaved() {
    String value = current();
    saved.setText(value.isEmpty() ? "No public address saved for this chain." : "Saved public address: " + value);
    addressInput.setText(value);
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    preferences = getSharedPreferences("worldz_public_addresses_v1", MODE_PRIVATE);
    ScrollView scroll = new ScrollView(this);
    scroll.setFillViewport(true);
    scroll.setBackgroundColor(Color.rgb(32, 13, 61));
    content = new LinearLayout(this);
    content.setOrientation(LinearLayout.VERTICAL);
    content.setPadding(22, 22, 22, 32);
    scroll.addView(content);
    setContentView(scroll);

    TextView heading = label("WORLDZ WALLET  💜", 26);
    heading.setGravity(Gravity.CENTER);
    content.addView(heading);
    content.addView(label("Public-address companion • Direct Android beta", 15));
    content.addView(label("Choose a blockchain and save an existing PUBLIC address. This app cannot create wallets, store private keys, sign or send transactions.", 14));
    chainPicker = new Spinner(this);
    ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, CHAINS);
    chainPicker.setAdapter(adapter);
    content.addView(chainPicker);
    addressInput = new EditText(this);
    addressInput.setSingleLine(true);
    addressInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
    addressInput.setTextColor(Color.WHITE);
    addressInput.setHintTextColor(0xffc4b5fd);
    addressInput.setHint("Paste your PUBLIC wallet address");
    content.addView(addressInput);
    saved = label("", 13);
    content.addView(saved);
    chainPicker.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
      @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) { showSaved(); }
      @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
    });
    action("Solana derivation paths • preview", v -> {
      android.widget.LinearLayout preview = new android.widget.LinearLayout(this);
      preview.setOrientation(android.widget.LinearLayout.VERTICAL);
      preview.setPadding(28, 16, 28, 16);
      android.widget.Spinner pathSelector = new android.widget.Spinner(this);
      pathSelector.setAdapter(new ArrayAdapter<>(this,
        android.R.layout.simple_spinner_dropdown_item, SolanaDerivationPaths.LABELS));
      preview.addView(pathSelector);
      EditText accountIndex = new EditText(this);
      accountIndex.setHint("Account index (0–1000)");
      accountIndex.setInputType(InputType.TYPE_CLASS_NUMBER);
      accountIndex.setText("0");
      preview.addView(accountIndex);
      new AlertDialog.Builder(this)
        .setTitle("Solana derivation path preview")
        .setMessage("Path selection only. This beta does not accept recovery phrases or derive keys.")
        .setView(preview)
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Show path", (dialog, which) -> {
          try {
            int account = Integer.parseInt(accountIndex.getText().toString());
            String path = SolanaDerivationPaths.path(pathSelector.getSelectedItemPosition(), account);
            new AlertDialog.Builder(this).setTitle("Selected Solana path")
              .setMessage(path + "\\n\\nNo keys have been derived or imported.")
              .setPositiveButton("OK", null).show();
          } catch (IllegalArgumentException ex) {
            new AlertDialog.Builder(this).setTitle("Invalid account index")
              .setMessage("Choose an account index from 0 to 1000. The root path supports index 0 only.")
              .setPositiveButton("OK", null).show();
          }
        }).show();
    });
    action("Wallet setup • create / import / watch-only", v -> {
      final String[] choices = {
        "Create new private wallet (coming soon)",
        "Import recovery phrase (coming soon)",
        "Import private key (coming soon)",
        "Add existing public address (watch-only)"
      };
      new AlertDialog.Builder(this).setTitle("Choose wallet setup")
        .setItems(choices, (dialog, selected) -> {
          if (selected == 3) {
            chainPicker.setSelection(0);
            addressInput.requestFocus();
            Toast.makeText(this, "Paste your PUBLIC address only", Toast.LENGTH_LONG).show();
          } else {
            new AlertDialog.Builder(this)
              .setTitle("Private wallet security gate")
              .setMessage("This option is not enabled. We must finish audited Solana key derivation, secure backup/recovery, device authentication and signing tests first. NEVER enter a recovery phrase or private key in this beta.")
              .setPositiveButton("OK", null).show();
          }
        }).show();
    });
    action("Save public address", v -> {
      String address = addressInput.getText().toString().trim();
      if (!PublicAddressValidator.isValidFormat(chainPicker.getSelectedItemPosition(), address)) {
        new AlertDialog.Builder(this).setTitle("Invalid address format")
          .setMessage("Check the public address and selected blockchain. Format checks do not prove ownership or transfer safety. Never paste a seed phrase or private key.")
          .setPositiveButton("OK", null).show();
        return;
      }
      preferences.edit().putString(key(), address).apply();
      showSaved();
      Toast.makeText(this, "Public address saved on this device", Toast.LENGTH_SHORT).show();
    });
    action("Copy saved address", v -> {
      if (current().isEmpty()) { Toast.makeText(this, "Save an address first", Toast.LENGTH_SHORT).show(); return; }
      ((ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE))
        .setPrimaryClip(ClipData.newPlainText("WORLDZ public address", current()));
      Toast.makeText(this, "Public address copied", Toast.LENGTH_SHORT).show();
    });
    action("Share saved address", v -> {
      if (current().isEmpty()) { Toast.makeText(this, "Save an address first", Toast.LENGTH_SHORT).show(); return; }
      Intent intent = new Intent(Intent.ACTION_SEND);
      intent.setType("text/plain");
      intent.putExtra(Intent.EXTRA_TEXT, CHAINS[chainPicker.getSelectedItemPosition()] + " public address: " + current());
      startActivity(Intent.createChooser(intent, "Share public address"));
    });
    action("Remove saved address", v -> {
      new AlertDialog.Builder(this).setTitle("Remove public address?")
        .setMessage("This removes only the locally saved public address. No blockchain funds are affected.")
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Remove", (dialog, which) -> { preferences.edit().remove(key()).apply(); showSaved(); })
        .show();
    });
    content.addView(label("🎁 WORLDZ WALLET WELCOME REWARDS", 19));
    content.addView(label("Planned: 5,000 $WORLDZ for each of 1,000 eligible new participants, from a capped 5,000,000-token pool. Coming soon — claims and payouts are disabled until the verified token launch, funding and anti-abuse checks.", 14));
    action("WorldzLaunchPad • Beginner / Intermediate / Advanced", v -> openExternal(LAUNCHPAD));
    action("DexScreener • View charts", v -> openExternal(DEXSCREENER));
    content.addView(label("Security: public addresses only. No seed phrase, secret key, wallet recovery, transfers, swaps or token minting in this beta. Always verify external websites.", 13));
  }
}
