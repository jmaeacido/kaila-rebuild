"use client";

import { useEffect } from "react";

export const adminRealtimeEvent = "kaila:admin-realtime";

export type AdminRealtimeDetail = {
  type: string;
  resourceType?: string;
  resourceId?: string;
};

export function publishAdminRealtime(detail: AdminRealtimeDetail): void {
  window.dispatchEvent(new CustomEvent<AdminRealtimeDetail>(adminRealtimeEvent, { detail }));
}

export function useAdminRealtimeRefresh(refresh: () => void | Promise<void>): void {
  useEffect(() => {
    let timer: number | undefined;
    const reconcile = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 100);
    };
    window.addEventListener(adminRealtimeEvent, reconcile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(adminRealtimeEvent, reconcile);
    };
  }, [refresh]);
}
