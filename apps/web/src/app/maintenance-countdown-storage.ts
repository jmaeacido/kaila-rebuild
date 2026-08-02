const MAINTENANCE_COUNTDOWN_KEY = "kaila.maintenanceCountdown";

export const maintenanceCountdownClearName = "kaila:maintenance-countdown-clear";

export type StoredMaintenanceCountdown = {
  eventKey: string;
  title: string;
  body: string;
  scheduledAt: string | null;
  endsAt: number;
};

export function readStoredMaintenanceCountdown(): StoredMaintenanceCountdown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAINTENANCE_COUNTDOWN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMaintenanceCountdown;
    if (!parsed?.endsAt || typeof parsed.endsAt !== "number" || parsed.endsAt <= Date.now()) {
      window.localStorage.removeItem(MAINTENANCE_COUNTDOWN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredMaintenanceCountdown(value: StoredMaintenanceCountdown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAINTENANCE_COUNTDOWN_KEY, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; poll/realtime still restores the toast.
  }
}

export function clearStoredMaintenanceCountdown(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MAINTENANCE_COUNTDOWN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function notifyMaintenanceCountdownCleared(): void {
  clearStoredMaintenanceCountdown();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(maintenanceCountdownClearName));
  }
}
