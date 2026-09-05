import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ANDROID_UPDATE_SUPPRESS_MS,
  clearAndroidUpdateSuppress,
  isAndroidUpdateAvailable,
  isAndroidUpdateSuppressed,
  parseInstalledVersionCode,
  suppressAndroidUpdate,
  suppressStorageKey,
} from "./android-update.ts";

test("parseInstalledVersionCode accepts numeric build strings", () => {
  assert.equal(parseInstalledVersionCode("3"), 3);
  assert.equal(parseInstalledVersionCode(3), 3);
  assert.equal(parseInstalledVersionCode("0"), null);
  assert.equal(parseInstalledVersionCode("abc"), null);
});

test("isAndroidUpdateAvailable compares version codes", () => {
  assert.equal(
    isAndroidUpdateAvailable({ version: "1.0.1", build: "2" }, { versionName: "1.0.2", versionCode: 3 }),
    true,
  );
  assert.equal(
    isAndroidUpdateAvailable({ version: "1.0.2", build: "3" }, { versionName: "1.0.2", versionCode: 3 }),
    false,
  );
  assert.equal(
    isAndroidUpdateAvailable(null, { versionName: "1.0.2", versionCode: 3 }),
    false,
  );
});

test("update suppress lasts 24 hours for the same version code", () => {
  const memory = new Map();
  const storage = {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    },
    removeItem(key) {
      memory.delete(key);
    },
  };
  const now = Date.parse("2026-09-05T01:00:00.000Z");

  assert.equal(isAndroidUpdateSuppressed(3, now, storage), false);
  suppressAndroidUpdate(3, now, storage);
  assert.equal(memory.get(suppressStorageKey(3)), String(now + ANDROID_UPDATE_SUPPRESS_MS));
  assert.equal(isAndroidUpdateSuppressed(3, now + 1_000, storage), true);
  assert.equal(isAndroidUpdateSuppressed(3, now + ANDROID_UPDATE_SUPPRESS_MS + 1, storage), false);
  assert.equal(isAndroidUpdateSuppressed(4, now + 1_000, storage), false);
  clearAndroidUpdateSuppress(3, storage);
  assert.equal(isAndroidUpdateSuppressed(3, now + 1_000, storage), false);
});

test("native runtime mounts the Android update prompt", () => {
  const runtime = readFileSync(new URL("./native-runtime.tsx", import.meta.url), "utf8");
  const prompt = readFileSync(new URL("./android-update-prompt.tsx", import.meta.url), "utf8");
  const settingsPage = readFileSync(new URL("./settings/page.tsx", import.meta.url), "utf8");
  const settings = readFileSync(
    new URL("../components/android-update-settings.tsx", import.meta.url),
    "utf8",
  );

  assert.match(runtime, /<AndroidUpdatePrompt \/>/);
  assert.match(prompt, /downloadAndInstallApk/);
  assert.match(prompt, /ANDROID_DOWNLOAD/);
  assert.match(prompt, /Later/);
  assert.match(settingsPage, /<AndroidUpdateSettings \/>/);
  assert.match(settings, /Check for updates/);
  assert.match(settings, /Download update/);
});

test("decision 0053 documents website-channel self-update for 1.0.2", () => {
  const decision = readFileSync(
    new URL("../../../../docs/decisions/0053-website-apk-self-update.md", import.meta.url),
    "utf8",
  );
  assert.match(decision, /1\.0\.2/);
  assert.match(decision, /versionCode \*\*3\*\*/);
  assert.match(decision, /kaila-android\.apk/);
  assert.match(decision, /Do not resurrect the legacy Drive HMAC/);
});
