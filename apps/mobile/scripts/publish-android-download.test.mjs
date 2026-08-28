import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import test from "node:test";
import {
  buildAndroidDownloadSource,
  publishAndroidDownload,
} from "./publish-android-download.mjs";

test("buildAndroidDownloadSource writes the download page version constants", () => {
  const source = buildAndroidDownloadSource({
    versionName: "1.2.3",
    versionCode: 42,
  });

  assert.match(source, /versionName: "1\.2\.3"/);
  assert.match(source, /versionCode: 42/);
  assert.match(source, /fileName: "kaila-android\.apk"/);
  assert.match(source, /publish-android-download\.mjs/);
});

test("publishAndroidDownload updates android-download.ts for release builds", () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kaila-mobile-publish-"));
  const mobileRoot = join(workspaceRoot, "mobile");
  const webRoot = join(workspaceRoot, "web");
  const configPath = join(webRoot, "src/app/android-download.ts");

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, "export const ANDROID_DOWNLOAD = {} as const;\n", "utf8");

  const result = publishAndroidDownload({
    mode: "release",
    versionName: "2.0.0",
    versionCode: 7,
    mobileRoot,
  });

  assert.equal(result.configPath, configPath);
  const updated = readFileSync(configPath, "utf8");
  assert.match(updated, /versionName: "2\.0\.0"/);
  assert.match(updated, /versionCode: 7/);
});
