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
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONObject;

public class NavigationLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.kaila.marketplace.navigation.START";
    public static final String ACTION_STOP = "com.kaila.marketplace.navigation.STOP";
    public static final String ACTION_STOP_LOCAL = "com.kaila.marketplace.navigation.STOP_LOCAL";
    public static final String EXTRA_LOCATION_URL = "locationUrl";
    public static final String EXTRA_STOP_URL = "stopUrl";
    public static final String EXTRA_REFRESH_URL = "refreshUrl";
    public static final String EXTRA_ACCESS_TOKEN = "accessToken";
    public static final String EXTRA_REFRESH_TOKEN = "refreshToken";
    private static final String CHANNEL_ID = "kaila_navigation";
    private static final int NOTIFICATION_ID = 4102;
    private static volatile boolean active;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final AtomicLong lastCapturedAtMs = new AtomicLong(0);
    private LocationManager locationManager;
    private String locationUrl;
    private String stopUrl;
    private String refreshUrl;
    private String accessToken;
    private String refreshToken;

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
            post(stopUrl, null, false);
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
        refreshUrl = intent.getStringExtra(EXTRA_REFRESH_URL);
        accessToken = intent.getStringExtra(EXTRA_ACCESS_TOKEN);
        refreshToken = intent.getStringExtra(EXTRA_REFRESH_TOKEN);
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            active = false;
            stopSelf();
            return START_NOT_STICKY;
        }
        startAsForeground();
        active = true;
        // GPS-only avoids NETWORK/GPS clock skew that used to 409 and tear down the service.
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 5f, this);
        }
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 8000L, 25f, this);
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
            long capturedAt = Math.max(System.currentTimeMillis(), lastCapturedAtMs.get() + 1);
            lastCapturedAtMs.set(capturedAt);
            JSONObject body = new JSONObject()
                .put("latitude", location.getLatitude())
                .put("longitude", location.getLongitude())
                .put("accuracyMeters", Math.max(1, Math.min(200, Math.round(location.getAccuracy()))))
                .put("capturedAt", iso8601Utc(capturedAt))
                .put("foreground", true);
            if (location.hasBearing()) {
                float bearing = location.getBearing();
                if (bearing >= 0f && bearing <= 360f) body.put("headingDegrees", bearing);
            }
            post(locationUrl, body.toString(), true);
        } catch (Exception ignored) { }
    }

    private void post(String endpoint, @Nullable String body, boolean allowRefresh) {
        if (endpoint == null || accessToken == null) return;
        network.execute(() -> {
            int status = executePost(endpoint, body, accessToken);
            if (body != null && status == 401 && allowRefresh && tryRefreshAccessToken()) {
                status = executePost(endpoint, body, accessToken);
            }
            // 409 = stale/out-of-order sample; keep sharing rather than tearing down navigation.
            if (body != null && (status == 401 || status == 404 || status == 410)) stopNavigation();
        });
    }

    private boolean tryRefreshAccessToken() {
        if (refreshUrl == null || refreshToken == null) return false;
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(refreshUrl).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", "application/json");
            JSONObject payload = new JSONObject().put("refreshToken", refreshToken);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            }
            if (connection.getResponseCode() != 200) return false;
            String responseBody = readStream(connection.getInputStream());
            JSONObject root = new JSONObject(responseBody);
            JSONObject tokens = root.getJSONObject("data").getJSONObject("tokens");
            accessToken = tokens.getString("accessToken");
            refreshToken = tokens.getString("refreshToken");
            return accessToken != null && !accessToken.isEmpty();
        } catch (Exception ignored) {
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private int executePost(String endpoint, @Nullable String body, String bearer) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("Authorization", "Bearer " + bearer);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            return connection.getResponseCode();
        } catch (Exception ignored) {
            return -1;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String readStream(InputStream stream) throws Exception {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }

    private void stopNavigation() {
        active = false;
        if (locationManager != null) locationManager.removeUpdates(this);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private static String iso8601Utc(long epochMillis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(epochMillis));
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
