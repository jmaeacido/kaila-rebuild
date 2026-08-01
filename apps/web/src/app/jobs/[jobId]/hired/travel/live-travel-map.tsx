"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LngLatBounds, Map, Marker, type GeoJSONSource } from "maplibre-gl";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { addMissingStyleImageFallback } from "../../../../../lib/maplibre-style-images";
import styles from "../hired.module.css";

type Point = { latitude: number; longitude: number };

type Props = {
  location: Point | null;
  destination: Point | null;
  route: Point[] | null;
  heading: number | null;
  navigationMode: boolean;
  travelerLabel: string;
  destinationLabel: string;
};

function routeData(route: Point[]) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route.map((point) => [point.longitude, point.latitude]) } };
}

export function LiveTravelMap({ location, destination, route, heading, navigationMode, travelerLabel, destinationLabel }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const providerMarker = useRef<Marker | null>(null);
  const destinationMarker = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(navigationMode);

  const frameRoute = useCallback(() => {
    const map = mapRef.current;
    const points = route?.length ? route : [location, destination].filter((point): point is Point => point !== null);
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 16, duration: 250 });
      return;
    }
    const bounds = new LngLatBounds();
    points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, { padding: { top: 112, right: 40, bottom: 240, left: 40 }, maxZoom: 17, duration: 250 });
  }, [destination, location, route]);

  useEffect(() => {
    if (!container.current || mapRef.current || (!location && !destination)) return;
    const center = location ?? destination;
    if (!center) return;
    try {
      const map = new Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [center.longitude, center.latitude],
        zoom: 15,
        attributionControl: {},
        canvasContextAttributes: { antialias: false },
      });
      mapRef.current = map;
      const removeMissingImageFallback = addMissingStyleImageFallback(map);
      map.on("dragstart", () => setFollowing(false));
      map.on("error", (event) => { if (!map.loaded() && event.error) setFailed(true); });
      map.on("load", () => {
        map.addSource("job-route", { type: "geojson", data: routeData(route ?? []) });
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
        const surface = getComputedStyle(document.documentElement).getPropertyValue("--color-surface").trim();
        map.addLayer({ id: "job-route-casing", type: "line", source: "job-route", paint: { "line-color": surface, "line-width": 9, "line-opacity": 0.9 } });
        map.addLayer({ id: "job-route", type: "line", source: "job-route", paint: { "line-color": primary, "line-width": 6, "line-opacity": 0.95 } });
      });
      return () => {
        removeMissingImageFallback();
        providerMarker.current?.remove();
        destinationMarker.current?.remove();
        map.remove();
        mapRef.current = null;
      };
    } catch {
      queueMicrotask(() => setFailed(true));
    }
  }, [destination, location, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    if (!providerMarker.current) {
      const element = document.createElement("div");
      element.className = styles.providerMarker;
      element.setAttribute("aria-label", `Point A: ${travelerLabel} location`);
      element.innerHTML = `<span></span>`;
      providerMarker.current = new Marker({ element, rotationAlignment: "map" }).setLngLat([location.longitude, location.latitude]).addTo(map);
    } else {
      providerMarker.current.setLngLat([location.longitude, location.latitude]);
    }
    providerMarker.current.setRotation(heading ?? 0);
    if (following) map.easeTo({ center: [location.longitude, location.latitude], zoom: navigationMode ? 17 : map.getZoom(), bearing: navigationMode ? (heading ?? map.getBearing()) : 0, pitch: navigationMode ? 48 : 0, duration: 250 });
  }, [following, heading, location, navigationMode, travelerLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destination) return;
    if (!destinationMarker.current) {
      const element = document.createElement("div");
      element.className = styles.destinationMarker;
      element.setAttribute("aria-label", `Point B: ${destinationLabel}`);
      element.innerHTML = `<span></span>`;
      destinationMarker.current = new Marker({ element }).setLngLat([destination.longitude, destination.latitude]).addTo(map);
    } else destinationMarker.current.setLngLat([destination.longitude, destination.latitude]);
  }, [destination, destinationLabel]);

  useEffect(() => {
    const source = mapRef.current?.getSource("job-route") as GeoJSONSource | undefined;
    source?.setData(routeData(route ?? []));
  }, [route]);

  if (!location && !destination) return <div className={styles.mapFallback}>Waiting for the job-site pin</div>;
  if (failed) return <div className={styles.mapFallback}>Map tiles are unavailable. Directions, distance, and ETA remain below.</div>;
  return <div className={styles.mapStage}>
    <div ref={container} className={styles.mapCanvas} aria-label="Live route map" />
    <div className={styles.mapControls} aria-label="Map controls">
      <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus /></button>
      <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus /></button>
      <button type="button" className={following ? styles.following : ""} aria-label="Recenter on provider" aria-pressed={following} onClick={() => { setFollowing(true); if (!navigationMode) frameRoute(); }}><LocateFixed /></button>
    </div>
  </div>;
}
