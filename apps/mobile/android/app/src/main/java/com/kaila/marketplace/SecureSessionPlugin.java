package com.kaila.marketplace;

import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String FILE_NAME = "kaila_secure_session";
    private static final String SESSION_KEY = "mobile_tokens";

    private SharedPreferences preferences() throws Exception {
        MasterKey masterKey = new MasterKey.Builder(getContext())
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build();
        return EncryptedSharedPreferences.create(
            getContext(), FILE_NAME, masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
    }

    @PluginMethod
    public void save(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.length() > 16384) { call.reject("Invalid session payload"); return; }
        try { preferences().edit().putString(SESSION_KEY, value).apply(); call.resolve(); }
        catch (Exception exception) { call.reject("Secure storage is unavailable", exception); }
    }

    @PluginMethod
    public void load(PluginCall call) {
        try {
            JSObject result = new JSObject();
            String value = preferences().getString(SESSION_KEY, null);
            if (value != null) result.put("value", value);
            call.resolve(result);
        } catch (Exception exception) { call.reject("Secure storage is unavailable", exception); }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try { preferences().edit().remove(SESSION_KEY).apply(); call.resolve(); }
        catch (Exception exception) { call.reject("Secure storage is unavailable", exception); }
    }
}
