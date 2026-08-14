package fr.yamadori.scouting;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.core.content.IntentCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

import java.io.File;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends BridgeActivity {

    private static final String PENDING_IMPORT_NAME = "pending-import.yamadori.zip";
    private static final long MAX_IMPORT_BYTES = 500L * 1024L * 1024L;
    private static final long SPLASH_MAX_MS = 2000L;

    private final AtomicBoolean webContentReady = new AtomicBoolean(false);
    private long splashDeadlineElapsed;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YamadoriBackupPlugin.class);
        registerPlugin(SafeAreaInsetsPlugin.class);
        splashDeadlineElapsed = SystemClock.elapsedRealtime() + SPLASH_MAX_MS;
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        splash.setKeepOnScreenCondition(
                () -> !webContentReady.get() && SystemClock.elapsedRealtime() < splashDeadlineElapsed
        );
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        scheduleSplashRelease();
        handleIncomingIntent(getIntent());
    }

    private void scheduleSplashRelease() {
        if (bridge == null || bridge.getWebView() == null) {
            webContentReady.set(true);
            return;
        }
        pollWebReady(bridge.getWebView(), 0);
    }

    private void pollWebReady(WebView webView, int attempt) {
        if (webContentReady.get()) {
            return;
        }
        if (webView.getProgress() >= 100 || attempt >= 40) {
            // One more frame so AppBootSplash can paint before native splash exits.
            webView.post(() -> webContentReady.set(true));
            return;
        }
        webView.postDelayed(() -> pollWebReady(webView, attempt + 1), 50);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
        notifyPendingImportIfNeeded();
    }

    @Override
    public void onResume() {
        super.onResume();
        notifyPendingImportIfNeeded();
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        Uri uri = null;

        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            uri = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri.class);
        }

        if (uri == null) {
            return;
        }

        if (YamadoriBackupPlugin.hasPendingImport()) {
            return;
        }

        String displayName = YamadoriBackupPlugin.resolveDisplayName(
                getContentResolver(),
                uri,
                PENDING_IMPORT_NAME
        );

        if (!isAcceptableImportName(displayName) && !isAcceptableImportName(uri.getLastPathSegment())) {
            return;
        }

        File importsDir = new File(getCacheDir(), "imports");
        if (!importsDir.exists() && !importsDir.mkdirs()) {
            return;
        }

        File dest = new File(importsDir, PENDING_IMPORT_NAME);
        YamadoriBackupPlugin.CopyResult result =
                YamadoriBackupPlugin.copyUriToImportFile(this, uri, dest, MAX_IMPORT_BYTES);
        if (!result.success) {
            return;
        }

        YamadoriBackupPlugin.setPendingImport(
                dest.getAbsolutePath(),
                displayName,
                result.sizeBytes,
                result.sha256Prefix
        );
        intent.setAction(null);
        intent.setData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
    }

    private static boolean isAcceptableImportName(String name) {
        if (name == null || name.isEmpty()) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".yamadori.zip");
    }

    private void notifyPendingImportIfNeeded() {
        if (!YamadoriBackupPlugin.hasPendingImport() || bridge == null) {
            return;
        }

        PluginHandle handle = bridge.getPlugin("YamadoriBackup");
        if (handle == null || handle.getInstance() == null) {
            return;
        }

        if (handle.getInstance() instanceof YamadoriBackupPlugin plugin) {
            plugin.notifyPendingImport();
        }
    }
}
