import type { CapacitorConfig } from "@capacitor/cli";

const appOrigin = process.env.KAILA_APP_ORIGIN;
if (appOrigin && !appOrigin.startsWith("https://")) {
  throw new Error("KAILA_APP_ORIGIN must use HTTPS.");
}

const config: CapacitorConfig = {
  appId: "com.kaila.marketplace",
  appName: "KAILA",
  webDir: "dist",
  backgroundColor: "#F7F9FC",
  android: {
    allowMixedContent: false,
    backgroundColor: "#F7F9FC",
    buildOptions: {
      releaseType: "AAB",
    },
  },
  server: appOrigin
    ? {
        url: appOrigin,
        cleartext: false,
        allowNavigation: [new URL(appOrigin).hostname],
      }
    : undefined,
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
