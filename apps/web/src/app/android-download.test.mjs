import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("./android-download.ts", import.meta.url), "utf8");

test("android download metadata points at the public APK and download page", () => {
  assert.match(config, /fileName: "kaila-android\.apk"/);
  assert.match(config, /ANDROID_APK_PATH = `\/downloads\/\$\{ANDROID_DOWNLOAD\.fileName\}`/);
  assert.match(config, /ANDROID_DOWNLOAD_PAGE_URL = `\$\{SITE_URL\}\/download`/);
  assert.match(config, /ANDROID_APK_DOWNLOAD_URL = `\$\{SITE_URL\}\$\{ANDROID_APK_PATH\}`/);
});

test("landing page exposes the download section and navigation", () => {
  const landing = readFileSync(new URL("./landing-page.tsx", import.meta.url), "utf8");

  assert.match(landing, /<AndroidDownloadSection \/>/);
  assert.match(landing, /href="#download">Download<\/a>/);
  assert.match(landing, /href="\/download">Download<\/Link>/);
});
