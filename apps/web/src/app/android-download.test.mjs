import assert from "node:assert/strict";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("./android-download.ts", import.meta.url), "utf8");

test("android download metadata keeps the in-app APK path and download page", () => {
  assert.match(config, /fileName: "kaila-android\.apk"/);
  assert.match(config, /ANDROID_APK_PATH = `\/downloads\/\$\{ANDROID_DOWNLOAD\.fileName\}`/);
  assert.match(config, /ANDROID_DOWNLOAD_PAGE_URL = `\$\{SITE_URL\}\/download`/);
  assert.match(config, /ANDROID_APK_DOWNLOAD_URL = `\$\{SITE_URL\}\$\{ANDROID_APK_PATH\}`/);
  assert.match(config, /ANDROID_INTERNAL_TEST_URL/);
});

test("in-app Android APK package still exists and is a non-empty ZIP-based package", () => {
  const apkUrl = new URL("../../public/downloads/kaila-android.apk", import.meta.url);
  const apk = statSync(apkUrl);
  const signature = Buffer.alloc(4);
  const descriptor = openSync(apkUrl, "r");

  readSync(descriptor, signature, 0, signature.length, 0);
  closeSync(descriptor);

  assert.ok(apk.size > 1_000_000, "APK is unexpectedly small");
  assert.deepEqual([...signature], [0x50, 0x4b, 0x03, 0x04]);
});

test("landing page exposes the early-access section and navigation", () => {
  const landing = readFileSync(new URL("./landing-page.tsx", import.meta.url), "utf8");
  const publicRoutes = readFileSync(new URL("./public-routes.ts", import.meta.url), "utf8");

  assert.match(landing, /<AndroidDownloadSection \/>/);
  assert.match(landing, /href="#download">Get the app<\/a>/);
  assert.match(landing, /href="\/download">Get the app<\/Link>/);
  assert.match(publicRoutes, /"\/download"/);
});

test("download section keeps hero, request form, and visuals on separate desktop rows", () => {
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
  assert.match(section, /Request access/);
  assert.match(section, /\/api\/v1\/public\/android-internal-test-requests/);
  assert.match(section, /<BrandWordmark className=\{styles\.titleBrand\} \/>/);
  assert.match(section, /<BrandWordmark className=\{styles\.phoneWordmark\} \/>/);
  assert.match(styles, /"hero hero"/);
  assert.match(styles, /"download visual"/);
});

test("landing download images expose descriptive alternative text", () => {
  const brandMark = readFileSync(
    new URL("../components/brand-mark.tsx", import.meta.url),
    "utf8",
  );
  const section = readFileSync(
    new URL("../components/android-download-section.tsx", import.meta.url),
    "utf8",
  );
  const qr = readFileSync(
    new URL("../components/android-download-qr.tsx", import.meta.url),
    "utf8",
  );

  assert.match(brandMark, /alt="KAILA bull mascot"/);
  assert.match(section, /alt="KAILA app icon"/);
  assert.match(qr, /<img alt=\{label\}/);
  assert.match(qr, /alt="KAILA app icon in the QR code"/);
  assert.doesNotMatch(`${brandMark}\n${section}\n${qr}`, /alt=""/);
});
