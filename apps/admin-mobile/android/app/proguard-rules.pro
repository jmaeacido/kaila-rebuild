# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in the build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserve Firebase / FCM entry points used by Capacitor push registration.
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Preserve the admin push availability probe registered from MainActivity.
-keep class com.kaila.admin.AdminPushGuardPlugin { *; }
