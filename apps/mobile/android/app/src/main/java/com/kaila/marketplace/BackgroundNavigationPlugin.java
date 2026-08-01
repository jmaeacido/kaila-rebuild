package com.kaila.marketplace;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BackgroundNavigation",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class BackgroundNavigationPlugin extends Plugin {
    private PluginCall pendingStart;

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            pendingStart = call;
            requestPermissionForAlias("location", call, "locationPermissionResult");
            return;
        }
        startService(call);
    }

    @PermissionCallback
    private void locationPermissionResult(PluginCall call) {
        PluginCall target = pendingStart == null ? call : pendingStart;
        pendingStart = null;
        if (getPermissionState("location") != PermissionState.GRANTED) {
            target.reject("Precise location permission is required for navigation");
            return;
        }
        startService(target);
    }

    private void startService(PluginCall call) {
        String locationUrl = call.getString("locationUrl");
        String stopUrl = call.getString("stopUrl");
        String accessToken = call.getString("accessToken");
        if (locationUrl == null || stopUrl == null || accessToken == null || !locationUrl.startsWith("https://") || !stopUrl.startsWith("https://")) {
            call.reject("Secure navigation endpoints and an access token are required");
            return;
        }
        Intent intent = new Intent(getContext(), NavigationLocationService.class);
        intent.setAction(NavigationLocationService.ACTION_START);
        intent.putExtra(NavigationLocationService.EXTRA_LOCATION_URL, locationUrl);
        intent.putExtra(NavigationLocationService.EXTRA_STOP_URL, stopUrl);
        intent.putExtra(NavigationLocationService.EXTRA_ACCESS_TOKEN, accessToken);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), NavigationLocationService.class);
        intent.setAction(NavigationLocationService.ACTION_STOP_LOCAL);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", NavigationLocationService.isActive());
        call.resolve(result);
    }
}
