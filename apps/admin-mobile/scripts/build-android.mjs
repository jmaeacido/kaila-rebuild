import { spawnSync } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const mode = process.argv[2];
if (mode !== "debug" && mode !== "release") {
  throw new Error("Usage: node scripts/build-android.mjs <debug|release>");
}

const requiredVariables = ["KAILA_ADMIN_VERSION_CODE", "KAILA_ADMIN_VERSION_NAME"];

if (mode === "release") {
  requiredVariables.push(
    "KAILA_ADMIN_ANDROID_KEYSTORE",
    "KAILA_ADMIN_ANDROID_STORE_PASSWORD",
    "KAILA_ADMIN_ANDROID_KEY_ALIAS",
    "KAILA_ADMIN_ANDROID_KEY_PASSWORD",
  );
  if (!existsSync("android/app/google-services.json")) {
    throw new Error("android/app/google-services.json for com.kaila.admin is required for release push notifications.");
  }
}

const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Admin Android build environment variables are missing: ${missing.join(", ")}`);
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: platform === "win32" && /\.(?:cmd|bat)$/i.test(command),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpm = platform === "win32" ? "pnpm.cmd" : "pnpm";
const gradle = platform === "win32" ? "gradlew.bat" : "./gradlew";

run(process.execPath, ["scripts/android-doctor.mjs"]);
run(pnpm, ["android:sync"]);
run(pnpm, ["android:verify"]);
run(gradle, [mode === "release" ? "bundleRelease" : "assembleDebug"], resolve("android"));
