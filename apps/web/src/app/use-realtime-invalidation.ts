"use client";

import { useEffect, useRef } from "react";
import {
  domainEventName,
  realtimeReconcileName,
  type DomainEvent,
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
    window.addEventListener(domainEventName, domainEvent);
    window.addEventListener(realtimeReconcileName, reconcile);
    window.addEventListener("online", reconcile);
    return () => {
      if (pending !== null) window.clearTimeout(pending);
      window.removeEventListener(domainEventName, domainEvent);
      window.removeEventListener(realtimeReconcileName, reconcile);
      window.removeEventListener("online", reconcile);
    };
  }, []);
}
