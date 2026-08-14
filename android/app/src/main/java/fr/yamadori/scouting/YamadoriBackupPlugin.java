package fr.yamadori.scouting;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ApplicationInfo;
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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "YamadoriBackup")
public class YamadoriBackupPlugin extends Plugin {

    private static final long MAX_FILE_BYTES = 500L * 1024L * 1024L;
    private static final Object PENDING_IMPORT_LOCK = new Object();
    private static JSObject pendingImport = null;
    private static boolean pendingImportNotified = false;

    public static boolean hasPendingImport() {
        synchronized (PENDING_IMPORT_LOCK) {
            return pendingImport != null;
        }
    }

    public static void setPendingImport(
            String cachePath,
            String displayName,
            long fileSizeBytes,
            String sha256Prefix
    ) {
        synchronized (PENDING_IMPORT_LOCK) {
            pendingImport = new JSObject();
            pendingImport.put("cachePath", cachePath);
            pendingImport.put("displayName", displayName);
            pendingImport.put("fileSizeBytes", fileSizeBytes);
            pendingImport.put("sha256Prefix", sha256Prefix);
            pendingImportNotified = false;
        }
    }

    public static JSObject takePendingImport() {
        synchronized (PENDING_IMPORT_LOCK) {
            JSObject copy = pendingImport;
            pendingImport = null;
            pendingImportNotified = false;
            return copy;
        }
    }

    public static void clearPendingImportState() {
        synchronized (PENDING_IMPORT_LOCK) {
            pendingImport = null;
            pendingImportNotified = false;
        }
    }

    public void notifyPendingImport() {
        synchronized (PENDING_IMPORT_LOCK) {
            if (pendingImport == null || pendingImportNotified) {
                return;
            }
            pendingImportNotified = true;
            notifyListeners("backupImportReady", pendingImport);
        }
    }

    @PluginMethod
    public void getAppBuildInfo(PluginCall call) {
        boolean debug =
                (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        JSObject ret = new JSObject();
        ret.put("debug", debug);
        ret.put("applicationId", getContext().getPackageName());
        call.resolve(ret);
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
    public void readPendingImportFile(PluginCall call) {
        String cachePath = call.getString("cachePath");
        if (cachePath == null || cachePath.isEmpty()) {
            call.reject("cachePath requis.");
            return;
        }

        File file = new File(cachePath);
        if (!isAllowedImportFile(file)) {
            call.reject("Fichier source introuvable.");
            return;
        }

        try {
            byte[] bytes = readFileWithLimit(file);
            if (bytes == null) {
                call.reject("Fichier source introuvable.");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Lecture impossible : " + e.getMessage());
        }
    }

    @PluginMethod
    public void deletePendingImportFile(PluginCall call) {
        String cachePath = call.getString("cachePath");
        if (cachePath == null || cachePath.isEmpty()) {
            call.reject("cachePath requis.");
            return;
        }

        File file = new File(cachePath);
        if (isAllowedImportFile(file)) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
        clearPendingImportState();
        call.resolve();
    }

    @PluginMethod
    public void saveToDownloadsFromPath(PluginCall call) {
        String cacheUri = call.getString("cacheUri");
        String fileName = sanitizeFileName(call.getString("fileName"));
        String mimeType = call.getString("mimeType", "application/zip");

        if (cacheUri == null || fileName == null) {
            call.reject("cacheUri et fileName requis.");
            return;
        }

        try {
            byte[] bytes = readBytesFromCacheUri(cacheUri);
            if (bytes == null) {
                call.reject("Fichier source introuvable.");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(bytes, fileName, mimeType, call);
            } else {
                saveLegacyDownloads(bytes, fileName, call);
            }
        } catch (Exception e) {
            call.reject("Enregistrement impossible : " + e.getMessage());
        }
    }

    private byte[] readBytesFromCacheUri(String cacheUri) throws Exception {
        Uri uri = Uri.parse(cacheUri);
        if ("file".equals(uri.getScheme())) {
            String path = uri.getPath();
            if (path == null) {
                return null;
            }
            File file = new File(path);
            if (!isAllowedExportFile(file)) {
                return null;
            }
            return readFileWithLimit(file);
        }

        ContentResolver resolver = getContext().getContentResolver();
        try (InputStream in = resolver.openInputStream(uri)) {
            if (in == null) {
                return null;
            }
            return readStreamWithLimit(in);
        }
    }

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String data = call.getString("data");
        String fileName = sanitizeFileName(call.getString("fileName"));
        String mimeType = call.getString("mimeType", "application/zip");

        if (data == null || fileName == null) {
            call.reject("data et fileName requis.");
            return;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (bytes.length > MAX_FILE_BYTES) {
                call.reject("Fichier trop volumineux.");
                return;
            }
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

    public static String sha256Prefix(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < 8; i += 1) {
                builder.append(String.format(Locale.ROOT, "%02x", hash[i]));
            }
            return builder.toString();
        } catch (Exception e) {
            return "";
        }
    }

    public static boolean isAcceptableArchiveMagic(byte[] header) {
        if (header == null || header.length < 4) {
            return false;
        }
        boolean zipMagic = header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04;
        if (zipMagic) {
            return true;
        }
        byte[] yamadori = new byte[] { 0x59, 0x41, 0x4D, 0x41, 0x44, 0x4F, 0x52, 0x49 };
        if (header.length < yamadori.length) {
            return false;
        }
        for (int i = 0; i < yamadori.length; i += 1) {
            if (header[i] != yamadori[i]) {
                return false;
            }
        }
        return true;
    }

    static String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return null;
        }
        String trimmed = fileName.trim();
        int lastSlash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
        if (lastSlash >= 0) {
            trimmed = trimmed.substring(lastSlash + 1);
        }
        if (trimmed.contains("..") || trimmed.isEmpty()) {
            return null;
        }
        return trimmed;
    }

