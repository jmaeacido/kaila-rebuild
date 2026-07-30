import { spawnSync } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";

const mode = process.argv[2];
if (mode !== "debug" && mode !== "release") {
  throw new Error("Usage: node scripts/build-android.mjs <debug|release>");
}

if (mode === "release") {
  const requiredReleaseVariables = [
    "KAILA_APP_ORIGIN",
    "KAILA_ANDROID_KEYSTORE",
    "KAILA_ANDROID_STORE_PASSWORD",
    "KAILA_ANDROID_KEY_ALIAS",
    "KAILA_ANDROID_KEY_PASSWORD",
    "KAILA_VERSION_CODE",
    "KAILA_VERSION_NAME",
  ];
  const missing = requiredReleaseVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Release environment variables are missing: ${missing.join(", ")}`);
  }
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpm = platform === "win32" ? "pnpm.cmd" : "pnpm";
const gradle = platform === "win32" ? "gradlew.bat" : "./gradlew";
const androidDirectory = resolve("android");

run(process.execPath, ["scripts/android-doctor.mjs"]);
run(pnpm, ["android:sync"]);
run(pnpm, ["android:verify"]);
run(gradle, [mode === "release" ? "bundleRelease" : "assembleDebug"], androidDirectory);
