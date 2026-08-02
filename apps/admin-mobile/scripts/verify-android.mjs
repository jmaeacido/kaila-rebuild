import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [
  [read("capacitor.config.ts").includes('appId: "com.kaila.admin"'), "Capacitor app ID must be com.kaila.admin."],
  [read("capacitor.config.ts").includes('"https://admin.kaila-app.com"'), "Default origin must be the production admin HTTPS origin."],
  [read("android/app/src/main/AndroidManifest.xml").includes('android:usesCleartextTraffic="false"'), "Cleartext Android traffic must be disabled."],
  [read("android/app/build.gradle").includes("minifyEnabled true"), "Release minification must be enabled."],
  [read("android/app/build.gradle").includes("shrinkResources true"), "Release resource shrinking must be enabled."],
  [read("android/app/src/main/res/values/strings.xml").includes("KAILA Admin"), "Android app label must identify the admin app."],
];

const failures = checks.filter(([passes]) => !passes).map(([, message]) => message);
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`Error: ${failure}`));
  process.exitCode = 1;
} else {
  console.log("KAILA Admin Android project verification passed.");
}
