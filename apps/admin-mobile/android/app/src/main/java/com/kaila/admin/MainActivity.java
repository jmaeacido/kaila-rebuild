package com.kaila.admin;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdminPushGuardPlugin.class);
        super.onCreate(savedInstanceState);
        AdminNotificationChannels.ensure(this);
    }
}
