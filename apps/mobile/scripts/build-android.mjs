import { spawnSync } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";

const channel = process.argv[2];
const mode = process.argv[3];
if (!(["play", "direct"].includes(channel) && ["debug", "release"].includes(mode))) {
  throw new Error("Usage: node scripts/build-android.mjs <play|direct> <debug|release>");
}
if (channel === "play" && mode !== "release") {
  throw new Error("The Play artifact must be a release App Bundle.");
}
if (channel === "direct" && mode !== "debug") {
  throw new Error("The website artifact must be the explicitly requested Direct debug APK.");
}

const requiredVariables = ["KAILA_VERSION_CODE", "KAILA_VERSION_NAME"];

if (mode === "release") {
  requiredVariables.push(
    "KAILA_ANDROID_KEYSTORE",
    "KAILA_ANDROID_STORE_PASSWORD",
    "KAILA_ANDROID_KEY_ALIAS",
    "KAILA_ANDROID_KEY_PASSWORD",
  );
}

const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Android build environment variables are missing: ${missing.join(", ")}`);
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
const androidDirectory = resolve("android");

run(process.execPath, ["scripts/android-doctor.mjs"]);
run(pnpm, ["android:sync"]);
run(pnpm, ["android:verify"]);
const variant = `${channel[0].toUpperCase()}${channel.slice(1)}${mode[0].toUpperCase()}${mode.slice(1)}`;
run(gradle, [mode === "release" ? `bundle${variant}` : `assemble${variant}`], androidDirectory);
run(process.execPath, ["scripts/verify-android-release.mjs", channel]);
if (channel === "direct") {
  run(process.execPath, ["scripts/publish-android-download.mjs", "direct"]);
}
