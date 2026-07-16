import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
import { deepLinkRoute, notificationRoute } from "./routes";
import { loadSession } from "./session";

export async function initializeMobileRuntime(options: { apiOrigin: string; appHost: string; navigate(path: string): void; onConnectivity(online: boolean): void }): Promise<() => Promise<void>> {
  if (!Capacitor.isNativePlatform()) return async () => undefined;
  const handles = [
    await App.addListener("appUrlOpen", ({ url }) => { const path = deepLinkRoute(url, options.appHost); if (path) options.navigate(path); }),
    await App.addListener("appStateChange", ({ isActive }) => { if (isActive) void Network.getStatus().then(({ connected }) => options.onConnectivity(connected)); }),
    await Network.addListener("networkStatusChange", ({ connected }) => options.onConnectivity(connected)),
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => options.navigate(notificationRoute(notification.data as Record<string, string | undefined>))),
    await PushNotifications.addListener("registration", async ({ value: token }) => {
      const session = await loadSession();
      if (!session) return;
      await fetch(`${options.apiOrigin}/api/v1/auth/mobile/push-devices`, { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ platform: "android", token }) });
    }),
  ];
  const permission = await PushNotifications.checkPermissions();
  const resolved = permission.receive === "prompt" ? await PushNotifications.requestPermissions() : permission;
  if (resolved.receive === "granted") await PushNotifications.register();
  const status = await Network.getStatus();
  options.onConnectivity(status.connected);
  return async () => { await Promise.all(handles.map((handle) => handle.remove())); };
}
