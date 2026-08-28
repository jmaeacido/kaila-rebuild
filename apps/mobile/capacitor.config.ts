import type { CapacitorConfig } from "@capacitor/cli";

const appOrigin = process.env.KAILA_APP_ORIGIN ?? "https://app.kaila-app.com";
const parsedOrigin = new URL(appOrigin);

if (parsedOrigin.protocol !== "https:") {
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
  server: {
    url: parsedOrigin.origin,
    cleartext: false,
    allowNavigation: [parsedOrigin.hostname],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
