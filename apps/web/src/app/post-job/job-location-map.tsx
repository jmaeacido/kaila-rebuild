"use client";

import { useEffect, useRef } from "react";
import { Map, Marker } from "maplibre-gl";
import { addMissingStyleImageFallback } from "../../lib/maplibre-style-images";
import styles from "./page.module.css";

export type JobLocation = {
  latitude: number;
  longitude: number;
};

const defaultCenter: JobLocation = { latitude: 8.826, longitude: 125.117 };
const maplibreStylesheetUrl = "https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.css";

export function JobLocationMap({
  location,
  onChange,
}: {
  location: JobLocation | null;
  onChange: (location: JobLocation) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialLocation = useRef(location);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let stylesheet = document.querySelector<HTMLLinkElement>(
      "link[data-kaila-maplibre-stylesheet='true']",
    );
    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = maplibreStylesheetUrl;
      stylesheet.dataset.kailaMaplibreStylesheet = "true";
      document.head.appendChild(stylesheet);
    }

    if (!container.current) return;
    const center = initialLocation.current ?? defaultCenter;
    const map = new Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [center.longitude, center.latitude],
      zoom: initialLocation.current ? 16 : 12,
    });
    mapRef.current = map;
    const removeMissingImageFallback = addMissingStyleImageFallback(map);
    map.on("click", (event) => {
      onChangeRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });

    return () => {
      removeMissingImageFallback();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!location) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const element = document.createElement("span");
      element.className = styles.jobPin;
      element.setAttribute("aria-label", "Job site pin");
      markerRef.current = new Marker({ element, draggable: true })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const point = markerRef.current?.getLngLat();
        if (point) onChangeRef.current({ latitude: point.lat, longitude: point.lng });
      });
    } else {
      markerRef.current.setLngLat([location.longitude, location.latitude]);
    }
    map.easeTo({ center: [location.longitude, location.latitude], zoom: 16, duration: 0 });
  }, [location]);

  return (
    <div className={styles.mapWrap}>
      <div
        ref={container}
        className={styles.mapCanvas}
        aria-label="Choose the job site on the map"
      />
      <p className={styles.mapHint}>Tap the map to place the pin. Drag it for finer placement.</p>
    </div>
  );
}
