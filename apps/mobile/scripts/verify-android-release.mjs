import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const mainRoot = fileURLToPath(new URL("../android/app/src/main", import.meta.url));
const manifest = readFileSync(join(mainRoot, "AndroidManifest.xml"), "utf8");
const gradle = readFileSync(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const incomingCallNotifier = readFileSync(
  join(mainRoot, "java/com/kaila/marketplace/IncomingCallNotifier.java"),
  "utf8",
);

const required = [
  [manifest, 'android:allowBackup="false"'],
  [manifest, 'android:usesCleartextTraffic="false"'],
  [manifest, "android.permission.POST_NOTIFICATIONS"],
  [manifest, 'android:host="app.kaila-app.com"'],
  [manifest, 'android:host="kaila-app.com"'],
  [manifest, 'android:path="/post-job"'],
  [manifest, 'android:path="/download"'],
  // Decision 0034 / ADR-0022: call-only full-screen wake requires the permission.
  [manifest, "android.permission.USE_FULL_SCREEN_INTENT"],
  [gradle, "minifyEnabled true"],
  [gradle, "shrinkResources true"],
  [gradle, "KAILA_ANDROID_KEYSTORE"],
];
const missing = required.filter(([content, marker]) => !content.includes(marker)).map(([, marker]) => marker);
if (missing.length) throw new Error(`Android release controls missing: ${missing.join(", ")}`);

if (manifest.includes("ACCESS_BACKGROUND_LOCATION")) {
  throw new Error("ACCESS_BACKGROUND_LOCATION remains prohibited (ADR-0022).");
}

if (!incomingCallNotifier.includes("setFullScreenIntent(fullScreenPending, true)")) {
  throw new Error("IncomingCallNotifier must present authorized calls with setFullScreenIntent (Decision 0034).");
}

function listJavaFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listJavaFiles(path);
    return entry.name.endsWith(".java") ? [path] : [];
  });
}

const fullScreenIntentUsers = listJavaFiles(join(mainRoot, "java")).filter((path) => {
  const source = readFileSync(path, "utf8");
  return source.includes("setFullScreenIntent");
});
const unexpected = fullScreenIntentUsers.filter(
  (path) => !path.replaceAll("\\", "/").endsWith("/IncomingCallNotifier.java"),
);
if (unexpected.length) {
  throw new Error(
    `setFullScreenIntent is call-only (Decision 0034); unexpected usage in: ${unexpected.join(", ")}`,
  );
}

console.log("Android manifest and release controls verified (call-only USE_FULL_SCREEN_INTENT).");
