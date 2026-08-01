"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import styles from "./job-request-location.module.css";
import { prepareCsrf } from "../app/auth-client";

type Point = { latitude: number; longitude: number };
type RouteMetrics = { distance: string; eta: string };

export function JobRequestLocation({ opportunityId, address, location }: { opportunityId: number; address: string; location: Point | null }) {
  const metrics = useOpportunityRouteEstimate(opportunityId, location);

  return (
    <div className={styles.location}>
      <p><MapPin aria-hidden="true" /><span><small>Approximate address</small><strong>{address}</strong></span></p>
      <p><Navigation aria-hidden="true" /><span><small>Distance from you</small><strong>{metrics.distance}</strong></span></p>
    </div>
  );
}

export function OpportunityRouteMetrics({ opportunityId, location }: { opportunityId: number; location: Point | null }) {
  const metrics = useOpportunityRouteEstimate(opportunityId, location);
  return <span>{metrics.distance} · {metrics.eta}</span>;
}

function useOpportunityRouteEstimate(opportunityId: number, location: Point | null): RouteMetrics {
  const [metrics, setMetrics] = useState<RouteMetrics>(location
    ? { distance: "Calculating distance…", eta: "Calculating ETA…" }
    : { distance: "Distance unavailable", eta: "ETA unavailable" });

  useEffect(() => {
    if (!location || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const origin = { latitude: coords.latitude, longitude: coords.longitude };
        try {
          const token = await prepareCsrf();
          const response = await fetch(`/api/v1/opportunities/${opportunityId}/route-estimate`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
            body: JSON.stringify(origin),
          });
          if (!response.ok) throw new Error();
          const body = await response.json() as { data: { distanceMeters: number; durationSeconds: number } };
          setMetrics({
            distance: `${formatDistance(body.data.distanceMeters / 1000)} driving`,
            eta: formatEta(body.data.durationSeconds),
          });
        } catch {
          setMetrics({ distance: `${formatDistance(haversineKilometres(origin, location))} straight line`, eta: "ETA unavailable" });
        }
      },
      () => setMetrics({ distance: "Enable location for distance", eta: "ETA unavailable" }),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }, [location, opportunityId]);

  return metrics;
}

export function haversineKilometres(origin: Point, destination: Point): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const startLatitude = radians(origin.latitude);
  const endLatitude = radians(destination.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(kilometres: number): string {
  return kilometres < 1 ? `${Math.max(1, Math.round(kilometres * 1000))} m away` : `${kilometres.toFixed(1)} km away`;
}

function formatEta(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes < 60 ? `${minutes} min ETA` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min ETA`;
}
