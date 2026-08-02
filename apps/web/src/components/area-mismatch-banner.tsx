"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { areaName, cityIdForArea, type AreaReference } from "../app/address-hierarchy";
import styles from "./area-mismatch-banner.module.css";

type ProfilePayload = {
  activeMode: "client" | "provider" | null;
  client: { area_id: number | null } | null;
  provider: { serviceAreas: Array<{ id: number; name: string; type?: string }> } | null;
};

type ResolvedLocation = {
  id: number;
  name: string;
  cityId: number | null;
  cityName: string | null;
};

type Warning = {
  title: string;
  body: string;
  href: string;
  actionLabel: string;
  dismissKey: string;
};

const DISMISS_PREFIX = "kaila.areaMismatch.";

function readDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string): void {
  try {
    window.sessionStorage.setItem(DISMISS_PREFIX + key, "1");
  } catch {
    // Private mode still allows in-memory dismiss via state.
  }
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 5 * 60_000,
      timeout: 12_000,
    });
  });
}

export function AreaMismatchBanner() {
  const [warning, setWarning] = useState<Warning | null>(null);

  useEffect(() => {
    let active = true;

    const evaluate = async () => {
      try {
        const [profileResponse, referenceResponse] = await Promise.all([
          fetch("/api/v1/me/marketplace-profile", { credentials: "include", cache: "no-store" }),
          fetch("/api/v1/marketplace/reference-data", { credentials: "include", cache: "no-store" }),
        ]);
        if (!profileResponse.ok || !referenceResponse.ok) return;

        const profile = ((await profileResponse.json()) as { data: ProfilePayload }).data;
        const areas = ((await referenceResponse.json()) as { data: { areas: AreaReference[] } }).data.areas;
        const isProvider = profile.activeMode === "provider" && Boolean(profile.provider);

        const homeCityIds = new Set<number>();
        const homeLabels: string[] = [];
        if (isProvider) {
          for (const serviceArea of profile.provider?.serviceAreas ?? []) {
            const cityId = cityIdForArea(areas, serviceArea.id);
            if (cityId == null || homeCityIds.has(cityId)) continue;
            homeCityIds.add(cityId);
            const label = areaName(areas, cityId);
            if (label) homeLabels.push(label);
          }
        } else {
          const cityId = cityIdForArea(areas, profile.client?.area_id);
          if (cityId != null) {
            homeCityIds.add(cityId);
            const label = areaName(areas, cityId);
            if (label) homeLabels.push(label);
          }
        }

        if (homeCityIds.size === 0) return;

        const position = await readPosition();
        if (!active) return;

        const resolveResponse = await fetch(
          `/api/v1/jobs/resolve-area?latitude=${encodeURIComponent(String(position.coords.latitude))}&longitude=${encodeURIComponent(String(position.coords.longitude))}`,
          { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } },
        );
        if (!resolveResponse.ok) return;

        const resolved = ((await resolveResponse.json()) as { data: ResolvedLocation }).data;
        if (!active || resolved.cityId == null) return;
        if (homeCityIds.has(resolved.cityId)) return;

        const dismissKey = `${isProvider ? "provider" : "client"}:${[...homeCityIds].sort().join("-")}:${resolved.cityId}`;
        if (readDismissed(dismissKey)) return;

        const currentCity = resolved.cityName || resolved.name;
        const homeCity = homeLabels.length === 1
          ? homeLabels[0]
          : homeLabels.slice(0, 2).join(", ") + (homeLabels.length > 2 ? ", and more" : "");

        setWarning(isProvider
          ? {
            title: "You're outside your coverage area",
            body: `You're in ${currentCity}, but your service coverage is set for ${homeCity}. Nearby job matches follow your coverage area.`,
            href: "/provider-profile",
            actionLabel: "Update coverage",
            dismissKey,
          }
          : {
            title: "You're away from your home area",
            body: `You're in ${currentCity}, but your home area is in ${homeCity}. Nearby help works best when your home area matches where you are.`,
            href: "/account",
            actionLabel: "Update home area",
            dismissKey,
          });
      } catch {
        // Permission denied, unsupported pin, or offline — stay quiet.
      }
    };

    const timer = window.setTimeout(() => void evaluate(), 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (!warning) return null;

  return (
    <aside className={styles.banner} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true"><MapPin /></span>
      <div className={styles.copy}>
        <strong>{warning.title}</strong>
        <p>{warning.body}</p>
        <Link href={warning.href}>{warning.actionLabel}</Link>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss area warning"
        onClick={() => {
          writeDismissed(warning.dismissKey);
          setWarning(null);
        }}
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
