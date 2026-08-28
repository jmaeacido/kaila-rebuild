"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { isPublicPath, normalizePublicPath } from "./public-routes";

export type DomainEvent = {
  eventId: string;
  type: string;
  occurredAt: string;
  resourceType: string;
  resourceId: string;
  version: number;
  data: Record<string, unknown>;
};

export const domainEventName = "kaila:domain-event";
export const realtimeReconcileName = "kaila:realtime-reconcile";
export const realtimeStatusName = "kaila:realtime-status";
export const realtimeAuthChangedName = "kaila:realtime-auth-changed";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

let latestRealtimeStatus: RealtimeStatus = "disconnected";

export function getRealtimeStatus(): RealtimeStatus {
  return latestRealtimeStatus;
}

type TicketResponse = { data: { ticket: string } };

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const seenEventIds = useRef(new Set<string>());
  const isPublic = isPublicPath(normalizePublicPath(pathname));

  useEffect(() => {
    const publishStatus = (status: RealtimeStatus) => {
      latestRealtimeStatus = status;
      window.dispatchEvent(
        new CustomEvent<RealtimeStatus>(realtimeStatusName, { detail: status }),
      );
    };

    if (isPublic) {
      publishStatus("disconnected");
      return;
    }

    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL
      || (process.env.NODE_ENV === "development"
        ? `${window.location.protocol}//${window.location.hostname}:3100`
        : window.location.origin);

    let socket: Socket | null = null;
    let retryTimer: number | null = null;
    let retryAttempt = 0;
    let disposed = false;

    const disconnectCleanly = (target: Socket | null) => {
      if (!target) return;
      target.removeAllListeners();
      target.disconnect();
    };

    const scheduleReconnect = (minimumDelay = 1_000) => {
      if (disposed || retryTimer !== null) return;
      publishStatus("disconnected");
      const exponentialDelay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
      const jitter = Math.floor(Math.random() * 500);
      const delay = Math.max(minimumDelay, exponentialDelay) + jitter;
      retryAttempt = Math.min(retryAttempt + 1, 5);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      disconnectCleanly(socket);
      socket = null;
      publishStatus("connecting");
      try {
        const response = await fetch("/api/v1/realtime/ticket", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!response.ok || disposed) {
          scheduleReconnect(response.status === 401 ? 30_000 : 2_000);
          return;
        }
        const { data } = (await response.json()) as TicketResponse;
        const nextSocket = io(realtimeUrl, {
          auth: { ticket: data.ticket },
          reconnection: false,
          transports: ["polling", "websocket"],
          timeout: 10_000,
        });
        socket = nextSocket;
        nextSocket.on("connect", () => {
          retryAttempt = 0;
          publishStatus("connected");
          window.dispatchEvent(new Event(realtimeReconcileName));
        });
        nextSocket.on("domain.event", (event: DomainEvent, acknowledge?: () => void) => {
          acknowledge?.();
          if (!event?.eventId || seenEventIds.current.has(event.eventId)) return;
          seenEventIds.current.add(event.eventId);
          if (seenEventIds.current.size > 500) {
            const oldest = seenEventIds.current.values().next().value;
            if (oldest) seenEventIds.current.delete(oldest);
          }
          window.dispatchEvent(new CustomEvent<DomainEvent>(domainEventName, { detail: event }));
        });
        nextSocket.on("disconnect", () => scheduleReconnect());
        nextSocket.on("connect_error", () => {
          disconnectCleanly(nextSocket);
          scheduleReconnect(2_000);
        });
      } catch {
        scheduleReconnect(2_000);
      }
    };

    const recover = () => {
      if (document.visibilityState !== "visible") return;
      if (!socket || !socket.connected) {
        if (retryTimer !== null) {
          window.clearTimeout(retryTimer);
          retryTimer = null;
        }
        retryAttempt = 0;
        void connect();
      }
      window.dispatchEvent(new Event(realtimeReconcileName));
    };
    const authChanged = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail === false) {
        if (retryTimer !== null) {
          window.clearTimeout(retryTimer);
          retryTimer = null;
        }
        disconnectCleanly(socket);
        socket = null;
        publishStatus("disconnected");
        return;
      }
      recover();
    };
    window.addEventListener("online", recover);
    window.addEventListener("focus", recover);
    window.addEventListener(realtimeAuthChangedName, authChanged);
    document.addEventListener("visibilitychange", recover);
    void connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("online", recover);
      window.removeEventListener("focus", recover);
      window.removeEventListener(realtimeAuthChangedName, authChanged);
      document.removeEventListener("visibilitychange", recover);
      disconnectCleanly(socket);
      publishStatus("disconnected");
    };
  }, [isPublic]);

  return children;
}
