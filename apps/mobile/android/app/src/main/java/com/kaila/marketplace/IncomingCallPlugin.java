package com.kaila.marketplace;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IncomingCall")
public class IncomingCallPlugin extends Plugin {
    @PluginMethod
    public void startActiveCall(PluginCall call) {
        String media = call.getString("media", "audio");
        Intent intent = new Intent(getContext(), CallForegroundService.class);
        intent.setAction(CallForegroundService.ACTION_START);
        intent.putExtra(CallForegroundService.EXTRA_MEDIA, media);
        ContextCompat.startForegroundService(getContext(), intent);
        IncomingCallNotifier.cancel(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopActiveCall(PluginCall call) {
        Intent intent = new Intent(getContext(), CallForegroundService.class);
        intent.setAction(CallForegroundService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void cancelIncoming(PluginCall call) {
        IncomingCallNotifier.cancel(getContext());
        call.resolve();
    }
}
