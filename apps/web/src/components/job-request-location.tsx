"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import styles from "./job-request-location.module.css";

type Point = { latitude: number; longitude: number };

export function JobRequestLocation({ address, location }: { address: string; location: Point | null }) {
  const [distance, setDistance] = useState<string>(location ? "Checking your distance…" : "Distance unavailable");

  useEffect(() => {
    if (!location || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setDistance(formatDistance(haversineKilometres({ latitude: coords.latitude, longitude: coords.longitude }, location))),
      () => setDistance("Enable location to calculate distance"),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }, [location]);

  return (
    <div className={styles.location}>
      <p><MapPin aria-hidden="true" /><span><small>Approximate address</small><strong>{address}</strong></span></p>
      <p><Navigation aria-hidden="true" /><span><small>Distance from you</small><strong>{distance}</strong></span></p>
    </div>
  );
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
