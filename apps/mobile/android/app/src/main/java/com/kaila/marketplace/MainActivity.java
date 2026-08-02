package com.kaila.marketplace;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureSessionPlugin.class);
        registerPlugin(BackgroundNavigationPlugin.class);
        registerPlugin(IncomingCallPlugin.class);
        registerPlugin(MediaCapturePlugin.class);
        super.onCreate(savedInstanceState);
        KailaSoundChannels.ensureAll(this);
        // Keep legacy channels registered so older installs do not crash; new pushes use v1/v3 IDs.
        createLegacyChannels();
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
        String callerAvatarUrl = intent.getStringExtra(IncomingCallNotifier.EXTRA_CALLER_AVATAR_URL);
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String script = "window.dispatchEvent(new CustomEvent('kaila:native-call',{detail:{"
            + "callId:" + jsonString(callId) + ","
            + "action:" + jsonString(action) + ","
            + "media:" + jsonString(media == null ? "audio" : media) + ","
            + "contextType:" + jsonString(contextType == null ? "job" : contextType) + ","
            + "contextId:" + jsonString(contextId == null ? "" : contextId) + ","
            + "callerName:" + jsonString(callerName == null ? "" : callerName)
            + ",callerAvatarUrl:" + jsonString(callerAvatarUrl == null ? "" : callerAvatarUrl)
            + "}}));";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
        if (contextId != null && !contextId.isEmpty() && "job".equals(contextType == null ? "job" : contextType)) {
            String path = "/jobs/" + contextId + "/hired/conversation?callId=" + encode(callId)
                + "&callAction=" + encode(action)
                + "&callMedia=" + encode(media == null ? "audio" : media)
                + "&callContextType=job"
                + "&callContextId=" + encode(contextId)
                + (callerName == null || callerName.isEmpty() ? "" : "&callCallerName=" + encode(callerName))
                + (callerAvatarUrl == null || callerAvatarUrl.isEmpty() ? "" : "&callCallerAvatarUrl=" + encode(callerAvatarUrl));
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
                "window.location.assign(" + jsonString(path) + ");",
                null
            ));
        }
    }

    private void createLegacyChannels() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        for (String[] channel : new String[][] {
            {"kaila_updates", "Jobs, offers, and updates (legacy)"},
            {"kaila_messages", "Messages (legacy)"},
            {"kaila_calls", "Incoming calls (legacy)"},
            {"kaila_calls_v2", "Incoming calls (legacy ringtone)"},
        }) {
            if (manager.getNotificationChannel(channel[0]) != null) continue;
            NotificationChannel legacy = new NotificationChannel(
                channel[0],
                channel[1],
                NotificationManager.IMPORTANCE_HIGH
            );
            manager.createNotificationChannel(legacy);
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
}
