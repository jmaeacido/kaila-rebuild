package com.kaila.marketplace;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

public class IncomingCallActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        Bundle extras = intent.getExtras() == null ? new Bundle() : intent.getExtras();
        String action = intent.getAction();
        IncomingCallNotifier.cancel(context);

        if (IncomingCallNotifier.ACTION_DECLINE.equals(action)) {
            // Decline is completed once the WebView loads with callAction=decline.
            Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (open == null) return;
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtras(extras);
            open.putExtra(IncomingCallNotifier.EXTRA_ACTION, "decline");
            context.startActivity(open);
            return;
        }

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open == null) return;
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtras(extras);
        if (IncomingCallNotifier.ACTION_ANSWER.equals(action)) {
            open.putExtra(IncomingCallNotifier.EXTRA_ACTION, "answer");
        } else {
            open.putExtra(IncomingCallNotifier.EXTRA_ACTION, "open");
        }
        context.startActivity(open);
    }
}
