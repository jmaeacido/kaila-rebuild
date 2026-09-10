package com.kaila.marketplace;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

@CapacitorPlugin(name = "ApkUpdate")
public class ApkUpdatePlugin extends Plugin {
    private static final String ALLOWED_HOST = "kaila-app.com";
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final int MAX_REDIRECTS = 5;
    private static final int CONNECT_TIMEOUT_MS = 30_000;
    private static final int READ_TIMEOUT_MS = 120_000;

    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    private PluginCall pendingInstallCall;

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (canRequestPackageInstalls()) {
            JSObject result = new JSObject();
            result.put("allowed", true);
            call.resolve(result);
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            JSObject result = new JSObject();
            result.put("allowed", true);
            call.resolve(result);
            return;
        }

        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, intent, "installPermissionResult");
    }

    @ActivityCallback
    private void installPermissionResult(PluginCall call, ActivityResult result) {
        JSObject response = new JSObject();
        response.put("allowed", canRequestPackageInstalls());
        call.resolve(response);
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        Integer versionCode = call.getInt("versionCode");
        if (url == null || url.isBlank()) {
            call.reject("A download URL is required", "INVALID_URL");
            return;
        }
        if (versionCode == null || versionCode <= 0) {
            call.reject("A positive versionCode is required", "INVALID_VERSION");
            return;
        }

        URL parsed;
        try {
            parsed = new URL(url);
        } catch (Exception exception) {
            call.reject("The download URL is invalid", "INVALID_URL");
            return;
        }

        if (!"https".equalsIgnoreCase(parsed.getProtocol()) || !isAllowedHost(parsed.getHost())) {
            call.reject("Only HTTPS downloads from kaila-app.com are allowed", "HOST_NOT_ALLOWED");
            return;
        }

        if (!canRequestPackageInstalls()) {
            pendingInstallCall = call;
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            startActivityForResult(call, intent, "installPermissionBeforeDownload");
            return;
        }

        startDownload(call, url, versionCode);
    }

    @ActivityCallback
    private void installPermissionBeforeDownload(PluginCall call, ActivityResult result) {
        PluginCall active = pendingInstallCall != null ? pendingInstallCall : call;
        pendingInstallCall = null;
        if (!canRequestPackageInstalls()) {
            active.reject("Install permission is required to update KAILA", "INSTALL_PERMISSION_DENIED");
            return;
        }
        String url = active.getString("url");
        Integer versionCode = active.getInt("versionCode");
        if (url == null || versionCode == null) {
            active.reject("Update request expired", "INVALID_REQUEST");
            return;
        }
        startDownload(active, url, versionCode);
    }

    private void startDownload(PluginCall call, String url, int versionCode) {
        downloadExecutor.execute(() -> {
            File apkFile = null;
            try {
                apkFile = downloadApk(url, versionCode);
                File finalApk = apkFile;
                runOnUi(() -> launchInstaller(call, finalApk));
            } catch (Exception exception) {
                if (apkFile != null && apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }
                String message = exception.getMessage() != null ? exception.getMessage() : "Download failed";
                runOnUi(() -> call.reject(message, "DOWNLOAD_FAILED", exception));
            }
        });
    }

    private void runOnUi(Runnable action) {
        Activity activity = getActivity();
        if (activity == null) {
            action.run();
            return;
        }
        activity.runOnUiThread(action);
    }

    private void launchInstaller(PluginCall call, File apkFile) {
        try {
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, APK_MIME);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PackageManager packageManager = getContext().getPackageManager();
            if (intent.resolveActivity(packageManager) == null) {
                call.reject("No package installer is available", "INSTALLER_UNAVAILABLE");
                return;
            }
            getContext().startActivity(intent);
            JSObject response = new JSObject();
            response.put("started", true);
            call.resolve(response);
        } catch (Exception exception) {
            call.reject("Unable to open the package installer", "INSTALL_FAILED", exception);
        }
    }

    private File downloadApk(String url, int versionCode) throws IOException {
        File updatesDir = new File(getContext().getCacheDir(), "updates");
        if (!updatesDir.exists() && !updatesDir.mkdirs()) {
            throw new IOException("Unable to prepare the update cache");
        }
        File target = new File(updatesDir, "kaila-android-" + versionCode + ".apk");
        if (target.exists() && !target.delete()) {
            throw new IOException("Unable to replace a previous update file");
        }

        HttpURLConnection connection = openAllowedConnection(url);
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("Update download failed with HTTP " + status);
            }
            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(target)) {
                byte[] buffer = new byte[8192];
                int read;
                long total = 0;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                    total += read;
                    if (total > 200L * 1024L * 1024L) {
                        throw new IOException("Update file is unexpectedly large");
                    }
                }
            }
            if (!target.exists() || target.length() == 0) {
                throw new IOException("The update file was empty");
            }
            return target;
        } finally {
            connection.disconnect();
        }
    }

    private HttpURLConnection openAllowedConnection(String startUrl) throws IOException {
        URL current = new URL(startUrl);
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            if (!"https".equalsIgnoreCase(current.getProtocol()) || !isAllowedHost(current.getHost())) {
                throw new IOException("Redirect left the allowed download host");
            }
            HttpsURLConnection connection = (HttpsURLConnection) current.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("Accept", APK_MIME + ",application/octet-stream,*/*");
            connection.setRequestProperty("User-Agent", "KAILA-Android-Updater");
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || location.isBlank()) {
                    throw new IOException("Update redirect was missing a location");
                }
                current = new URL(current, location);
                continue;
            }
            return connection;
        }
        throw new IOException("Too many redirects while downloading the update");
    }

    private boolean canRequestPackageInstalls() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private boolean isAllowedHost(String host) {
        if (host == null) return false;
        String normalized = host.toLowerCase();
        return ALLOWED_HOST.equals(normalized) || normalized.endsWith("." + ALLOWED_HOST);
    }
}
