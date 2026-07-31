"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

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

type TicketResponse = { data: { ticket: string } };

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL || window.location.origin;

    let socket: Socket | null = null;
    let retryTimer: number | null = null;
    let retryAttempt = 0;
    let disposed = false;

    const publishStatus = (status: RealtimeStatus) => {
      window.dispatchEvent(
        new CustomEvent<RealtimeStatus>(realtimeStatusName, { detail: status }),
      );
    };

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
          transports: ["websocket", "polling"],
        });
        socket = nextSocket;
        nextSocket.on("connect", () => {
          retryAttempt = 0;
          publishStatus("connected");
          window.dispatchEvent(new Event(realtimeReconcileName));
        });
        nextSocket.on("domain.event", (event: DomainEvent) => {
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
    window.addEventListener("online", recover);
    window.addEventListener(realtimeAuthChangedName, recover);
    document.addEventListener("visibilitychange", recover);
    void connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("online", recover);
      window.removeEventListener(realtimeAuthChangedName, recover);
      document.removeEventListener("visibilitychange", recover);
      disconnectCleanly(socket);
      publishStatus("disconnected");
    };
  }, []);

  return children;
}
