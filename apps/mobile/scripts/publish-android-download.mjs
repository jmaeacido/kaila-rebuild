import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function buildAndroidDownloadSource({ versionName, versionCode }) {
  return `import { SITE_URL } from "./seo";

/** Synced automatically by apps/mobile/scripts/publish-android-download.mjs after Android builds. */
export const ANDROID_DOWNLOAD = {
  versionName: ${JSON.stringify(versionName)},
  versionCode: ${versionCode},
  fileName: "kaila-android.apk",
  minAndroid: "Android 7.0+",
  packageId: "com.kaila.marketplace",
} as const;

export const ANDROID_APK_PATH = \`/downloads/\${ANDROID_DOWNLOAD.fileName}\`;

export const ANDROID_DOWNLOAD_PAGE_URL = \`\${SITE_URL}/download\`;

export const ANDROID_APK_DOWNLOAD_URL = \`\${SITE_URL}\${ANDROID_APK_PATH}\`;
`;
}

function readBuildVersions() {
  const versionName = process.env.KAILA_VERSION_NAME;
  const versionCodeRaw = process.env.KAILA_VERSION_CODE;

  if (!versionName || !versionCodeRaw) {
    throw new Error(
      "KAILA_VERSION_NAME and KAILA_VERSION_CODE must be set before publishing the download page.",
    );
  }

  const versionCode = Number.parseInt(versionCodeRaw, 10);
  if (!Number.isFinite(versionCode) || versionCode <= 0) {
    throw new Error(`KAILA_VERSION_CODE must be a positive integer, received "${versionCodeRaw}".`);
  }

  return { versionName, versionCode };
}

export function publishAndroidDownload({ mode: buildMode, versionName, versionCode, mobileRoot }) {
  const webRoot = resolve(mobileRoot, "../web");
  const configPath = resolve(webRoot, "src/app/android-download.ts");

  writeFileSync(
    configPath,
    buildAndroidDownloadSource({ versionName, versionCode }),
    "utf8",
  );

  if (buildMode === "debug") {
    const apkSource = resolve(
      mobileRoot,
      "android/app/build/outputs/apk/debug/app-debug.apk",
    );
    const apkDestination = resolve(webRoot, "public/downloads/kaila-android.apk");

    if (!existsSync(apkSource)) {
      throw new Error(`Built debug APK was not found at ${apkSource}.`);
    }

    mkdirSync(dirname(apkDestination), { recursive: true });
    copyFileSync(apkSource, apkDestination);
  }

  return {
    configPath,
    versionName,
    versionCode,
    copiedApk: buildMode === "debug",
  };
}

function main() {
  const mode = process.argv[2];
  if (mode !== "debug" && mode !== "release") {
    throw new Error("Usage: node scripts/publish-android-download.mjs <debug|release>");
  }

  const mobileRoot = fileURLToPath(new URL("..", import.meta.url));
  const { versionName, versionCode } = readBuildVersions();
  const result = publishAndroidDownload({
    mode,
    versionName,
    versionCode,
    mobileRoot,
  });

  console.log(
    `Updated /download metadata to version ${result.versionName} (${result.versionCode}) at ${result.configPath}.`,
  );

  if (result.copiedApk) {
    console.log("Copied debug APK to apps/web/public/downloads/kaila-android.apk.");
  }
}

const invokedDirectly =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  main();
}
