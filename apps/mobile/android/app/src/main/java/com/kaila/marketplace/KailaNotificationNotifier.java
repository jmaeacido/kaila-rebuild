package com.kaila.marketplace;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Map;

public final class KailaNotificationNotifier {
    private KailaNotificationNotifier() {}

    public static void show(Context context, Map<String, String> data) {
        KailaSoundChannels.ensureAll(context);
        String channelId = value(data, "channelId", KailaSoundChannels.UPDATES);
        String title = value(data, "title", "KAILA update");
        String body = value(data, "body", "Open KAILA to view this update.");
        String notificationId = value(data, "notificationId", title + body);
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open == null) return;
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(context, notificationId.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setContentIntent(content);
        try {
            NotificationManagerCompat.from(context).notify(notificationId.hashCode(), builder.build());
        } catch (SecurityException ignored) {
            // Android notification permission is controlled by the user.
        }
    }

    private static String value(Map<String, String> data, String key, String fallback) {
        String value = data.get(key);
        return value == null || value.isEmpty() ? fallback : value;
    }
}
