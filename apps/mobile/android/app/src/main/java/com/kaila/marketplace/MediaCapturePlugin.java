package com.kaila.marketplace;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.IOException;

@CapacitorPlugin(
    name = "MediaCapture",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class MediaCapturePlugin extends Plugin {
    private File pendingFile;
    private String pendingMimeType;

    @PluginMethod
    public void capture(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionResult");
            return;
        }
        launchCapture(call);
    }

    @PermissionCallback
    private void cameraPermissionResult(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("Camera permission is required to take a photo or video", "CAMERA_PERMISSION_DENIED");
            return;
        }
        launchCapture(call);
    }

    private void launchCapture(PluginCall call) {
        String kind = call.getString("kind", "photo");
        if (!"photo".equals(kind) && !"video".equals(kind)) {
            call.reject("Unsupported capture kind");
            return;
        }

        boolean photo = "photo".equals(kind);
        Intent intent = new Intent(photo ? MediaStore.ACTION_IMAGE_CAPTURE : MediaStore.ACTION_VIDEO_CAPTURE);
        if (intent.resolveActivity(getContext().getPackageManager()) == null) {
            call.reject(photo ? "No camera app is available" : "No video camera app is available");
            return;
        }

        try {
            pendingMimeType = photo ? "image/jpeg" : "video/mp4";
            pendingFile = File.createTempFile(photo ? "kaila-photo-" : "kaila-video-", photo ? ".jpg" : ".mp4", getContext().getCacheDir());
            Uri output = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pendingFile);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, output);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if (!photo) {
                intent.putExtra(MediaStore.EXTRA_DURATION_LIMIT, 30);
                intent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 1);
            }
            startActivityForResult(call, intent, "captureResult");
        } catch (IOException exception) {
            clearPendingFile();
            call.reject("Unable to prepare camera capture", exception);
        }
    }

    @ActivityCallback
    private void captureResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || pendingFile == null || !pendingFile.exists() || pendingFile.length() == 0) {
            clearPendingFile();
            call.reject("Capture cancelled", "CAPTURE_CANCELLED");
            return;
        }

        JSObject response = new JSObject();
        response.put("path", Uri.fromFile(pendingFile).toString());
        response.put("name", pendingFile.getName());
        response.put("mimeType", pendingMimeType);
        pendingFile = null;
        pendingMimeType = null;
        call.resolve(response);
    }

    private void clearPendingFile() {
        if (pendingFile != null && pendingFile.exists()) pendingFile.delete();
        pendingFile = null;
        pendingMimeType = null;
    }
}
