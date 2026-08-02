import { Capacitor, registerPlugin } from "@capacitor/core";

type AdminPushGuardPlugin = {
  isMessagingAvailable(): Promise<{ available: boolean; reason?: string }>;
};

const AdminPushGuard = registerPlugin<AdminPushGuardPlugin>("AdminPushGuard");

/**
 * Capacitor rethrows native PushNotifications.register() failures as a process
 * crash. Only register when the admin APK exposes AdminPushGuard and Firebase
 * Messaging is actually initialized (google-services.json applied).
 */
export async function adminPushMessagingAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  if (!Capacitor.isPluginAvailable("AdminPushGuard")) return false;
  try {
    const result = await AdminPushGuard.isMessagingAvailable();
    return result.available === true;
  } catch {
    return false;
  }
}
