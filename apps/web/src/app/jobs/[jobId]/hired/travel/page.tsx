/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LocateFixed, ShieldCheck, Square } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import styles from "../hired.module.css";
import { LiveTravelMap } from "./live-travel-map";
import { useRealtimeInvalidation } from "../../../../use-realtime-invalidation";

type Point = { latitude: number; longitude: number };
type Travel = {
  status: string;
  canShareLocation: boolean;
  distanceMeters: number | null;
  etaSeconds: number | null;
  arrivedAt: string | null;
  location: Point | null;
  destination: Point | null;
  routeGeometry: Point[] | null;
};

function fallbackMetrics(location: Point | null, destination: Point | null) {
  if (!location || !destination) return { distanceMeters: null, etaSeconds: null };
  const radius = 6_371_000;
  const latitude = (destination.latitude - location.latitude) * Math.PI / 180;
  const longitude = (destination.longitude - location.longitude) * Math.PI / 180;
  const startLatitude = location.latitude * Math.PI / 180;
  const endLatitude = destination.latitude * Math.PI / 180;
  const value = Math.sin(latitude / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitude / 2) ** 2;
  const distanceMeters = Math.round(radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
  return { distanceMeters, etaSeconds: Math.max(60, Math.ceil(distanceMeters / 1000 / 22 * 3600)) };
}

export default function TravelPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [travel, setTravel] = useState<Travel | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "sharing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/travel`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setTravel(((await response.json()) as { data: Travel }).data);
      setState("ready");
    } catch {
      setErrorMessage("Travel details could not be loaded. Check your connection and try again.");
      setState("error");
    }
  }, [jobId]);
  useRealtimeInvalidation(() => void load(), (event) => event.data.jobId === jobId);

  useEffect(() => {
    void load();
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [load]);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    const response = await fetch(`/api/v1/jobs/${jobId}/travel/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: Math.max(1, Math.min(200, Math.round(position.coords.accuracy))),
        capturedAt: new Date(position.timestamp).toISOString(),
        foreground: true,
      }),
    });
    if (!response.ok && response.status !== 409) throw new Error();
    await load();
  }, [jobId, load]);

  const beginLocationWatch = useCallback(() => {
    if (watchId.current !== null || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(position).catch(() => {
        setErrorMessage("Your latest location could not be shared. Check your connection, then retry.");
        setState("error");
      }),
      (error) => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setErrorMessage(error.code === error.PERMISSION_DENIED
          ? "Allow precise location for KAILA in Android Settings, then try again."
          : "Android could not get a current location. Turn on Location and try again.");
        setState("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, [sendPosition]);

  useEffect(() => {
    if (travel?.canShareLocation && travel.status === "active") beginLocationWatch();
  }, [beginLocationWatch, travel?.canShareLocation, travel?.status]);

  async function start() {
    setState("sharing");
    if (!navigator.geolocation) {
      setErrorMessage("Live location is not supported on this device.");
      setState("error");
      return;
    }
    let initialPosition: GeolocationPosition;
    try {
      initialPosition = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }));
    } catch {
      setErrorMessage("Allow precise location for KAILA and turn on Android Location, then try again.");
      setState("error");
      return;
    }
    const response = await fetch(`/api/v1/jobs/${jobId}/travel/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentConfirmed: true, foreground: true }),
    });
    if (!response.ok) {
      setState("error");
      return;
    }
    await sendPosition(initialPosition);
    beginLocationWatch();
    await load();
  }

  async function stop() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    await fetch(`/api/v1/jobs/${jobId}/travel/stop`, { method: "POST" });
    await load();
  }

  const estimated = fallbackMetrics(travel?.location ?? null, travel?.destination ?? null);
  const distanceMeters = travel?.distanceMeters ?? estimated.distanceMeters;
  const etaSeconds = travel?.etaSeconds ?? estimated.etaSeconds;

  return (
    <main className={styles.shell}>
      <header className={styles.top}>
        <a href={`/jobs/${jobId}`} aria-label="Back to job"><ArrowLeft /></a>
        <div>
          <h1>{travel?.canShareLocation ? "Share job travel" : "Provider travel"}</h1>
          <p>{travel?.arrivedAt ? "Provider has arrived" : travel?.status === "active" ? "Provider is on the way" : "Live sharing is off"}</p>
        </div>
      </header>
      {state === "error" && <Feedback kind="error" title={travel ? "Live location needs attention" : "Live map is unavailable"}>{errorMessage || "You can still coordinate in chat. Try again in the foreground."}</Feedback>}
      <section className={styles.map}>
        <LiveTravelMap location={travel?.location ?? null} destination={travel?.destination ?? null} route={travel?.routeGeometry ?? null} />
        <div className={styles.stats}>
          <div><span>ETA</span><strong>{etaSeconds ? `${Math.ceil(etaSeconds / 60)} min` : "Waiting for provider"}</strong></div>
          <div><span>Distance</span><strong>{distanceMeters != null ? distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m` : "Waiting for provider"}</strong></div>
        </div>
        <div className={styles.notice}><ShieldCheck /><p>Live sharing resumes whenever the provider returns to this travel screen. Exact location is limited to job participants and raw samples expire after 24 hours.</p></div>
        <div className={styles.actions}>
          {travel?.canShareLocation && (travel.status === "active"
            ? <Button variant="secondary" onClick={() => void stop()}><Square />Stop sharing</Button>
            : <Button disabled={state === "sharing"} onClick={() => void start()}><LocateFixed />{state === "sharing" ? "Starting…" : "Start foreground sharing"}</Button>)}
          {!travel?.canShareLocation && travel?.status !== "active" && <p>Location will appear here when the provider starts traveling.</p>}
          <Button variant="secondary" onClick={() => { setErrorMessage(""); void load(); if (travel?.canShareLocation && travel.status === "active") beginLocationWatch(); }}>Retry live map</Button>
        </div>
      </section>
    </main>
  );
}
