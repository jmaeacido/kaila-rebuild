package com.kaila.marketplace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureSessionPlugin.class);
        registerPlugin(BackgroundNavigationPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        AudioAttributes soundAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        manager.createNotificationChannel(audibleChannel(
            "kaila_updates",
            "Jobs, offers, and updates",
            "Job requests, offers, status changes, and reminders",
            soundAttributes
        ));
        manager.createNotificationChannel(audibleChannel(
            "kaila_messages",
            "Messages",
            "New marketplace messages",
            soundAttributes
        ));
        manager.createNotificationChannel(audibleChannel(
            "kaila_calls",
            "Incoming calls",
            "Incoming KAILA audio and video calls",
            soundAttributes
        ));

        NotificationChannel silent = new NotificationChannel(
            "kaila_silent",
            "Quiet notifications",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        silent.setDescription("Notifications delivered silently during your quiet hours");
        silent.setSound(null, null);
        silent.enableVibration(false);
        silent.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(silent);
    }

    private NotificationChannel audibleChannel(
        String id,
        String name,
        String description,
        AudioAttributes soundAttributes
    ) {
        NotificationChannel channel = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(description);
        channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), soundAttributes);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        return channel;
    }
}
