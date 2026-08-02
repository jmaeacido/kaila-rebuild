import type { CapacitorConfig } from "@capacitor/cli";

const adminOrigin = process.env.KAILA_ADMIN_ORIGIN ?? "https://admin.kaila-app.com";
const parsedOrigin = new URL(adminOrigin);

if (parsedOrigin.protocol !== "https:") {
  throw new Error("KAILA_ADMIN_ORIGIN must use HTTPS.");
}

const config: CapacitorConfig = {
  appId: "com.kaila.admin",
  appName: "KAILA Admin",
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
};

export default config;
