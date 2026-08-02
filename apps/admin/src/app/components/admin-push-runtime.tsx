"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminNotificationRoute } from "../admin-notification-routes";

const deviceStorageKey = "kaila-admin-push-device-id";

export async function revokeAdminPushDevice(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  const deviceId = localStorage.getItem(deviceStorageKey);
  if (!deviceId) return;
  const csrf = await csrfToken();
  const response = await fetch(`/api/v1/push-devices/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json", ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}) },
  });
  if (response.ok || response.status === 404) localStorage.removeItem(deviceStorageKey);
}

async function csrfToken(): Promise<string | undefined> {
  await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const value = document.cookie.split("; ").find((cookie) => cookie.startsWith("XSRF-TOKEN="))?.split("=")[1];
  return value ? decodeURIComponent(value) : undefined;
}

export function AdminPushRuntime() {
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    const handles: Array<{ remove(): Promise<void> }> = [];

    const register = async () => {
      await PushNotifications.createChannel({
        id: "kaila_admin_actions_v1",
        name: "Admin actions",
        description: "Reviews, approvals, reports, disputes, and support requests requiring attention",
        importance: 5,
        visibility: 0,
        vibration: true,
      });
      const permission = await PushNotifications.checkPermissions();
      const resolved = permission.receive === "prompt" ? await PushNotifications.requestPermissions() : permission;
      if (resolved.receive === "granted" && !disposed) await PushNotifications.register();
    };

    void (async () => {
      handles.push(
        await PushNotifications.addListener("registration", async ({ value: token }) => {
          const csrf = await csrfToken();
          const response = await fetch("/api/v1/push-devices", {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}),
            },
            body: JSON.stringify({ platform: "admin_android", token }),
          });
          if (response.ok) {
            const body = (await response.json()) as { data?: { id?: string } };
            if (body.data?.id) localStorage.setItem(deviceStorageKey, body.data.id);
          }
        }),
        await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          router.push(adminNotificationRoute(notification.data as Record<string, string | undefined>));
          router.refresh();
        }),
        await PushNotifications.addListener("pushNotificationReceived", () => router.refresh()),
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void register();
        }),
      );
      const requestRegistration = () => void register();
      window.addEventListener("kaila:admin-authenticated", requestRegistration);
      handles.push({ remove: async () => window.removeEventListener("kaila:admin-authenticated", requestRegistration) });
      await register();
    })();

    return () => {
      disposed = true;
      void Promise.all(handles.map((handle) => handle.remove()));
    };
  }, [router]);

  return null;
}