    private boolean isAllowedImportFile(File file) {
        if (file == null || !file.exists() || !file.isFile()) {
            return false;
        }
        try {
            File importsDir = new File(getContext().getCacheDir(), "imports").getCanonicalFile();
            File canonical = file.getCanonicalFile();
            return canonical.getName().equals("pending-import.yamadori.zip")
                    && canonical.getParentFile().equals(importsDir);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isAllowedExportFile(File file) {
        if (file == null || !file.exists() || !file.isFile()) {
            return false;
        }
        try {
            File exportsDir = new File(getContext().getCacheDir(), "exports").getCanonicalFile();
            File canonical = file.getCanonicalFile();
            return canonical.getPath().startsWith(exportsDir.getPath() + File.separator);
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] readFileWithLimit(File file) throws Exception {
        if (!isAllowedExportFile(file) && !isAllowedImportFile(file)) {
            return null;
        }
        try (FileInputStream in = new FileInputStream(file)) {
            return readStreamWithLimit(in);
        }
    }

    private static byte[] readStreamWithLimit(InputStream in) throws Exception {
        byte[] buffer = new byte[8192];
        int read;
        long total = 0;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        while ((read = in.read(buffer)) != -1) {
            total += read;
            if (total > MAX_FILE_BYTES) {
                throw new IllegalStateException("Fichier trop volumineux.");
            }
            out.write(buffer, 0, read);
        }
        return out.toByteArray();
    }

    static class CopyResult {
        final boolean success;
        final long sizeBytes;
        final String sha256Prefix;

        CopyResult(boolean success, long sizeBytes, String sha256Prefix) {
            this.success = success;
            this.sizeBytes = sizeBytes;
            this.sha256Prefix = sha256Prefix;
        }
    }

    static CopyResult copyUriToImportFile(Context context, Uri uri, File dest, long maxBytes) {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (Exception e) {
            return new CopyResult(false, 0, "");
        }

        byte[] header = new byte[8];
        int headerLength = 0;

        try (InputStream in = context.getContentResolver().openInputStream(uri);
                FileOutputStream out = new FileOutputStream(dest, false)) {
            if (in == null) {
                return new CopyResult(false, 0, "");
            }

            byte[] buffer = new byte[8192];
            long total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                if (headerLength < header.length) {
                    int toCopy = Math.min(read, header.length - headerLength);
                    System.arraycopy(buffer, 0, header, headerLength, toCopy);
                    headerLength += toCopy;
                }

                total += read;
                if (total > maxBytes) {
                    out.getFD().sync();
                    //noinspection ResultOfMethodCallIgnored
                    dest.delete();
                    return new CopyResult(false, 0, "");
                }
                digest.update(buffer, 0, read);
                out.write(buffer, 0, read);
            }

            if (headerLength < 4 || !isAcceptableArchiveMagic(header)) {
                //noinspection ResultOfMethodCallIgnored
                dest.delete();
                return new CopyResult(false, 0, "");
            }

            byte[] hash = digest.digest();
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < 8; i += 1) {
                builder.append(String.format(Locale.ROOT, "%02x", hash[i]));
            }
            return new CopyResult(true, total, builder.toString());
        } catch (Exception e) {
            //noinspection ResultOfMethodCallIgnored
            dest.delete();
            return new CopyResult(false, 0, "");
        }
    }
}
