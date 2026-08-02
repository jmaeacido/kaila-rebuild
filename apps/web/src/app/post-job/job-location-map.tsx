"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Satellite } from "lucide-react";
import { Map as MapLibreMap, Marker, type StyleSpecification } from "maplibre-gl";
import { addMissingStyleImageFallback } from "../../lib/maplibre-style-images";
import { mapStyleForTheme } from "../../lib/map-theme";
import { useTheme } from "../theme-provider";
import styles from "./page.module.css";

export type JobLocation = {
  latitude: number;
  longitude: number;
};

const defaultCenter: JobLocation = { latitude: 8.826, longitude: 125.117 };
const maplibreStylesheetUrl = "https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.css";
const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Esri, Vantor, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};
type MapLayer = "map" | "satellite";

export function JobLocationMap({
  location,
  onChange,
}: {
  location: JobLocation | null;
  onChange: (location: JobLocation) => void;
}) {
  const { resolved } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialLocation = useRef(location);
  const layerRef = useRef<MapLayer>("map");
  const [layer, setLayer] = useState<MapLayer>("map");

  function changeLayer(nextLayer: MapLayer) {
    if (nextLayer === layer) return;
    setLayer(nextLayer);
    layerRef.current = nextLayer;
    mapRef.current?.setStyle(nextLayer === "satellite" ? satelliteStyle : mapStyleForTheme(resolved));
  }

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
    const map = new MapLibreMap({
      container: container.current,
      style: mapStyleForTheme(resolved),
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
    // Initial map only — theme updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (layerRef.current !== "map") return;
    mapRef.current?.setStyle(mapStyleForTheme(resolved));
  }, [resolved]);

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
      <div className={styles.mapStage}>
        <div
          ref={container}
          className={styles.mapCanvas}
          aria-label="Choose the job site on the map"
        />
        <div className={styles.mapLayerToggle} aria-label="Map layer">
          <button
            type="button"
            className={layer === "map" ? styles.mapLayerActive : ""}
            aria-pressed={layer === "map"}
            onClick={() => changeLayer("map")}
          >
            <MapIcon aria-hidden="true" /> Map
          </button>
          <button
            type="button"
            className={layer === "satellite" ? styles.mapLayerActive : ""}
            aria-pressed={layer === "satellite"}
            onClick={() => changeLayer("satellite")}
          >
            <Satellite aria-hidden="true" /> Satellite
          </button>
        </div>
      </div>
      <p className={styles.mapHint}>Tap the map to place the pin. Drag it for finer placement.</p>
    </div>
  );
}
