package com.kaila.marketplace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.RequiresApi;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureSessionPlugin.class);
        registerPlugin(BackgroundNavigationPlugin.class);
        registerPlugin(IncomingCallPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        routeIncomingCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        routeIncomingCallIntent(intent);
    }

    private void routeIncomingCallIntent(Intent intent) {
        if (intent == null) return;
        String callId = intent.getStringExtra(IncomingCallNotifier.EXTRA_CALL_ID);
        String action = intent.getStringExtra(IncomingCallNotifier.EXTRA_ACTION);
        if (callId == null || callId.isEmpty() || action == null || action.isEmpty()) return;
        String media = intent.getStringExtra(IncomingCallNotifier.EXTRA_MEDIA);
        String contextType = intent.getStringExtra(IncomingCallNotifier.EXTRA_CONTEXT_TYPE);
        String contextId = intent.getStringExtra(IncomingCallNotifier.EXTRA_CONTEXT_ID);
        String callerName = intent.getStringExtra(IncomingCallNotifier.EXTRA_CALLER_NAME);
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String script = "window.dispatchEvent(new CustomEvent('kaila:native-call',{detail:{"
            + "callId:" + jsonString(callId) + ","
            + "action:" + jsonString(action) + ","
            + "media:" + jsonString(media == null ? "audio" : media) + ","
            + "contextType:" + jsonString(contextType == null ? "job" : contextType) + ","
            + "contextId:" + jsonString(contextId == null ? "" : contextId) + ","
            + "callerName:" + jsonString(callerName == null ? "" : callerName)
            + "}}));";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
        // Also navigate to the conversation so the job context is available.
        if (contextId != null && !contextId.isEmpty() && "job".equals(contextType == null ? "job" : contextType)) {
            String path = "/jobs/" + contextId + "/hired/conversation?callId=" + encode(callId)
                + "&callAction=" + encode(action)
                + "&callMedia=" + encode(media == null ? "audio" : media)
                + "&callContextType=job"
                + "&callContextId=" + encode(contextId)
                + (callerName == null || callerName.isEmpty() ? "" : "&callCallerName=" + encode(callerName));
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
                "window.location.assign(" + jsonString(path) + ");",
                null
            ));
        }
    }

    private static String jsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String encode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception error) {
            return value;
        }
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
            "Incoming calls (legacy)",
            "Legacy incoming call alerts",
            soundAttributes
        ));
        IncomingCallNotifier.ensureChannel(this);

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

    @RequiresApi(Build.VERSION_CODES.O)
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
