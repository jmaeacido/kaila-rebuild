package com.kaila.marketplace;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
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
        if (!hasPreciseLocation()) {
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
        if (!hasPreciseLocation()) {
            target.reject("Precise location permission is required for navigation");
            return;
        }
        startService(target);
    }

    private void startService(PluginCall call) {
        if (!isLocationEnabled()) {
            call.reject("Turn on Android Location to start navigation");
            return;
        }
        String locationUrl = call.getString("locationUrl");
        String stopUrl = call.getString("stopUrl");
        String refreshUrl = call.getString("refreshUrl");
        String accessToken = call.getString("accessToken");
        String refreshToken = call.getString("refreshToken");
        if (locationUrl == null || stopUrl == null || accessToken == null || !locationUrl.startsWith("https://") || !stopUrl.startsWith("https://")) {
            call.reject("Secure navigation endpoints and an access token are required");
            return;
        }
        Intent intent = new Intent(getContext(), NavigationLocationService.class);
        intent.setAction(NavigationLocationService.ACTION_START);
        intent.putExtra(NavigationLocationService.EXTRA_LOCATION_URL, locationUrl);
        intent.putExtra(NavigationLocationService.EXTRA_STOP_URL, stopUrl);
        intent.putExtra(NavigationLocationService.EXTRA_ACCESS_TOKEN, accessToken);
        if (refreshUrl != null && refreshUrl.startsWith("https://")) {
            intent.putExtra(NavigationLocationService.EXTRA_REFRESH_URL, refreshUrl);
        }
        if (refreshToken != null) {
            intent.putExtra(NavigationLocationService.EXTRA_REFRESH_TOKEN, refreshToken);
        }
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
        result.put("preciseLocation", hasPreciseLocation());
        result.put("locationEnabled", isLocationEnabled());
        call.resolve(result);
    }

    private boolean hasPreciseLocation() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isLocationEnabled() {
        LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
        return manager != null && (
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        );
    }
}
