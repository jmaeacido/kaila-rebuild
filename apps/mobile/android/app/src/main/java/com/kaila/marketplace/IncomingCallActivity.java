package com.kaila.marketplace;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.Nullable;

public class IncomingCallActivity extends Activity {
    private MediaPlayer ringtone;

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
        TextView avatar = findViewById(R.id.incomingCallAvatar);
        avatar.setText(callerName.isEmpty() ? "K" : callerName.substring(0, 1).toUpperCase());
        title.setText(callerName);
        subtitle.setText("Incoming " + media + " call");

        startRingtone();

        Button answer = findViewById(R.id.incomingCallAnswer);
        Button decline = findViewById(R.id.incomingCallDecline);
        answer.setOnClickListener(v -> {
            stopRingtone();
            launchMain(IncomingCallNotifier.ACTION_ANSWER, extras);
            finish();
        });
        decline.setOnClickListener(v -> {
            stopRingtone();
            Intent declineIntent = new Intent(this, IncomingCallActionReceiver.class);
            declineIntent.setAction(IncomingCallNotifier.ACTION_DECLINE);
            declineIntent.putExtras(extras);
            sendBroadcast(declineIntent);
            IncomingCallNotifier.cancel(this);
            finish();
        });
    }

    @Override
    protected void onDestroy() {
        stopRingtone();
        super.onDestroy();
    }

    private void startRingtone() {
        try {
            ringtone = MediaPlayer.create(this, R.raw.kaila_call_ring);
            if (ringtone == null) return;
            ringtone.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            ringtone.setLooping(true);
            ringtone.start();
        } catch (Exception ignored) {
            ringtone = null;
        }
    }

    private void stopRingtone() {
        if (ringtone == null) return;
        try {
            if (ringtone.isPlaying()) ringtone.stop();
        } catch (Exception ignored) {
            // Best-effort stop.
        }
        ringtone.release();
        ringtone = null;
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
