package fr.yamadori.scouting;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "YamadoriBackup")
public class YamadoriBackupPlugin extends Plugin {

    private static JSObject pendingImport = null;

    public static boolean hasPendingImport() {
        return pendingImport != null;
    }

    public static void setPendingImport(String cachePath, String displayName) {
        pendingImport = new JSObject();
        pendingImport.put("cachePath", cachePath);
        pendingImport.put("displayName", displayName);
    }

    public static JSObject takePendingImport() {
        JSObject copy = pendingImport;
        pendingImport = null;
        return copy;
    }

    public void notifyPendingImport() {
        if (pendingImport != null) {
            notifyListeners("backupImportReady", pendingImport);
        }
    }

    @PluginMethod
    public void consumePendingImport(PluginCall call) {
        JSObject result = takePendingImport();
        if (result != null) {
            call.resolve(result);
        } else {
            call.resolve(new JSObject());
        }
    }

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/zip");

        if (data == null || fileName == null) {
            call.reject("data et fileName requis.");
            return;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(bytes, fileName, mimeType, call);
            } else {
                saveLegacyDownloads(bytes, fileName, call);
            }
        } catch (Exception e) {
            call.reject("Enregistrement impossible : " + e.getMessage());
        }
    }

    private void saveWithMediaStore(byte[] bytes, String fileName, String mimeType, PluginCall call)
            throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        Uri uri = resolver.insert(collection, values);
        if (uri == null) {
            call.reject("Impossible d'écrire dans Téléchargements.");
            return;
        }

        try (OutputStream os = resolver.openOutputStream(uri)) {
            if (os == null) {
                call.reject("Impossible d'ouvrir le fichier de destination.");
                return;
            }
            os.write(bytes);
        }

        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(uri, values, null, null);

        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("fileName", fileName);
        call.resolve(ret);
    }

    private void saveLegacyDownloads(byte[] bytes, String fileName, PluginCall call) throws Exception {
        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            call.reject("Impossible d'accéder au dossier Téléchargements.");
            return;
        }

        File dest = new File(downloadsDir, fileName);
        try (FileOutputStream os = new FileOutputStream(dest)) {
            os.write(bytes);
        }

        JSObject ret = new JSObject();
        ret.put("uri", Uri.fromFile(dest).toString());
        ret.put("fileName", fileName);
        call.resolve(ret);
    }

    public static String resolveDisplayName(ContentResolver resolver, Uri uri, String fallback) {
        if (resolver == null || uri == null) {
            return fallback;
        }

        try (android.database.Cursor cursor = resolver.query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.isEmpty()) {
                        return name;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fall back to URI path segment.
        }

        String path = uri.getLastPathSegment();
        return path != null && !path.isEmpty() ? path : fallback;
    }
}
