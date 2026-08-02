package com.kaila.marketplace;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public final class IncomingCallNotifier {
    public static final String CHANNEL_ID = "kaila_calls_v2";
    public static final int NOTIFICATION_ID = 4201;
    public static final String ACTION_ANSWER = "com.kaila.marketplace.call.ANSWER";
    public static final String ACTION_DECLINE = "com.kaila.marketplace.call.DECLINE";
    public static final String ACTION_OPEN = "com.kaila.marketplace.call.OPEN";
    public static final String EXTRA_CALL_ID = "callId";
    public static final String EXTRA_MEDIA = "media";
    public static final String EXTRA_CONTEXT_TYPE = "contextType";
    public static final String EXTRA_CONTEXT_ID = "contextId";
    public static final String EXTRA_CALLER_NAME = "callerName";
    public static final String EXTRA_ACTION = "callAction";

    private IncomingCallNotifier() {}

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Incoming calls",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Full-screen incoming KAILA audio and video calls");
        channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), attributes);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    public static void show(Context context, Bundle extras) {
        ensureChannel(context);
        String callerName = extras.getString(EXTRA_CALLER_NAME, "KAILA caller");
        String media = extras.getString(EXTRA_MEDIA, "audio");
        String title = "Incoming " + media + " call";
        String body = callerName + " is calling";

        Intent fullScreen = new Intent(context, IncomingCallActivity.class);
        fullScreen.putExtras(extras);
        fullScreen.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent fullScreenPending = PendingIntent.getActivity(
            context,
            1,
            fullScreen,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent answer = actionPending(context, ACTION_ANSWER, extras, 2);
        PendingIntent decline = actionPending(context, ACTION_DECLINE, extras, 3);
        PendingIntent open = actionPending(context, ACTION_OPEN, extras, 4);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(open)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(0, "Answer", answer)
            .addAction(0, "Decline", decline)
            .setTimeoutAfter(60_000L)
            .build();

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification);
    }

    public static void cancel(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private static PendingIntent actionPending(Context context, String action, Bundle extras, int requestCode) {
        Intent intent = new Intent(context, IncomingCallActionReceiver.class);
        intent.setAction(action);
        intent.putExtras(extras);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
