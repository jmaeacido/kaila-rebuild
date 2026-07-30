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

type TicketResponse = { data: { ticket: string } };

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL || window.location.origin;

    let socket: Socket | null = null;
    let retryTimer: number | null = null;
    let disposed = false;

    const disconnectCleanly = (target: Socket | null) => {
      if (!target) return;
      if (target.connected) {
        target.disconnect();
        return;
      }
      target.once("connect", () => target.disconnect());
    };

    const scheduleReconnect = (delay: number) => {
      if (disposed || retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      disconnectCleanly(socket);
      socket = null;
      try {
        const response = await fetch("/api/v1/realtime/ticket", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!response.ok || disposed) {
          scheduleReconnect(response.status === 401 ? 30_000 : 5_000);
          return;
        }
        const { data } = (await response.json()) as TicketResponse;
        const nextSocket = io(realtimeUrl, {
          auth: { ticket: data.ticket },
          reconnection: false,
          transports: ["websocket"],
        });
        socket = nextSocket;
        nextSocket.on("connect", () => {
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
        nextSocket.on("disconnect", () => scheduleReconnect(2_000));
        nextSocket.on("connect_error", () => {
          nextSocket.disconnect();
          scheduleReconnect(5_000);
        });
      } catch {
        scheduleReconnect(5_000);
      }
    };

    const recover = () => {
      if (document.visibilityState === "visible" && (!socket || !socket.connected)) void connect();
      window.dispatchEvent(new Event(realtimeReconcileName));
    };
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    void connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", recover);
      disconnectCleanly(socket);
    };
  }, []);

  return children;
}
