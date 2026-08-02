import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
import { IncomingCall } from "./incoming-call-plugin";
import { deepLinkRoute, incomingCallRoute, notificationRoute } from "./routes";
import { closeMobileSocialBrowser } from "./oauth";
import { loadSession } from "./session";
import { callStatusEndsMedia, callUpdateDismissesRinging, nativeCallUpdateEndsMedia } from "./call-status";

type DomainEvent = {
  type?: string;
  data?: {
    contextType?: string;
    contextId?: string;
    callId?: string;
    media?: string;
    callerName?: string;
    callerAvatarUrl?: string;
    status?: string;
    action?: string;
  };
};

export async function initializeMobileRuntime(options: {
  apiOrigin: string;
  appHost: string;
  navigate(path: string): void;
  onConnectivity(online: boolean): void;
}): Promise<() => Promise<void>> {
  if (!Capacitor.isNativePlatform()) return async () => undefined;

  const dispatchNativeCall = (detail: Record<string, string | undefined>) => {
    window.dispatchEvent(new CustomEvent("kaila:native-call", { detail }));
  };

  const incomingCall = (event: Event) => {
    const detail = (event as CustomEvent<DomainEvent>).detail;
    const route = detail ? incomingCallRoute(detail) : null;
    if (route) options.navigate(route);
    if (detail?.type === "call.ringing" && detail.data?.callId) {
      dispatchNativeCall({
        callId: detail.data.callId,
        action: "open",
        media: detail.data.media,
        contextType: detail.data.contextType,
        contextId: detail.data.contextId,
        callerName: detail.data.callerName,
        callerAvatarUrl: detail.data.callerAvatarUrl,
      });
    }
    if (detail?.type === "call.status.changed" && callStatusEndsMedia(detail.data?.status)) {
      void IncomingCall.cancelIncoming().catch(() => undefined);
      if (detail.data?.callId) {
        dispatchNativeCall({
          callId: detail.data.callId,
          action: "cancel",
          media: detail.data.media,
          contextType: detail.data.contextType,
          contextId: detail.data.contextId,
        });
      }
    }
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
    await App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      void Network.getStatus().then(({ connected }) => options.onConnectivity(connected));
      window.dispatchEvent(new Event("kaila:realtime-reconcile"));
    }),
    await Network.addListener("networkStatusChange", ({ connected }) => {
      options.onConnectivity(connected);
      if (connected) window.dispatchEvent(new Event("kaila:realtime-reconcile"));
    }),
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const data = notification.data as Record<string, string | undefined>;
      options.navigate(notificationRoute(data));
      window.dispatchEvent(new Event("kaila:realtime-reconcile"));
      if (data.type === "call" && data.callId) {
        if (callUpdateDismissesRinging(data.action, data.status)) {
          void IncomingCall.cancelIncoming().catch(() => undefined);
        }
        if (data.status === "active" || data.action === "dismiss") return;
        dispatchNativeCall({
          callId: data.callId,
          action: nativeCallUpdateEndsMedia(data.action, data.status) ? "cancel" : "open",
          media: data.media,
          contextType: data.contextType,
          contextId: data.contextId,
          callerName: data.callerName,
          callerAvatarUrl: data.callerAvatarUrl,
        });
      }
    }),
    await PushNotifications.addListener("pushNotificationReceived", ({ data }) => {
      const payload = data as Record<string, string | undefined>;
      window.dispatchEvent(new Event("kaila:realtime-reconcile"));
      if (payload.type !== "call" || !payload.callId) return;
      if (callUpdateDismissesRinging(payload.action, payload.status)) {
        void IncomingCall.cancelIncoming().catch(() => undefined);
      }
      if (nativeCallUpdateEndsMedia(payload.action, payload.status)) {
        dispatchNativeCall({
          callId: payload.callId,
          action: "cancel",
          media: payload.media,
          contextType: payload.contextType,
          contextId: payload.contextId,
        });
        return;
      }
      if (payload.status === "active" || payload.action === "dismiss") return;
      dispatchNativeCall({
        callId: payload.callId,
        action: "open",
        media: payload.media,
        contextType: payload.contextType,
        contextId: payload.contextId,
        callerName: payload.callerName,
        callerAvatarUrl: payload.callerAvatarUrl,
      });
      const route = notificationRoute(payload);
      if (route !== "/notifications") options.navigate(route);
    }),
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
