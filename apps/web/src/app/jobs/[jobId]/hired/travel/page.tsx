/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, ChevronLeft, ChevronRight, LocateFixed, MessageCircle, Navigation, RotateCcw, ShieldCheck, Square } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { BackgroundNavigation } from "@kaila/mobile/background-navigation";
import { loadSession } from "@kaila/mobile/session";
import styles from "../hired.module.css";
import { LiveTravelMap } from "./live-travel-map";
import { useRealtimeInvalidation } from "../../../../use-realtime-invalidation";
import {
  activeNavigationStep,
  formatArrivalClock,
  formatNavigationDistance,
  formatNavigationEta,
  resolveTravelHeading,
  straightLineMeters,
  type NavigationPoint,
  type NavigationStep,
} from "../../../../travel-navigation";

type Point = NavigationPoint;
type RouteStep = NavigationStep;
type Travel = {
  status: string;
  canShareLocation: boolean;
  distanceMeters: number | null;
  etaSeconds: number | null;
  arrivedAt: string | null;
  location: Point | null;
  destination: Point | null;
  routeGeometry: Point[] | null;
  routeSteps: RouteStep[];
  serviceLocationMode: "at_client" | "at_provider" | "remote";
  travelerRole: "client" | "provider" | null;
  destinationLabel: string | null;
};

function ManeuverIcon({ step }: { step: RouteStep | null }) {
  if (step?.maneuver === "arrive") return <Check aria-hidden="true" />;
  if (step?.modifier?.includes("left")) return <ChevronLeft aria-hidden="true" />;
  if (step?.modifier?.includes("right")) return <ChevronRight aria-hidden="true" />;
  if (step?.modifier === "uturn") return <RotateCcw aria-hidden="true" />;
  return <ArrowUp aria-hidden="true" />;
}

