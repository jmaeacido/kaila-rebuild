"use client";

import { useEffect } from "react";

type DomainEvent = {
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
};

type TicketResponse = {
  data: {
    ticket: string;
    expiresAt: string;
  };
};

type RealtimeSocket = {
  on(event: "domain.event", listener: (payload: DomainEvent) => void): void;
  on(event: "disconnect", listener: () => void): void;
  disconnect(): void;
};

type SocketFactory = (
  url: string,
  options: {
    auth: { ticket: string };
    reconnection: boolean;
    transports: string[];
  },
) => RealtimeSocket;

declare global {
  interface Window {
    io?: SocketFactory;
  }
}

function loadSocketClient(realtimeUrl: string): Promise<SocketFactory> {
  if (window.io) return Promise.resolve(window.io);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-kaila-realtime-client]");
    const script = existing ?? document.createElement("script");
    const ready = () => window.io ? resolve(window.io) : reject(new Error("Realtime client unavailable"));
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => reject(new Error("Realtime client failed to load")), { once: true });
    if (!existing) {
      script.src = new URL("/socket.io/socket.io.js", realtimeUrl).toString();
      script.async = true;
      script.dataset.kailaRealtimeClient = "true";
      document.head.append(script);
    }
  });
}

export function useJobRealtime(jobId: string, refresh: () => void) {
  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    if (!realtimeUrl) return;

    let socket: RealtimeSocket | null = null;
    let retryTimer: number | null = null;
    let disposed = false;

    const connect = async () => {
      try {
        const [socketFactory, response] = await Promise.all([
          loadSocketClient(realtimeUrl),
          fetch("/api/v1/realtime/ticket", {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        ]);
        if (!response.ok || disposed) return;
        const { data } = (await response.json()) as TicketResponse;
        socket = socketFactory(realtimeUrl, {
          auth: { ticket: data.ticket },
          reconnection: false,
          transports: ["websocket"],
        });
        socket.on("domain.event", (event) => {
          if (
            (event.resourceId === jobId && event.resourceType === "service_job") ||
            event.data.jobId === jobId
          ) {
            refresh();
          }
        });
        socket.on("disconnect", () => {
          if (!disposed) retryTimer = window.setTimeout(() => void connect(), 2_000);
        });
      } catch {
        if (!disposed) retryTimer = window.setTimeout(() => void connect(), 5_000);
      }
    };

    void connect();
    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.disconnect();
    };
  }, [jobId, refresh]);
}
