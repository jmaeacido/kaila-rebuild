package com.kaila.marketplace;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class NavigationLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.kaila.marketplace.navigation.START";
    public static final String ACTION_STOP = "com.kaila.marketplace.navigation.STOP";
    public static final String ACTION_STOP_LOCAL = "com.kaila.marketplace.navigation.STOP_LOCAL";
    public static final String EXTRA_LOCATION_URL = "locationUrl";
    public static final String EXTRA_STOP_URL = "stopUrl";
    public static final String EXTRA_ACCESS_TOKEN = "accessToken";
    private static final String CHANNEL_ID = "kaila_navigation";
    private static final int NOTIFICATION_ID = 4102;
    private static volatile boolean active;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private String locationUrl;
    private String stopUrl;
    private String accessToken;

    public static boolean isActive() { return active; }

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            post(stopUrl, null);
            stopNavigation();
            return START_NOT_STICKY;
        }
        if (ACTION_STOP_LOCAL.equals(action)) {
            stopNavigation();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(action)) return START_NOT_STICKY;
        locationUrl = intent.getStringExtra(EXTRA_LOCATION_URL);
        stopUrl = intent.getStringExtra(EXTRA_STOP_URL);
        accessToken = intent.getStringExtra(EXTRA_ACCESS_TOKEN);
        startAsForeground();
        active = true;
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 5f, this);
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 10f, this);
        }
        return START_REDELIVER_INTENT;
    }

    private void startAsForeground() {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openApp = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, NavigationLocationService.class).setAction(ACTION_STOP);
        PendingIntent stopAction = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("KAILA navigation is active")
            .setContentText("Sharing your route with the client")
            .setContentIntent(openApp)
            .addAction(0, "Stop", stopAction)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(NOTIFICATION_ID, notification);
    }

    @Override
    public void onLocationChanged(Location location) {
        try {
            JSONObject body = new JSONObject()
                .put("latitude", location.getLatitude())
                .put("longitude", location.getLongitude())
                .put("accuracyMeters", Math.max(1, Math.min(200, Math.round(location.getAccuracy()))))
                .put("capturedAt", Instant.ofEpochMilli(location.getTime()).toString())
                .put("foreground", true);
            if (location.hasBearing()) {
                float bearing = location.getBearing();
                if (bearing >= 0f && bearing <= 360f) body.put("headingDegrees", bearing);
            }
            post(locationUrl, body.toString());
        } catch (Exception ignored) { }
    }

    private void post(String endpoint, @Nullable String body) {
        if (endpoint == null || accessToken == null) return;
        network.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Authorization", "Bearer " + accessToken);
                connection.setRequestProperty("Accept", "application/json");
                if (body != null) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json");
                    try (OutputStream output = connection.getOutputStream()) { output.write(body.getBytes(StandardCharsets.UTF_8)); }
                }
                int status = connection.getResponseCode();
                if (body != null && (status == 401 || status == 404 || status == 409 || status == 410)) stopNavigation();
            } catch (Exception ignored) { }
            finally { if (connection != null) connection.disconnect(); }
        });
    }

    private void stopNavigation() {
        active = false;
        if (locationManager != null) locationManager.removeUpdates(this);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Active navigation", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Keeps KAILA navigation and location sharing active");
        channel.setSound(null, null);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() { active = false; network.shutdown(); super.onDestroy(); }
}