export default function TravelPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [travel, setTravel] = useState<Travel | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "sharing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [heading, setHeading] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const sending = useRef(false);
  const lastSentAt = useRef(0);
  const nativeNavigation = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const headingRef = useRef<number | null>(null);

  const applyHeading = useCallback((next: number | null) => {
    if (next === null) return;
    headingRef.current = next;
    setHeading(next);
  }, []);

  const startNativeNavigation = useCallback(async () => {
    const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!capacitor?.isNativePlatform?.()) return false;
    const session = await loadSession();
    if (!session) throw new Error("Your mobile session needs to be refreshed before background navigation can start.");
    const origin = process.env.NEXT_PUBLIC_KAILA_API_ORIGIN ?? window.location.origin;
    await BackgroundNavigation.start({
      locationUrl: new URL(`/api/v1/auth/mobile/jobs/${jobId}/travel/location`, origin).href,
      stopUrl: new URL(`/api/v1/auth/mobile/jobs/${jobId}/travel/stop`, origin).href,
      accessToken: session.accessToken,
    });
    nativeNavigation.current = true;
    return true;
  }, [jobId]);

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/travel`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setTravel(((await response.json()) as { data: Travel }).data);
      setState("ready");
      setErrorMessage("");
    } catch {
      setErrorMessage("Travel details could not be loaded. Check your connection and try again.");
      if (!quiet) setState("error");
    }
  }, [jobId]);
  useRealtimeInvalidation(() => void load(true), (event) => event.data.jobId === jobId);

  useEffect(() => {
    void load();
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [load]);

  // Keep heading current for observers and native background travelers from shared samples.
  useEffect(() => {
    const location = travel?.location;
    if (!location) return;
    if (typeof location.headingDegrees === "number" && !Number.isNaN(location.headingDegrees)) {
      applyHeading(location.headingDegrees);
      lastPoint.current = location;
      return;
    }
    const derived = resolveTravelHeading({
      gpsHeading: null,
      previous: lastPoint.current,
      current: location,
    });
    applyHeading(derived);
    lastPoint.current = location;
  }, [applyHeading, travel?.location]);

  const sendPosition = useCallback(async (position: GeolocationPosition, force = false) => {
    if (sending.current || (!force && Date.now() - lastSentAt.current < 3000)) return;
    sending.current = true;
    const current: Point = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: Math.max(1, Math.min(200, Math.round(position.coords.accuracy))),
      capturedAt: new Date(position.timestamp).toISOString(),
    };
    const nextHeading = resolveTravelHeading({
      gpsHeading: position.coords.heading,
      speedMetersPerSecond: position.coords.speed,
      previous: lastPoint.current,
      current,
    });
    applyHeading(nextHeading);
    lastPoint.current = current;
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/travel/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: current.latitude,
          longitude: current.longitude,
          accuracyMeters: current.accuracyMeters,
          capturedAt: current.capturedAt,
          ...(typeof (nextHeading ?? headingRef.current) === "number"
            ? { headingDegrees: nextHeading ?? headingRef.current }
            : {}),
          foreground: true,
        }),
      });
      if (!response.ok && response.status !== 409) throw new Error();
      lastSentAt.current = Date.now();
      await load(true);
    } finally {
      sending.current = false;
    }
  }, [applyHeading, jobId, load]);

  const beginLocationWatch = useCallback(() => {
    if (nativeNavigation.current || watchId.current !== null || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(position).catch(() => {
        setErrorMessage("Your latest location could not be shared. Check your connection, then retry.");
        setState("error");
      }),
      (error) => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setErrorMessage(error.code === error.PERMISSION_DENIED ? "Allow precise location for KAILA in Android Settings, then try again." : "KAILA could not get your current location. Turn on Location and try again.");
        setState("error");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }, [sendPosition]);

  useEffect(() => {
    if (!travel?.canShareLocation || travel.status !== "active") return;
    const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!capacitor?.isNativePlatform?.()) {
      beginLocationWatch();
      return;
    }
    void BackgroundNavigation.status().then(({ active: serviceActive }) => {
      nativeNavigation.current = serviceActive;
      if (!serviceActive) {
        setErrorMessage("Background navigation stopped. Tap Retry to resume sharing.");
        setState("error");
      }
    }).catch(() => {
      setErrorMessage("KAILA could not verify background navigation. Tap Retry to resume sharing.");
      setState("error");
    });
  }, [beginLocationWatch, travel?.canShareLocation, travel?.status]);

  async function start() {
    setState("sharing");
    if (!navigator.geolocation) {
      setErrorMessage("Live location is not supported on this device.");
      setState("error");
      return;
    }
    try {
      const initialPosition = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }));
      const response = await fetch(`/api/v1/jobs/${jobId}/travel/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consentConfirmed: true, foreground: true }) });
      if (!response.ok) throw new Error();
      await sendPosition(initialPosition, true);
      const backgroundStarted = await startNativeNavigation();
      if (!backgroundStarted) beginLocationWatch();
      await load();
    } catch {
      setErrorMessage("Allow precise location for KAILA and turn on Location, then try again.");
      setState("error");
    }
  }

  async function stop() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setState("sharing");
    if (nativeNavigation.current) {
      await BackgroundNavigation.stop().catch(() => undefined);
      nativeNavigation.current = false;
    }
    const response = await fetch(`/api/v1/jobs/${jobId}/travel/stop`, { method: "POST" });
    if (!response.ok) {
      setErrorMessage("Navigation could not be stopped. Check your connection and try again.");
      setState("error");
      return;
    }
    await load();
  }

  async function retry() {
    setErrorMessage("");
    setState("loading");
    try {
      if (travel?.canShareLocation && active) {
        const backgroundStarted = await startNativeNavigation();
        if (!backgroundStarted) beginLocationWatch();
      }
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Navigation could not be resumed.");
      setState("error");
    }
  }

  const fallbackDistance = straightLineMeters(travel?.location ?? null, travel?.destination ?? null);
  const distance = travel?.distanceMeters ?? fallbackDistance;
  const eta = travel?.etaSeconds ?? (fallbackDistance === null ? null : Math.max(60, Math.ceil(fallbackDistance / 6.1)));
  const active = travel?.status === "active";
  const travelerNavigating = Boolean(travel?.canShareLocation && active);
  const shopService = travel?.serviceLocationMode === "at_provider";
  const travelerName = shopService ? "client" : "provider";
  const destinationName = shopService ? "provider’s shop" : "client";
  const steps = travel?.routeSteps ?? [];
  const nextStep = activeNavigationStep(travel?.location ?? null, steps);
  const instructionDistance = straightLineMeters(travel?.location ?? null, nextStep?.location ?? null);
  const lastUpdate = travel?.location?.capturedAt ? new Date(travel.location.capturedAt) : null;
  const arrivalClock = formatArrivalClock(travel?.arrivedAt ?? null);

  return <main className={styles.navigationShell}>
    <LiveTravelMap
      location={travel?.location ?? null}
      destination={travel?.destination ?? null}
      route={travel?.routeGeometry ?? null}
      heading={heading}
      navigationMode={travelerNavigating}
      travelerLabel={travelerName}
      destinationLabel={destinationName}
    />

    <header className={styles.navigationTop}>
      <a href={`/jobs/${jobId}`} aria-label="Back to job"><ArrowLeft /></a>
      <div>
        <strong>{travel?.arrivedAt ? `Arrived at ${destinationName}` : active ? travelerNavigating ? `Navigating to ${destinationName}` : `${shopService ? "Client" : "Provider"} on the way` : "Navigation"}</strong>
        <span>{lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : `Waiting for ${travelerName} GPS (point A)`}</span>
      </div>
      <a href={`/jobs/${jobId}/hired/conversation`} aria-label="Message job participant"><MessageCircle /></a>
    </header>

    {travelerNavigating && !travel?.arrivedAt && <section className={styles.turnCard} aria-live="polite">
      <div className={styles.maneuver}><ManeuverIcon step={nextStep} /></div>
      <div>
        <span>{formatNavigationDistance(instructionDistance)}</span>
        <strong>{nextStep?.instruction ?? "Follow the highlighted route"}</strong>
      </div>
    </section>}

    {state === "loading" && <div className={styles.navigationLoading}><Navigation /><span>Loading your route…</span></div>}

    <section className={styles.navigationSheet} aria-label="Travel progress">
      <div className={styles.sheetHandle} aria-hidden="true" />
      {errorMessage && <Feedback kind="error" title={travel ? "Live location needs attention" : "Live map is unavailable"}>{errorMessage}</Feedback>}
      {travel?.arrivedAt ? <div className={styles.arrival}><span><Check /></span><div><h1>{shopService ? "Client has arrived" : "Provider has arrived"}</h1><p>{arrivalClock ? `Arrived at ${arrivalClock}. You can continue with the service.` : "You can now continue with the service."}</p></div></div> : <div className={styles.routeSummary}>
        <div><strong>{formatNavigationEta(eta)}</strong><span>ETA to {destinationName}</span></div>
        <div><strong>{formatNavigationDistance(distance)}</strong><span>distance remaining</span></div>
        <div><strong>{travel?.location?.accuracyMeters ? `±${travel.location.accuracyMeters} m` : "—"}</strong><span>GPS accuracy</span></div>
      </div>}

      {!active && !travel?.arrivedAt && <div className={styles.waitingCopy}>
        <Navigation aria-hidden="true" />
        <div><h1>{travel?.canShareLocation ? `Ready to navigate to ${destinationName}?` : `Waiting for the ${travelerName}`}</h1><p>{travel?.canShareLocation ? `Your GPS position is point A and the ${destinationName} pin is point B. KAILA keeps the route, turns, distance, and ETA current.` : `The point A to point B route, turns, distance, and live ETA will appear when the ${travelerName} starts navigation.`}</p></div>
      </div>}

      <div className={styles.navigationActions}>
        {travel?.canShareLocation && (active
          ? <Button variant="secondary" disabled={state === "sharing"} onClick={() => void stop()}><Square /> Stop navigation</Button>
          : !travel.arrivedAt && <Button disabled={state === "sharing" || state === "loading"} onClick={() => void start()}><LocateFixed /> {state === "sharing" ? "Starting…" : shopService ? "Navigate to Shop" : "Navigate to Client"}</Button>)}
        {!travel?.canShareLocation && <Button onClick={() => location.assign(`/jobs/${jobId}/hired/conversation`)}><MessageCircle /> Message {travelerName}</Button>}
        {state === "error" && <Button variant="secondary" onClick={() => void retry()}>Retry</Button>}
      </div>

      <details className={styles.privacyNote}><summary><ShieldCheck /> Location sharing &amp; safety</summary><p>On Android, sharing continues while navigation is active—even when KAILA is minimized or the screen locks—and a persistent notification lets you return or stop. Location is visible only to this job’s participants. Raw samples expire after 24 hours unless needed for a dispute or legal hold.</p></details>
    </section>
  </main>;
}
