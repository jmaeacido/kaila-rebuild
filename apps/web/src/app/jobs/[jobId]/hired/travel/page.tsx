/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LocateFixed, ShieldCheck, Square } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import styles from "../hired.module.css";
import { LiveTravelMap } from "./live-travel-map";

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

export default function TravelPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [travel, setTravel] = useState<Travel | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "sharing" | "error">("loading");
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/travel`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setTravel(((await response.json()) as { data: Travel }).data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [jobId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearInterval(timer);
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
      (position) => void sendPosition(position).catch(() => setState("error")),
      () => setState("error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, [sendPosition]);

  useEffect(() => {
    if (travel?.canShareLocation && travel.status === "active") beginLocationWatch();
  }, [beginLocationWatch, travel?.canShareLocation, travel?.status]);

  async function start() {
    setState("sharing");
    if (!navigator.geolocation) {
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

  return (
    <main className={styles.shell}>
      <header className={styles.top}>
        <a href={`/jobs/${jobId}`} aria-label="Back to job"><ArrowLeft /></a>
        <div>
          <h1>{travel?.canShareLocation ? "Share job travel" : "Provider travel"}</h1>
          <p>{travel?.arrivedAt ? "Provider has arrived" : travel?.status === "active" ? "Provider is on the way" : "Live sharing is off"}</p>
        </div>
      </header>
      {state === "error" && <Feedback kind="error" title="Live map is unavailable">You can still coordinate in chat. Try again in the foreground.</Feedback>}
      <section className={styles.map}>
        <LiveTravelMap location={travel?.location ?? null} destination={travel?.destination ?? null} route={travel?.routeGeometry ?? null} />
        <div className={styles.stats}>
          <div><span>ETA</span><strong>{travel?.etaSeconds ? `${Math.ceil(travel.etaSeconds / 60)} min` : "Not available"}</strong></div>
          <div><span>Distance</span><strong>{travel?.distanceMeters != null ? travel.distanceMeters >= 1000 ? `${(travel.distanceMeters / 1000).toFixed(1)} km` : `${travel.distanceMeters} m` : "Not available"}</strong></div>
        </div>
        <div className={styles.notice}><ShieldCheck /><p>Live sharing resumes whenever the provider returns to this travel screen. Exact location is limited to job participants and raw samples expire after 24 hours.</p></div>
        <div className={styles.actions}>
          {travel?.canShareLocation && (travel.status === "active"
            ? <Button variant="secondary" onClick={() => void stop()}><Square />Stop sharing</Button>
            : <Button disabled={state === "sharing"} onClick={() => void start()}><LocateFixed />{state === "sharing" ? "Starting…" : "Start foreground sharing"}</Button>)}
          {!travel?.canShareLocation && travel?.status !== "active" && <p>Location will appear here when the provider starts traveling.</p>}
          <Button variant="secondary" onClick={() => void load()}>Refresh map</Button>
        </div>
      </section>
    </main>
  );
}
