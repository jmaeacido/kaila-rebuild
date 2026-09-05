import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";

type CanInstallResult = { allowed: boolean };
type DownloadAndInstallOptions = { url: string; versionCode: number };
type DownloadAndInstallResult = { started: boolean };

export type InstalledAndroidAppInfo = {
  version: string;
  build: string;
};

const ApkUpdate = registerPlugin<{
  canInstall(): Promise<CanInstallResult>;
  requestInstallPermission(): Promise<CanInstallResult>;
  downloadAndInstall(options: DownloadAndInstallOptions): Promise<DownloadAndInstallResult>;
}>("ApkUpdate");

export function nativeApkUpdateAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function getInstalledAndroidAppInfo(): Promise<InstalledAndroidAppInfo | null> {
  if (!nativeApkUpdateAvailable()) return null;
  try {
    const info = await App.getInfo();
    return { version: info.version, build: info.build };
  } catch {
    return null;
  }
}

export async function canInstallApkUpdates(): Promise<boolean> {
  if (!nativeApkUpdateAvailable()) return false;
  const result = await ApkUpdate.canInstall();
  return result.allowed === true;
}

export async function requestApkInstallPermission(): Promise<boolean> {
  if (!nativeApkUpdateAvailable()) return false;
  const result = await ApkUpdate.requestInstallPermission();
  return result.allowed === true;
}

export async function downloadAndInstallApk(options: DownloadAndInstallOptions): Promise<void> {
  if (!nativeApkUpdateAvailable()) {
    throw new Error("In-app updates are only available in the Android app.");
  }
  await ApkUpdate.downloadAndInstall(options);
}

export function addAndroidAppActiveListener(onActive: () => void): () => void {
  if (!nativeApkUpdateAvailable()) return () => undefined;
  let handle: { remove: () => Promise<void> } | undefined;
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) onActive();
  }).then((listener) => {
    handle = listener;
  });
  return () => {
    void handle?.remove();
  };
}
