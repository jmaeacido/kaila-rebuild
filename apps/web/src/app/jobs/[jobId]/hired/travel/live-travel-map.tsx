/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Map, Marker } from "maplibre-gl";
import { addMissingStyleImageFallback } from "../../../../../lib/maplibre-style-images";
import styles from "../hired.module.css";

type Point = { latitude: number; longitude: number };

export function LiveTravelMap({ location, destination, route }: { location: Point | null; destination: Point | null; route: Point[] | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current || (!location && !destination)) return;
    const center = location ?? destination;
    if (!center) return;

    setFailed(false);
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [center.longitude, center.latitude],
        zoom: 14,
        attributionControl: {},
        canvasContextAttributes: { antialias: false },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.on("error", (event) => {
      if (!map.loaded() && event.error) setFailed(true);
    });
    const removeMissingImageFallback = addMissingStyleImageFallback(map);
    const markers: Marker[] = [];

    if (location) {
      const element = document.createElement("div");
      element.className = styles.providerMarker;
      element.setAttribute("aria-label", "Provider location");
      markers.push(new Marker({ element }).setLngLat([location.longitude, location.latitude]).addTo(map));
    }
    if (destination) {
      const element = document.createElement("div");
      element.className = styles.destinationMarker;
      element.setAttribute("aria-label", "Job destination");
      markers.push(new Marker({ element }).setLngLat([destination.longitude, destination.latitude]).addTo(map));
    }

    map.on("load", () => {
      if (route && route.length > 1) {
        map.addSource("job-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map(point => [point.longitude, point.latitude]) } } });
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
        map.addLayer({ id: "job-route", type: "line", source: "job-route", paint: { "line-color": primary, "line-width": 5, "line-opacity": 0.85 } });
      }
      const points = [location, destination].filter((point): point is Point => point !== null);
      if (points.length > 1) {
        const bounds = new LngLatBounds();
        points.forEach(point => bounds.extend([point.longitude, point.latitude]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
      }
    });

    return () => {
      removeMissingImageFallback();
      markers.forEach(marker => marker.remove());
      map.remove();
    };
  }, [destination, location, route]);

  if (!location && !destination) return <div className={styles.mapFallback}>Waiting for a location pin</div>;
  if (failed) return <div className={styles.mapFallback}>Map tiles are unavailable. Distance and ETA remain available below.</div>;
  return <div ref={container} className={styles.mapCanvas} aria-label="Live provider route map" />;
}
