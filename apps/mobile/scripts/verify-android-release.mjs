import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const channel = process.argv[2] ?? "source";
if (!["source", "play", "direct"].includes(channel)) throw new Error("Usage: verify-android-release.mjs <source|play|direct>");
const mobileRoot = resolve(import.meta.dirname, "..");
const androidRoot = join(mobileRoot, "android");
const mainRoot = join(androidRoot, "app/src/main");
const directRoot = join(androidRoot, "app/src/direct");
const mainManifest = readFileSync(join(mainRoot, "AndroidManifest.xml"), "utf8");
const directManifest = readFileSync(join(directRoot, "AndroidManifest.xml"), "utf8");
const gradle = readFileSync(join(androidRoot, "app/build.gradle"), "utf8");
const mainActivity = readFileSync(join(mainRoot, "java/com/kaila/marketplace/MainActivity.java"), "utf8");
const bridge = readFileSync(join(mobileRoot, "src/apk-update-plugin.ts"), "utf8");
const capacitor = readFileSync(join(mobileRoot, "capacitor.config.ts"), "utf8");

function requireMarker(content, marker, description = marker) {
  if (!content.includes(marker)) throw new Error(`Android release control missing: ${description}`);
}
function listJavaFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listJavaFiles(path) : entry.name.endsWith(".java") ? [path] : [];
  });
}
function verifySource() {
  for (const marker of ['android:allowBackup="false"', 'android:usesCleartextTraffic="false"', "android.permission.POST_NOTIFICATIONS", 'android:host="app.kaila-app.com"', "android.permission.USE_FULL_SCREEN_INTENT"]) requireMarker(mainManifest, marker);
  if (mainManifest.includes("REQUEST_INSTALL_PACKAGES")) throw new Error("Restricted install permission must not be in the shared manifest.");
  requireMarker(directManifest, "android.permission.REQUEST_INSTALL_PACKAGES");
  requireMarker(directManifest, "application/vnd.android.package-archive");
  for (const marker of ['play {', 'direct {', 'buildConfig = true', 'DIRECT_APK_UPDATES", "false"', 'DIRECT_APK_UPDATES", "true"']) requireMarker(gradle, marker);
  requireMarker(mainActivity, "BuildConfig.DIRECT_APK_UPDATES");
  requireMarker(bridge, 'Capacitor.isPluginAvailable("ApkUpdate")');
  requireMarker(capacitor, "https://app.kaila-app.com");
  if (!existsSync(join(directRoot, "java/com/kaila/marketplace/ApkUpdatePlugin.java"))) throw new Error("Direct-only ApkUpdatePlugin source is missing.");
  if (mainManifest.includes("ACCESS_BACKGROUND_LOCATION")) throw new Error("ACCESS_BACKGROUND_LOCATION remains prohibited (ADR-0022).");
  const notifier = join(mainRoot, "java/com/kaila/marketplace/IncomingCallNotifier.java");
  requireMarker(readFileSync(notifier, "utf8"), "setFullScreenIntent(fullScreenPending, true)");
  const unexpected = listJavaFiles(join(mainRoot, "java")).filter((path) => path !== notifier && readFileSync(path, "utf8").includes("setFullScreenIntent"));
  if (unexpected.length) throw new Error(`Unexpected full-screen intent usage: ${unexpected.join(", ")}`);
}
function capitalize(value) { return value[0].toUpperCase() + value.slice(1); }
function findMergedManifest(variant) {
  const candidates = [
    join(androidRoot, `app/build/intermediates/merged_manifests/${variant}/process${capitalize(variant)}Manifest/AndroidManifest.xml`),
    join(androidRoot, `app/build/intermediates/merged_manifest/${variant}/process${capitalize(variant)}MainManifest/AndroidManifest.xml`),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`Merged manifest was not found for ${variant}. Build the artifact first.`);
  return found;
}
function findApkSigner() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) throw new Error("ANDROID_HOME or ANDROID_SDK_ROOT is required to verify APK signing.");
  const versions = readdirSync(join(sdk, "build-tools")).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const name = process.platform === "win32" ? "apksigner.bat" : "apksigner";
  const tool = versions.map((version) => join(sdk, "build-tools", version, name)).find(existsSync);
  if (!tool) throw new Error("apksigner was not found in Android build-tools.");
  return tool;
}
function artifactContainsUpdater(artifact, entries) {
  const dexEntries = entries
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => /(^|\/)classes\d*\.dex$/.test(entry));
  if (dexEntries.length === 0) throw new Error(`No DEX entries found in ${artifact}`);
  const extractRoot = mkdtempSync(join(tmpdir(), "kaila-dex-verify-"));
  try {
    execFileSync("jar", ["xf", artifact, ...dexEntries], { cwd: extractRoot });
    return dexEntries.some((entry) => {
      const bytes = readFileSync(join(extractRoot, entry));
      return bytes.includes(Buffer.from("ApkUpdatePlugin", "utf8"));
    });
  } finally {
    rmSync(extractRoot, { recursive: true, force: true });
  }
}

