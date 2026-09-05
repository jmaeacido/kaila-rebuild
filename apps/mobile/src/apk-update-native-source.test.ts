import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nativeApkUpdateAvailable } from "./apk-update-plugin";

const plugin = readFileSync(
  new URL("../android/app/src/main/java/com/kaila/marketplace/ApkUpdatePlugin.java", import.meta.url),
  "utf8",
);
const mainActivity = readFileSync(
  new URL("../android/app/src/main/java/com/kaila/marketplace/MainActivity.java", import.meta.url),
  "utf8",
);
const manifest = readFileSync(
  new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
  "utf8",
);
const filePaths = readFileSync(
  new URL("../android/app/src/main/res/xml/file_paths.xml", import.meta.url),
  "utf8",
);

describe("ApkUpdate native wiring", () => {
  it("registers the plugin and install permission", () => {
    expect(mainActivity).toMatch(/registerPlugin\(ApkUpdatePlugin\.class\)/);
    expect(manifest).toMatch(/android\.permission\.REQUEST_INSTALL_PACKAGES/);
    expect(manifest).toMatch(/application\/vnd\.android\.package-archive/);
    expect(filePaths).toMatch(/name="apk_updates"/);
    expect(filePaths).toMatch(/path="updates\/"/);
  });

  it("downloads only from kaila-app.com and installs via FileProvider", () => {
    expect(plugin).toMatch(/ALLOWED_HOST = "kaila-app.com"/);
    expect(plugin).toMatch(/downloadAndInstall/);
    expect(plugin).toMatch(/FileProvider\.getUriForFile/);
    expect(plugin).toMatch(/ACTION_VIEW/);
    expect(plugin).toMatch(/ACTION_MANAGE_UNKNOWN_APP_SOURCES/);
  });

  it("exposes a web-safe availability gate for non-native runtimes", () => {
    expect(nativeApkUpdateAvailable()).toBe(false);
  });
});
