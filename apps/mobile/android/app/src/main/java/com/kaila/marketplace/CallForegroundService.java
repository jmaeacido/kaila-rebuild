package com.kaila.marketplace;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class CallForegroundService extends Service {
    public static final String ACTION_START = "com.kaila.marketplace.call.START_ACTIVE";
    public static final String ACTION_STOP = "com.kaila.marketplace.call.STOP_ACTIVE";
    public static final String EXTRA_MEDIA = "media";
    private static final String CHANNEL_ID = "kaila_active_call";
    private static final int NOTIFICATION_ID = 4202;
    private static volatile boolean active;

    public static boolean isActive() {
        return active;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            active = false;
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        String media = intent == null ? "audio" : intent.getStringExtra(EXTRA_MEDIA);
        if (media == null) media = "audio";
        createChannel();
        startAsForeground(media);
        active = true;
        return START_STICKY;
    }

    private void startAsForeground(String media) {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent content = PendingIntent.getActivity(
            this,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("KAILA call in progress")
            .setContentText(media.equals("video") ? "Video call is active" : "Audio call is active")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(content)
            .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int type = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            if (media.equals("video") && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                type = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE | ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
            }
            startForeground(NOTIFICATION_ID, notification, type);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Active calls",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps an in-progress KAILA call alive in the background");
        manager.createNotificationChannel(channel);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        active = false;
        super.onDestroy();
    }
}
