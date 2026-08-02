package com.kaila.admin;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Probes Firebase Messaging without throwing. Capacitor's Bridge rethrows plugin
 * exceptions as RuntimeException on the main thread, so calling
 * PushNotifications.register() before Firebase is initialized crash-loops the app.
 */
@CapacitorPlugin(name = "AdminPushGuard")
public class AdminPushGuardPlugin extends Plugin {

    @PluginMethod
    public void isMessagingAvailable(PluginCall call) {
        JSObject result = new JSObject();
        try {
            if (FirebaseApp.getApps(getContext()).isEmpty()) {
                FirebaseApp.initializeApp(getContext());
            }
            if (FirebaseApp.getApps(getContext()).isEmpty()) {
                result.put("available", false);
                result.put("reason", "uninitialized");
                call.resolve(result);
                return;
            }
            FirebaseMessaging.getInstance();
            result.put("available", true);
            call.resolve(result);
        } catch (Exception ex) {
            result.put("available", false);
            result.put("reason", ex.getClass().getSimpleName());
            call.resolve(result);
        }
    }
}
