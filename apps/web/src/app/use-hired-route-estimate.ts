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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetch(`/api/v1/jobs/${jobId}/travel/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }).then(async (response) => {
          if (!response.ok || !active) return;
          const body = (await response.json()) as { data: HiredRouteEstimate };
          if (active) setEstimate(body.data);
        }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
    return () => { active = false; };
  }, [enabled, jobId]);

  return estimate;
}
