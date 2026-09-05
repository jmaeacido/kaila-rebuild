"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Feedback } from "@kaila/ui";
import {
  addAndroidAppActiveListener,
  downloadAndInstallApk,
  getInstalledAndroidAppInfo,
  nativeApkUpdateAvailable,
  type InstalledAndroidAppInfo,
} from "@kaila/mobile/apk-update";
import { ActionModal } from "../components/action-modal";
import {
  ANDROID_APK_DOWNLOAD_URL,
  ANDROID_DOWNLOAD,
} from "./android-download";
import {
  isAndroidUpdateAvailable,
  isAndroidUpdateSuppressed,
  suppressAndroidUpdate,
} from "./android-update";

type PromptState = "idle" | "open" | "updating" | "error";

export function AndroidUpdatePrompt() {
  const [installed, setInstalled] = useState<InstalledAndroidAppInfo | null>(null);
  const [state, setState] = useState<PromptState>("idle");
  const [error, setError] = useState("");

  const evaluate = useCallback(async (force = false) => {
    if (!nativeApkUpdateAvailable()) return;
    const info = await getInstalledAndroidAppInfo();
    setInstalled(info);
    if (!isAndroidUpdateAvailable(info, ANDROID_DOWNLOAD)) {
      setState("idle");
      return;
    }
    if (!force && isAndroidUpdateSuppressed(ANDROID_DOWNLOAD.versionCode)) {
      setState("idle");
      return;
    }
    setError("");
    setState("open");
  }, []);

  useEffect(() => {
    if (!nativeApkUpdateAvailable()) return;
    const initial = window.setTimeout(() => {
      void evaluate();
    }, 0);
    const remove = addAndroidAppActiveListener(() => {
      void evaluate();
    });
    return () => {
      window.clearTimeout(initial);
      remove();
    };
  }, [evaluate]);

  async function startUpdate() {
    setState("updating");
    setError("");
    try {
      await downloadAndInstallApk({
        url: ANDROID_APK_DOWNLOAD_URL,
        versionCode: ANDROID_DOWNLOAD.versionCode,
      });
      setState("open");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The update could not be downloaded. Try again.",
      );
      setState("error");
    }
  }

  function dismiss() {
    suppressAndroidUpdate(ANDROID_DOWNLOAD.versionCode);
    setState("idle");
    setError("");
  }

  if (state === "idle" || !installed) return null;

  return (
    <ActionModal
      eyebrow="ANDROID UPDATE"
      title={`Version ${ANDROID_DOWNLOAD.versionName} is ready`}
      onClose={dismiss}
    >
      <p>
        You are on {installed.version} ({installed.build}). Install{" "}
        {ANDROID_DOWNLOAD.versionName} ({ANDROID_DOWNLOAD.versionCode}) to keep
        KAILA current.
      </p>
      {(state === "error" || error) && (
        <Feedback kind="error" title="Update paused">
          {error || "The update could not be started."}
        </Feedback>
      )}
      {state === "updating" ? (
        <Feedback kind="info" title="Downloading update">
          Keep KAILA open while the package downloads. Android will ask you to
          confirm the install.
        </Feedback>
      ) : null}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <Button
          disabled={state === "updating"}
          onClick={() => void startUpdate()}
        >
          {state === "updating" ? "Downloading…" : "Update"}
        </Button>
        <Button
          disabled={state === "updating"}
          onClick={dismiss}
          variant="secondary"
        >
          Later
        </Button>
      </div>
    </ActionModal>
  );
}
