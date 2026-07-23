"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, Map, Marker } from "maplibre-gl";
import styles from "../hired.module.css";

const maplibreStylesheetUrl = "https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.css";

type Point = { latitude: number; longitude: number };

export function LiveTravelMap({ location, destination, route }: { location: Point | null; destination: Point | null; route: Point[] | null }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingStylesheet = document.querySelector<HTMLLinkElement>("link[data-kaila-maplibre-stylesheet='true']");
    if (!existingStylesheet) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = maplibreStylesheetUrl;
      stylesheet.dataset.kailaMaplibreStylesheet = "true";
      document.head.appendChild(stylesheet);
    }
  }, []);

  useEffect(() => {
    if (!container.current || (!location && !destination)) return;
    const center = location ?? destination;
    if (!center) return;

    const map = new Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [center.longitude, center.latitude],
      zoom: 14,
      attributionControl: {},
    });
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
        map.addLayer({ id: "job-route", type: "line", source: "job-route", paint: { "line-color": "#1463FF", "line-width": 5, "line-opacity": 0.85 } });
      }
      const points = [location, destination].filter((point): point is Point => point !== null);
      if (points.length > 1) {
        const bounds = new LngLatBounds();
        points.forEach(point => bounds.extend([point.longitude, point.latitude]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
      }
    });

    return () => {
      markers.forEach(marker => marker.remove());
      map.remove();
    };
  }, [destination, location, route]);

  if (!location && !destination) return <div className={styles.mapFallback}>Waiting for a location pin</div>;
  return <div ref={container} className={styles.mapCanvas} aria-label="Live provider route map" />;
}
