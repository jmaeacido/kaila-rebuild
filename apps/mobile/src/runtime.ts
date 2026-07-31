import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
import { deepLinkRoute, incomingCallRoute, notificationRoute } from "./routes";
import { closeMobileSocialBrowser } from "./oauth";
import { loadSession } from "./session";

type DomainEvent = {
  type?: string;
  data?: {
    contextType?: string;
    contextId?: string;
  };
};

export async function initializeMobileRuntime(options: { apiOrigin: string; appHost: string; navigate(path: string): void; onConnectivity(online: boolean): void }): Promise<() => Promise<void>> {
  if (!Capacitor.isNativePlatform()) return async () => undefined;
  const incomingCall = (event: Event) => {
    const detail = (event as CustomEvent<DomainEvent>).detail;
    const route = detail ? incomingCallRoute(detail) : null;
    if (route) options.navigate(route);
  };
  const authenticatedRealtime = (event: Event) => {
    if ((event as CustomEvent<string>).detail === "connected") {
      void PushNotifications.register();
    }
  };
  window.addEventListener("kaila:domain-event", incomingCall);
  window.addEventListener("kaila:realtime-status", authenticatedRealtime);
  const handles = [
    await App.addListener("appUrlOpen", ({ url }) => {
      const path = deepLinkRoute(url, options.appHost);
      if (!path) return;
      void closeMobileSocialBrowser().catch(() => undefined);
      options.navigate(path);
    }),
    await App.addListener("appStateChange", ({ isActive }) => { if (isActive) void Network.getStatus().then(({ connected }) => options.onConnectivity(connected)); }),
    await Network.addListener("networkStatusChange", ({ connected }) => options.onConnectivity(connected)),
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => options.navigate(notificationRoute(notification.data as Record<string, string | undefined>))),
    await PushNotifications.addListener("registration", async ({ value: token }) => {
      const session = await loadSession();
      const path = session
        ? "/api/v1/auth/mobile/push-devices"
        : "/api/v1/push-devices";
      await fetch(`${options.apiOrigin}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ platform: "android", token }),
      });
    }),
  ];
  const permission = await PushNotifications.checkPermissions();
  const resolved = permission.receive === "prompt" ? await PushNotifications.requestPermissions() : permission;
  if (resolved.receive === "granted") await PushNotifications.register();
  const status = await Network.getStatus();
  options.onConnectivity(status.connected);
  return async () => {
    window.removeEventListener("kaila:domain-event", incomingCall);
    window.removeEventListener("kaila:realtime-status", authenticatedRealtime);
    await Promise.all(handles.map((handle) => handle.remove()));
  };
}
