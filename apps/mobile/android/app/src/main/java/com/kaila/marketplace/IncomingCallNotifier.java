package com.kaila.marketplace;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;

public final class IncomingCallNotifier {
    public static final String CHANNEL_ID = KailaSoundChannels.CALLS;
    public static final int NOTIFICATION_ID = 4201;
    public static final String ACTION_ANSWER = "com.kaila.marketplace.call.ANSWER";
    public static final String ACTION_DECLINE = "com.kaila.marketplace.call.DECLINE";
    public static final String ACTION_OPEN = "com.kaila.marketplace.call.OPEN";
    public static final String EXTRA_CALL_ID = "callId";
    public static final String EXTRA_MEDIA = "media";
    public static final String EXTRA_CONTEXT_TYPE = "contextType";
    public static final String EXTRA_CONTEXT_ID = "contextId";
    public static final String EXTRA_CALLER_NAME = "callerName";
    public static final String EXTRA_CALLER_AVATAR_URL = "callerAvatarUrl";
    public static final String EXTRA_ACTION = "callAction";

    private IncomingCallNotifier() {}

    public static void ensureChannel(Context context) {
        KailaSoundChannels.ensureAll(context);
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

        PendingIntent answer = activityPending(context, "answer", extras, 2);
        PendingIntent decline = broadcastPending(context, ACTION_DECLINE, extras, 3);
        PendingIntent open = activityPending(context, "open", extras, 4);
        Person caller = new Person.Builder()
            .setName(callerName)
            .setImportant(true)
            .build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
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
            .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer))
            .setTimeoutAfter(60_000L);

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // Android notification permission is controlled by the user.
        }
    }

    public static void cancel(Context context) {
        try {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
        } catch (SecurityException ignored) {
            // Android notification permission is controlled by the user.
        }
    }

    private static PendingIntent activityPending(Context context, String action, Bundle extras, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtras(extras);
        intent.putExtra(EXTRA_ACTION, action);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent broadcastPending(Context context, String action, Bundle extras, int requestCode) {
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
