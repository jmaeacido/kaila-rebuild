import { SITE_URL } from "./seo";

/** Synced automatically by apps/mobile/scripts/publish-android-download.mjs after Android builds. */
export const ANDROID_DOWNLOAD = {
  versionName: "1.0.3",
  versionCode: 5,
  fileName: "kaila-android.apk",
  minAndroid: "Android 7.0+",
  packageId: "com.kaila.marketplace",
} as const;

export const ANDROID_APK_PATH = `/downloads/${ANDROID_DOWNLOAD.fileName}`;

export const ANDROID_DOWNLOAD_PAGE_URL = `${SITE_URL}/download`;

export const ANDROID_APK_DOWNLOAD_URL = `${SITE_URL}${ANDROID_APK_PATH}`;

/** Play Console closed-test opt-in page (same default as API `kaila.android_internal_test_url`). */
export const ANDROID_INTERNAL_TEST_URL =
  process.env.NEXT_PUBLIC_ANDROID_INTERNAL_TEST_URL?.trim() ||
  "https://play.google.com/apps/testing/com.kaila.marketplace";
