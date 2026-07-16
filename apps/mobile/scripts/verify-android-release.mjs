import { readFileSync } from "node:fs";

const manifest = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
const gradle = readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const required = [
  [manifest, 'android:allowBackup="false"'],
  [manifest, 'android:usesCleartextTraffic="false"'],
  [manifest, 'android.permission.POST_NOTIFICATIONS'],
  [manifest, 'android:host="app.kaila-app.com"'],
  [gradle, "minifyEnabled true"],
  [gradle, "shrinkResources true"],
  [gradle, "KAILA_ANDROID_KEYSTORE"],
];
const missing = required.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (missing.length) throw new Error(`Android release controls missing: ${missing.join(", ")}`);
if (manifest.includes("ACCESS_BACKGROUND_LOCATION") || manifest.includes("USE_FULL_SCREEN_INTENT")) throw new Error("Deferred Android permissions must not be requested.");
console.log("Android manifest and release controls verified.");
