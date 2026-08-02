"use client";

import { useEffect, useState } from "react";

export type HiredRouteEstimate = {
  distanceMeters: number;
  etaSeconds: number;
};

export function useHiredRouteEstimate(jobId: string, enabled: boolean): HiredRouteEstimate | null {
  const [estimate, setEstimate] = useState<HiredRouteEstimate | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }
    let active = true;
    let controller: AbortController | null = null;
    let lastRequestedAt = 0;
    const requestEstimate = (position: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastRequestedAt < 5_000) return;
      lastRequestedAt = now;
      controller?.abort();
      controller = new AbortController();
      void fetch(`/api/v1/jobs/${jobId}/travel/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }).then(async (response) => {
          if (!response.ok || !active) return;
          const body = (await response.json()) as { data: HiredRouteEstimate };
          if (active) setEstimate(body.data);
        }).catch(() => undefined);
    };
    const watchId = navigator.geolocation.watchPosition(
      requestEstimate,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    return () => {
      active = false;
      controller?.abort();
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, jobId]);

  return estimate;
}
