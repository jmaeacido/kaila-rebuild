package com.kaila.marketplace;

import android.os.Bundle;
import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class KailaFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if ("call".equals(data.get("type"))) {
            String action = data.get("action");
            if ("cancel".equals(action) || isTerminalStatus(data.get("status"))) {
                IncomingCallNotifier.cancel(this);
            } else {
                Bundle extras = new Bundle();
                extras.putString(IncomingCallNotifier.EXTRA_CALL_ID, data.get("callId"));
                extras.putString(IncomingCallNotifier.EXTRA_MEDIA, data.containsKey("media") ? data.get("media") : "audio");
                extras.putString(IncomingCallNotifier.EXTRA_CONTEXT_TYPE, data.get("contextType"));
                extras.putString(IncomingCallNotifier.EXTRA_CONTEXT_ID, data.get("contextId"));
                extras.putString(
                    IncomingCallNotifier.EXTRA_CALLER_NAME,
                    data.containsKey("callerName") ? data.get("callerName") : "KAILA caller"
                );
                IncomingCallNotifier.show(this, extras);
            }
            // Still forward so a foreground WebView can hydrate CallProvider.
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            return;
        }
        super.onMessageReceived(remoteMessage);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private static boolean isTerminalStatus(String status) {
        return "declined".equals(status) || "ended".equals(status) || "active".equals(status);
    }
}
