import assert from "node:assert/strict";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("./android-download.ts", import.meta.url), "utf8");

test("android download metadata points at the public APK and download page", () => {
  assert.match(config, /fileName: "kaila-android\.apk"/);
  assert.match(config, /ANDROID_APK_PATH = `\/downloads\/\$\{ANDROID_DOWNLOAD\.fileName\}`/);
  assert.match(config, /ANDROID_DOWNLOAD_PAGE_URL = `\$\{SITE_URL\}\/download`/);
  assert.match(config, /ANDROID_APK_DOWNLOAD_URL = `\$\{SITE_URL\}\$\{ANDROID_APK_PATH\}`/);
});

test("advertised Android APK exists and is a non-empty ZIP-based package", () => {
  const apkUrl = new URL("../../public/downloads/kaila-android.apk", import.meta.url);
  const apk = statSync(apkUrl);
  const signature = Buffer.alloc(4);
  const descriptor = openSync(apkUrl, "r");

  readSync(descriptor, signature, 0, signature.length, 0);
  closeSync(descriptor);

  assert.ok(apk.size > 1_000_000, "APK is unexpectedly small");
  assert.deepEqual([...signature], [0x50, 0x4b, 0x03, 0x04]);
});

test("landing page exposes the download section and navigation", () => {
  const landing = readFileSync(new URL("./landing-page.tsx", import.meta.url), "utf8");
  const publicRoutes = readFileSync(new URL("./public-routes.ts", import.meta.url), "utf8");

  assert.match(landing, /<AndroidDownloadSection \/>/);
  assert.match(landing, /href="#download">Download<\/a>/);
  assert.match(landing, /href="\/download">Download<\/Link>/);
  assert.match(publicRoutes, /"\/download"/);
});

test("download section keeps hero, actions, and visuals on separate desktop rows", () => {
  const section = readFileSync(
    new URL("../components/android-download-section.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../components/android-download-section.module.css", import.meta.url),
    "utf8",
  );

  assert.match(section, /className=\{styles\.hero\}/);
  assert.match(section, /className=\{styles\.downloadPanel\}/);
  assert.match(section, /<BrandWordmark className=\{styles\.titleBrand\} \/>/);
  assert.match(section, /<BrandWordmark className=\{styles\.phoneWordmark\} \/>/);
  assert.match(styles, /"hero hero"/);
  assert.match(styles, /"download visual"/);
});
