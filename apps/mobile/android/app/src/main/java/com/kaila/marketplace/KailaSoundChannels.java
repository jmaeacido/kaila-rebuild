package com.kaila.marketplace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.RawRes;

final class KailaSoundChannels {
    static final String MATCH = "kaila_match_v1";
    static final String HIRED = "kaila_hired_v1";
    static final String MESSAGES = "kaila_messages_v1";
    static final String OFFERS = "kaila_offers_v1";
    static final String COUNTERS = "kaila_counters_v1";
    static final String UPDATES = "kaila_updates_v1";
    static final String TRAVEL = "kaila_travel_v1";
    static final String SUPPORT = "kaila_support_v1";
    // Channel behavior is immutable after creation. Bump when call presentation
    // changes so existing Android installs receive the required high importance.
    static final String CALLS = "kaila_calls_v4";
    static final String SILENT = "kaila_silent";

    private KailaSoundChannels() {}

    static void ensureAll(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        AudioAttributes notification = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        AudioAttributes ringtone = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        create(manager, MATCH, "Job matches", "New nearby jobs that match your services", raw(context, R.raw.kaila_job_match), notification);
        create(manager, HIRED, "Hired", "When a client selects your offer", raw(context, R.raw.kaila_job_hired), notification);
        create(manager, MESSAGES, "Messages", "New marketplace chat messages", raw(context, R.raw.kaila_message), notification);
        create(manager, OFFERS, "Offers", "New first offers on a job", raw(context, R.raw.kaila_offer), notification);
        create(manager, COUNTERS, "Counteroffers", "Revised prices and counteroffers", raw(context, R.raw.kaila_counter_offer), notification);
        create(manager, UPDATES, "Job updates", "Job status, completion, and reminders", raw(context, R.raw.kaila_job_update), notification);
        create(manager, TRAVEL, "Travel updates", "Provider travel and arrival updates", raw(context, R.raw.kaila_travel), notification);
        create(manager, SUPPORT, "Support", "Support and dispute updates", raw(context, R.raw.kaila_support), notification);
        create(manager, CALLS, "Incoming calls", "Full-screen KAILA audio and video calls", raw(context, R.raw.kaila_call_ring), ringtone);

        NotificationChannel silent = new NotificationChannel(
            SILENT,
            "Quiet notifications",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        silent.setDescription("Notifications delivered silently during your quiet hours");
        silent.setSound(null, null);
        silent.enableVibration(false);
        silent.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(silent);
    }

    private static void create(
        NotificationManager manager,
        String id,
        String name,
        String description,
        Uri sound,
        AudioAttributes attributes
    ) {
        NotificationChannel channel = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(description);
        channel.setSound(sound, attributes);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    private static Uri raw(Context context, @RawRes int resId) {
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + resId);
    }
}
