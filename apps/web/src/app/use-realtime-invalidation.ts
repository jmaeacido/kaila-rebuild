"use client";

import { useEffect, useRef } from "react";
import {
  domainEventName,
  getRealtimeStatus,
  realtimeReconcileName,
  realtimeStatusName,
  type DomainEvent,
  type RealtimeStatus,
} from "./realtime-provider";

export function useRealtimeInvalidation(
  refresh: () => void,
  matches: (event: DomainEvent) => boolean = () => true,
) {
  const refreshRef = useRef(refresh);
  const matchesRef = useRef(matches);

  useEffect(() => {
    refreshRef.current = refresh;
    matchesRef.current = matches;
  });

  useEffect(() => {
    let pending: number | null = null;
    let realtimeConnected = getRealtimeStatus() === "connected";
    const reconcile = () => {
      if (pending !== null) return;
      pending = window.setTimeout(() => {
        pending = null;
        refreshRef.current();
      }, 100);
    };
    const domainEvent = (event: Event) => {
      const detail = (event as CustomEvent<DomainEvent>).detail;
      if (detail && matchesRef.current(detail)) reconcile();
    };
    const statusChanged = (event: Event) => {
      realtimeConnected = (event as CustomEvent<RealtimeStatus>).detail === "connected";
    };
    window.addEventListener(domainEventName, domainEvent);
    window.addEventListener(realtimeReconcileName, reconcile);
    window.addEventListener(realtimeStatusName, statusChanged);
    window.addEventListener("online", reconcile);
    window.addEventListener("focus", reconcile);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !realtimeConnected) reconcile();
    }, 10_000);
    return () => {
      if (pending !== null) window.clearTimeout(pending);
      window.clearInterval(interval);
      window.removeEventListener(domainEventName, domainEvent);
      window.removeEventListener(realtimeReconcileName, reconcile);
      window.removeEventListener(realtimeStatusName, statusChanged);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("focus", reconcile);
    };
  }, []);
}
