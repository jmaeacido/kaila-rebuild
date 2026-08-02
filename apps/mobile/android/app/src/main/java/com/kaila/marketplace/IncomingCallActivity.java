package com.kaila.marketplace;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.Nullable;

public class IncomingCallActivity extends Activity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setShowWhenLocked(true);
        setTurnScreenOn(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
        KeyguardManager keyguard = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (keyguard != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            keyguard.requestDismissKeyguard(this, null);
        }

        setContentView(R.layout.activity_incoming_call);
        Bundle extras = getIntent().getExtras() == null ? new Bundle() : getIntent().getExtras();
        String callerName = extras.getString(IncomingCallNotifier.EXTRA_CALLER_NAME, "KAILA caller");
        String media = extras.getString(IncomingCallNotifier.EXTRA_MEDIA, "audio");

        TextView title = findViewById(R.id.incomingCallTitle);
        TextView subtitle = findViewById(R.id.incomingCallSubtitle);
        title.setText(callerName);
        subtitle.setText("Incoming " + media + " call");

        Button answer = findViewById(R.id.incomingCallAnswer);
        Button decline = findViewById(R.id.incomingCallDecline);
        answer.setOnClickListener(v -> {
            launchMain(IncomingCallNotifier.ACTION_ANSWER, extras);
            finish();
        });
        decline.setOnClickListener(v -> {
            Intent declineIntent = new Intent(this, IncomingCallActionReceiver.class);
            declineIntent.setAction(IncomingCallNotifier.ACTION_DECLINE);
            declineIntent.putExtras(extras);
            sendBroadcast(declineIntent);
            IncomingCallNotifier.cancel(this);
            finish();
        });
    }

    private void launchMain(String action, Bundle extras) {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open == null) return;
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtras(extras);
        open.putExtra(IncomingCallNotifier.EXTRA_ACTION, action.equals(IncomingCallNotifier.ACTION_ANSWER) ? "answer" : "open");
        IncomingCallNotifier.cancel(this);
        startActivity(open);
    }
}
