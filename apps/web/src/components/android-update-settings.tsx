"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import {
  downloadAndInstallApk,
  getInstalledAndroidAppInfo,
  nativeApkUpdateAvailable,
  type InstalledAndroidAppInfo,
} from "@kaila/mobile/apk-update";
import {
  ANDROID_APK_DOWNLOAD_URL,
  ANDROID_DOWNLOAD,
} from "../app/android-download";
import {
  clearAndroidUpdateSuppress,
  isAndroidUpdateAvailable,
} from "../app/android-update";
import settingsStyles from "../app/settings/settings.module.css";
import styles from "../app/account/account.module.css";

type CheckState = "loading" | "current" | "available" | "updating" | "error";

export function AndroidUpdateSettings() {
  const [installed, setInstalled] = useState<InstalledAndroidAppInfo | null>(null);
  const [state, setState] = useState<CheckState>("loading");
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!nativeApkUpdateAvailable()) return;
    setState("loading");
    setError("");
    const info = await getInstalledAndroidAppInfo();
    setInstalled(info);
    if (!info) {
      setState("error");
      setError("We couldn’t read this app’s version.");
      return;
    }
    setState(isAndroidUpdateAvailable(info, ANDROID_DOWNLOAD) ? "available" : "current");
  }, []);

  useEffect(() => {
    if (!nativeApkUpdateAvailable()) return;
    const initial = window.setTimeout(() => {
      void check();
    }, 0);
    return () => window.clearTimeout(initial);
  }, [check]);

  if (!nativeApkUpdateAvailable()) return null;

  async function startUpdate() {
    setState("updating");
    setError("");
    clearAndroidUpdateSuppress(ANDROID_DOWNLOAD.versionCode);
    try {
      await downloadAndInstallApk({
        url: ANDROID_APK_DOWNLOAD_URL,
        versionCode: ANDROID_DOWNLOAD.versionCode,
      });
      setState("available");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The update could not be downloaded. Try again.",
      );
      setState("error");
    }
  }

  return (
    <section className={`${styles.card} ${settingsStyles.preferences}`} aria-label="App update">
      <div className={settingsStyles.sectionTitle}>
        <div>
          <p className={styles.eyebrow}>ANDROID APP</p>
          <h2>App update</h2>
        </div>
        <Download aria-hidden="true" />
      </div>
      <p className={settingsStyles.appearanceHint}>
        Website installs can update to {ANDROID_DOWNLOAD.versionName} (
        {ANDROID_DOWNLOAD.versionCode}) from inside KAILA.
      </p>
      {state === "loading" && (
        <p className={settingsStyles.appearanceStatus}>Checking for updates…</p>
      )}
      {state === "current" && installed && (
        <div className={settingsStyles.protected}>
          <RefreshCw aria-hidden="true" />
          <div>
            <strong>You’re on {installed.version}</strong>
            <p>
              Build {installed.build} matches the latest website release (
              {ANDROID_DOWNLOAD.versionName}).
            </p>
          </div>
        </div>
      )}
      {state === "available" && installed && (
        <Feedback kind="info" title={`Version ${ANDROID_DOWNLOAD.versionName} is available`}>
          You are on {installed.version} ({installed.build}). Download and install the update
          without leaving the app.
        </Feedback>
      )}
      {(state === "error" || error) && (
        <Feedback kind="error" title="Update check failed">
          {error || "Something went wrong while checking for updates."}
        </Feedback>
      )}
      {state === "updating" && (
        <Feedback kind="info" title="Downloading update">
          Keep KAILA open. Android will ask you to confirm the install when the download finishes.
        </Feedback>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Button
          disabled={state === "loading" || state === "updating"}
          onClick={() => void check()}
          variant="secondary"
        >
          Check for updates
        </Button>
        {(state === "available" || state === "error") && (
          <Button onClick={() => void startUpdate()}>
            Download update
          </Button>
        )}
        {state === "updating" && (
          <Button disabled isLoading>
            Downloading…
          </Button>
        )}
      </div>
    </section>
  );
}
