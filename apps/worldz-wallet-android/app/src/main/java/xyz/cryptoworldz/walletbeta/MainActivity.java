package xyz.cryptoworldz.walletbeta;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.widget.TextView;
import android.widget.LinearLayout;

public final class MainActivity extends Activity {
  private static final String HOME = "https://launchpad.cryptoworldz.xyz/worldz-app/";
  private WebView web;
  private boolean allowed(Uri uri) {
    return uri != null && "https".equalsIgnoreCase(uri.getScheme())
      && "launchpad.cryptoworldz.xyz".equalsIgnoreCase(uri.getHost())
      && (uri.getPort() == -1 || uri.getPort() == 443)
      && uri.getUserInfo() == null;
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    TextView banner = new TextView(this);
    banner.setText("WORLDZ WALLET • READ-ONLY BETA • NO TRANSFERS");
    banner.setPadding(18, 16, 18, 16);
    banner.setBackgroundColor(0xff5b21b6);
    banner.setTextColor(0xffffffff);
    root.addView(banner);
    web = new WebView(this);
    root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
    setContentView(root);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(false);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setJavaScriptCanOpenWindowsAutomatically(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (allowed(uri)) return false;
        if (request.isForMainFrame() && "https".equalsIgnoreCase(uri.getScheme())) {
          try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
        }
        return true;
      }
      @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) { handler.cancel(); }
    });
    web.loadUrl(HOME);
    new AlertDialog.Builder(this).setTitle("Worldz Wallet Beta")
      .setMessage("This is a read-only preview of WorldzApp. It does not create wallets, hold keys, sign transactions or transfer assets. Never enter a recovery phrase.")
      .setPositiveButton("Continue", (d,w) -> {}).show();
  }
  @Override public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
  }
  @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
