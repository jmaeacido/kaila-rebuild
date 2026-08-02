import { readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [
  [read("capacitor.config.ts").includes('appId: "com.kaila.admin"'), "Capacitor app ID must be com.kaila.admin."],
  [read("capacitor.config.ts").includes('"https://admin.kaila-app.com"'), "Default origin must be the production admin HTTPS origin."],
  [read("android/app/src/main/AndroidManifest.xml").includes('android:usesCleartextTraffic="false"'), "Cleartext Android traffic must be disabled."],
  [read("android/app/build.gradle").includes("minifyEnabled true"), "Release minification must be enabled."],
  [read("android/app/build.gradle").includes("shrinkResources true"), "Release resource shrinking must be enabled."],
  [read("android/app/src/main/res/values/strings.xml").includes("KAILA Admin"), "Android app label must identify the admin app."],
  [read("android/app/src/main/AndroidManifest.xml").includes("android.permission.POST_NOTIFICATIONS"), "Android notification permission must be declared."],
  [read("package.json").includes('"@capacitor/push-notifications"'), "The Capacitor push plugin must be packaged."],
  [read("android/app/src/main/AndroidManifest.xml").includes('android:icon="@mipmap/ic_launcher"'), "The launcher icon must be configured."],
  [read("android/app/src/main/AndroidManifest.xml").includes('android:roundIcon="@mipmap/ic_launcher_round"'), "The round launcher icon must be configured."],
  [statSync("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png").size > 10_000, "The high-resolution branded launcher icon must be present."],
];

const failures = checks.filter(([passes]) => !passes).map(([, message]) => message);
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`Error: ${failure}`));
  process.exitCode = 1;
} else {
  console.log("KAILA Admin Android project verification passed.");
}
