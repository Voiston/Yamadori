package fr.yamadori.scouting;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private static final String PENDING_IMPORT_NAME = "pending-import.yamadori.zip";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YamadoriBackupPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        handleIncomingIntent(getIntent());
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            } else {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
        }

        if (uri == null) {
            return;
        }

        File importsDir = new File(getCacheDir(), "imports");
        if (!importsDir.exists() && !importsDir.mkdirs()) {
            return;
        }

        File dest = new File(importsDir, PENDING_IMPORT_NAME);
        if (!copyUriToFile(uri, dest)) {
            return;
        }

        String displayName = YamadoriBackupPlugin.resolveDisplayName(
                getContentResolver(),
                uri,
                PENDING_IMPORT_NAME
        );
        YamadoriBackupPlugin.setPendingImport(dest.getAbsolutePath(), displayName);
        intent.setAction(null);
        intent.setData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
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

    private boolean copyUriToFile(Uri uri, File dest) {
        try (InputStream in = getContentResolver().openInputStream(uri);
                FileOutputStream out = new FileOutputStream(dest, false)) {
            if (in == null) {
                return false;
            }

            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
