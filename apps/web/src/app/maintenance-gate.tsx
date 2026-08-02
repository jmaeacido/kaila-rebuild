"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { notifyMaintenanceCountdownCleared } from "./maintenance-countdown-storage";
import {
  domainEventName,
  realtimeAuthChangedName,
  realtimeStatusName,
  type DomainEvent,
  type RealtimeStatus,
} from "./realtime-provider";

type MaintenanceStatus = {
  phase: string;
  enabled: boolean;
  message: string | null;
  secondsRemaining: number | null;
  scheduledAt: string | null;
  countdownSeconds: number | null;
};

/**
 * Keeps every consumer shell (including public landing and auth pages) aligned
 * with platform maintenance: redirects when active, and synthesizes the pinned
 * countdown toast when a scheduled window is already in progress.
 */
export function MaintenanceGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/status/") || pathname === "/maintenance") return;

    let active = true;

    const applyStatus = (data: MaintenanceStatus) => {
      if (data.phase === "active" || data.enabled) {
        notifyMaintenanceCountdownCleared();
        router.replace("/maintenance");
        return;
      }
      if (data.phase !== "scheduled" || !data.scheduledAt) {
        notifyMaintenanceCountdownCleared();
        return;
      }

      const secondsRemaining = typeof data.secondsRemaining === "number"
        ? data.secondsRemaining
        : Math.max(0, Math.ceil((Date.parse(data.scheduledAt) - Date.now()) / 1000));
      if (!Number.isFinite(secondsRemaining) || secondsRemaining <= 0) {
        notifyMaintenanceCountdownCleared();
        return;
      }

      const event: DomainEvent = {
        eventId: `maintenance-poll-${data.scheduledAt}`,
        type: "platform.maintenance.scheduled",
        occurredAt: new Date().toISOString(),
        resourceType: "platform_maintenance",
        resourceId: "current",
        version: Math.max(0, Math.floor(Date.parse(data.scheduledAt) / 1000)),
        data: {
          phase: "scheduled",
          message: data.message,
          countdownSeconds: data.countdownSeconds ?? secondsRemaining,
          secondsRemaining,
          scheduledAt: data.scheduledAt,
        },
      };
      window.dispatchEvent(new CustomEvent<DomainEvent>(domainEventName, { detail: event }));
    };

    const load = () => {
      void fetch("/api/v1/platform/maintenance", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return ((await response.json()) as { data: MaintenanceStatus }).data;
        })
        .then((data) => {
          if (!active || !data) return;
          applyStatus(data);
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, 10_000);

    const onAuthChanged = () => load();
    const onRealtimeStatus = (event: Event) => {
      const status = (event as CustomEvent<RealtimeStatus>).detail;
      if (status === "connected") load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener(realtimeAuthChangedName, onAuthChanged);
    window.addEventListener(realtimeStatusName, onRealtimeStatus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(realtimeAuthChangedName, onAuthChanged);
      window.removeEventListener(realtimeStatusName, onRealtimeStatus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, router]);

  return null;
}