function verifyArtifact(targetChannel) {
  const expectedVersionCode = process.env.KAILA_VERSION_CODE;
  const expectedVersionName = process.env.KAILA_VERSION_NAME;
  if (!expectedVersionCode || !expectedVersionName) throw new Error("KAILA_VERSION_CODE and KAILA_VERSION_NAME are required for artifact verification.");
  const isPlay = targetChannel === "play";
  const variant = isPlay ? "playRelease" : "directDebug";
  const artifact = isPlay ? join(androidRoot, "app/build/outputs/bundle/playRelease/app-play-release.aab") : join(androidRoot, "app/build/outputs/apk/direct/debug/app-direct-debug.apk");
  if (!existsSync(artifact)) throw new Error(`Expected ${targetChannel} artifact not found: ${artifact}`);
  const manifestPath = findMergedManifest(variant);
  const merged = readFileSync(manifestPath, "utf8");
  const entries = execFileSync("jar", ["tf", artifact], { encoding: "utf8" });
  const hasPermission = merged.includes("android.permission.REQUEST_INSTALL_PACKAGES");
  const hasUpdater = artifactContainsUpdater(artifact, entries);
  if (isPlay && (hasPermission || hasUpdater)) throw new Error("Play AAB contains a direct APK installer or restricted install permission.");
  if (!isPlay && (!hasPermission || !hasUpdater)) throw new Error("Direct APK lost its install permission or updater integration.");
  for (const marker of ['package="com.kaila.marketplace"', `android:versionCode="${expectedVersionCode}"`, `android:versionName="${expectedVersionName}"`]) requireMarker(merged, marker, `${targetChannel} merged manifest ${marker}`);
  const configEntry = isPlay ? "base/assets/capacitor.config.json" : "assets/capacitor.config.json";
  requireMarker(entries, configEntry, `${targetChannel} packaged Capacitor configuration`);
  const extractRoot = mkdtempSync(join(tmpdir(), "kaila-artifact-verify-"));
  let packagedConfig;
  try {
    execFileSync("jar", ["xf", artifact, configEntry], { cwd: extractRoot });
    packagedConfig = readFileSync(join(extractRoot, configEntry), "utf8");
  } finally {
    rmSync(extractRoot, { recursive: true, force: true });
  }
  requireMarker(packagedConfig, "https://app.kaila-app.com", `${targetChannel} production managed origin`);
  const tool = isPlay ? "jarsigner" : findApkSigner();
  const args = isPlay ? ["-verify", "-verbose", "-certs", artifact] : ["verify", "--verbose", "--print-certs", artifact];
  const signing = execFileSync(tool, args, {
    encoding: "utf8",
    shell: process.platform === "win32" && /\.(?:cmd|bat)$/i.test(tool),
  });
  if (isPlay && !/jar verified/i.test(signing)) throw new Error("Play AAB signature verification failed.");
  console.log(JSON.stringify({ channel: targetChannel, artifact, mergedManifest: manifestPath, permission: hasPermission, updater: hasUpdater }));
  console.log(signing);
}

verifySource();
if (channel !== "source") verifyArtifact(channel);
console.log(`Android ${channel} release controls verified.`);
