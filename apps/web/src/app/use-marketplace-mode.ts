"use client";

import { useCallback, useEffect, useState } from "react";

export type MarketplaceMode = {
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
  isProvider: boolean;
  ready: boolean;
};

export function useMarketplaceMode(): MarketplaceMode {
  const [mode, setMode] = useState<MarketplaceMode>({
    activeMode: null,
    providerEligible: false,
    isProvider: false,
    ready: false,
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/me", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const data = ((await response.json()) as { data: { activeMode: "client" | "provider" | null; providerEligible: boolean } }).data;
      const isProvider = data.activeMode === "provider" && data.providerEligible;
      setMode({
        activeMode: data.activeMode,
        providerEligible: data.providerEligible,
        isProvider,
        ready: true,
      });
    } catch {
      setMode((current) => ({ ...current, ready: true }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const reconcile = () => void load();
    window.addEventListener("online", reconcile);
    window.addEventListener("kaila:domain-event", reconcile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("kaila:domain-event", reconcile);
    };
  }, [load]);

  return mode;
}
