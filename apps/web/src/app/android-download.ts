import { SITE_URL } from "./seo";

/** Update when publishing a new consumer APK to public/downloads/. */
export const ANDROID_DOWNLOAD = {
  versionName: "1.0.0",
  versionCode: 1,
  fileName: "kaila-android.apk",
  minAndroid: "Android 7.0+",
  packageId: "com.kaila.marketplace",
} as const;

export const ANDROID_APK_PATH = `/downloads/${ANDROID_DOWNLOAD.fileName}`;

export const ANDROID_DOWNLOAD_PAGE_URL = `${SITE_URL}/download`;

export const ANDROID_APK_DOWNLOAD_URL = `${SITE_URL}${ANDROID_APK_PATH}`;
