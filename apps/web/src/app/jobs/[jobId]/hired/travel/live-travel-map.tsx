"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { LngLatBounds, Map, Marker, type GeoJSONSource } from "maplibre-gl";
import { Compass, LocateFixed, Minus, Plus } from "lucide-react";
import { addMissingStyleImageFallback } from "../../../../../lib/maplibre-style-images";
import { mapStyleForTheme } from "../../../../../lib/map-theme";
import { useTheme } from "../../../../theme-provider";
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

function routeFeature(coordinates: Array<[number, number]>) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
}

function toCoordinates(route: Point[] | null): Array<[number, number]> {
  return (route ?? []).map((point) => [point.longitude, point.latitude]);
}

/** Keep remaining path from the closest route vertex ahead of the traveler. */
function remainingCoordinates(location: Point | null, route: Point[] | null): Array<[number, number]> {
  const coordinates = toCoordinates(route);
  if (!location || coordinates.length < 2) return coordinates;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < coordinates.length; index += 1) {
    const [longitude, latitude] = coordinates[index];
    const distance = (longitude - location.longitude) ** 2 + (latitude - location.latitude) ** 2;
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  }
  return coordinates.slice(Math.min(nearest, coordinates.length - 1));
}

function offsetCenter(point: Point, headingDegrees: number | null, meters: number): [number, number] {
  if (headingDegrees === null || Number.isNaN(headingDegrees) || meters <= 0) {
    return [point.longitude, point.latitude];
  }
  const radians = (headingDegrees * Math.PI) / 180;
  const latOffset = (meters * Math.cos(radians)) / 111_320;
  const lngOffset = (meters * Math.sin(radians)) / (111_320 * Math.cos((point.latitude * Math.PI) / 180));
  return [point.longitude + lngOffset, point.latitude + latOffset];
}

export function LiveTravelMap({
  location,
  destination,
  route,
  heading,
  navigationMode,
  travelerLabel,
  destinationLabel,
}: Props) {
  const { resolved } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const travelerMarker = useRef<Marker | null>(null);
  const destinationMarker = useRef<Marker | null>(null);
  const removeFallback = useRef<(() => void) | null>(null);
  const routeRef = useRef(route);
  const locationRef = useRef(location);
  const headingRef = useRef(heading);
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(true);
  const [headingUp, setHeadingUp] = useState(true);

  useEffect(() => {
    routeRef.current = route;
    locationRef.current = location;
    headingRef.current = heading;
  }, [heading, location, route]);

  const paintRoute = useCallback((map: Map, nextRoute: Point[] | null, nextLocation: Point | null) => {
    const remaining = remainingCoordinates(nextLocation, nextRoute);
    const full = toCoordinates(nextRoute);
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#1463ff";
    const muted = getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim() || "#98a2b3";
    const surface = getComputedStyle(document.documentElement).getPropertyValue("--color-surface").trim() || "#ffffff";

    const ensureSource = (id: string, coordinates: Array<[number, number]>) => {
      const existing = map.getSource(id) as GeoJSONSource | undefined;
      if (existing) existing.setData(routeFeature(coordinates));
      else map.addSource(id, { type: "geojson", data: routeFeature(coordinates) });
    };

    ensureSource("job-route-full", full);
    ensureSource("job-route", remaining.length >= 2 ? remaining : full);

    const layers: Array<{ id: string; source: string; color: string; width: number; opacity: number }> = [
      { id: "job-route-full-casing", source: "job-route-full", color: muted, width: 8, opacity: 0.55 },
      { id: "job-route-casing", source: "job-route", color: surface, width: 10, opacity: 0.95 },
      { id: "job-route", source: "job-route", color: primary, width: 6, opacity: 0.98 },
    ];

    for (const layer of layers) {
      if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      if (!map.getSource(layer.source)) continue;
      map.addLayer({
        id: layer.id,
        type: "line",
        source: layer.source,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": layer.color,
          "line-width": layer.width,
          "line-opacity": layer.opacity,
        },
      });
    }
  }, []);

  const frameRoute = useCallback(() => {
    const map = mapRef.current;
    const points = route?.length ? route : [location, destination].filter((point): point is Point => point !== null);
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 16, bearing: 0, pitch: 0, duration: 350 });
      return;
    }
    const bounds = new LngLatBounds();
    points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, {
      padding: { top: 140, right: 48, bottom: 280, left: 48 },
      maxZoom: 17,
      duration: 450,
      bearing: 0,
      pitch: 0,
    });
  }, [destination, location, route]);

  const followCamera = useCallback((map: Map, point: Point, nextHeading: number | null) => {
    if (navigationMode && headingUp && nextHeading !== null) {
      map.easeTo({
        center: offsetCenter(point, nextHeading, 36),
        zoom: Math.max(map.getZoom(), 17.2),
        bearing: nextHeading,
        pitch: 58,
        duration: 420,
        essential: true,
      });
      return;
    }
    map.easeTo({
      center: [point.longitude, point.latitude],
      zoom: navigationMode ? Math.max(map.getZoom(), 16.5) : map.getZoom(),
      bearing: 0,
      pitch: navigationMode ? 35 : 0,
      duration: 350,
      essential: true,
    });
  }, [headingUp, navigationMode]);

  // Create the map once when the first pin is available.
  useEffect(() => {
    if (!container.current || mapRef.current || (!location && !destination)) return;
    const center = location ?? destination;
    if (!center) return;
    try {
      const map = new Map({
        container: container.current,
        style: mapStyleForTheme(resolved),
        center: [center.longitude, center.latitude],
        zoom: navigationMode ? 17 : 15,
        attributionControl: {},
        canvasContextAttributes: { antialias: false },
      });
      mapRef.current = map;
      removeFallback.current = addMissingStyleImageFallback(map);
      map.on("dragstart", () => setFollowing(false));
      map.on("pitchstart", () => setFollowing(false));
      map.on("rotatestart", () => setFollowing(false));
      map.on("error", (event) => {
        if (!map.loaded() && event.error) setFailed(true);
      });
      map.on("load", () => {
        paintRoute(map, routeRef.current, locationRef.current);
        if (!navigationMode) frameRoute();
        else if (locationRef.current) followCamera(map, locationRef.current, headingRef.current);
      });
      return () => {
        removeFallback.current?.();
        removeFallback.current = null;
        travelerMarker.current?.remove();
        destinationMarker.current?.remove();
        travelerMarker.current = null;
        destinationMarker.current = null;
        map.remove();
        mapRef.current = null;
      };
    } catch {
      queueMicrotask(() => setFailed(true));
    }
    // Intentionally mount once; later updates flow through dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(location || destination)]);

  // Theme changes only — never rebind style on GPS ticks.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapStyleForTheme(resolved));
    map.once("style.load", () => paintRoute(map, routeRef.current, locationRef.current));
  }, [paintRoute, resolved]);

  // Keep route geometry current without style reloads.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    paintRoute(map, route, location);
  }, [location, paintRoute, route]);

  useEffect(() => {
    if (navigationMode) {
      setFollowing(true);
      setHeadingUp(true);
    }
  }, [navigationMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    if (!travelerMarker.current) {
      const element = document.createElement("div");
      element.className = `${styles.providerMarker} ${styles.navigationPuck}`;
      element.setAttribute("aria-label", `Point A: ${travelerLabel} location`);
      element.innerHTML = `<i></i><span></span>`;
      travelerMarker.current = new Marker({
        element,
        rotationAlignment: navigationMode && headingUp ? "viewport" : "map",
        pitchAlignment: navigationMode && headingUp ? "viewport" : "map",
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
    } else {
      travelerMarker.current.setLngLat([location.longitude, location.latitude]);
      travelerMarker.current.setRotationAlignment(navigationMode && headingUp ? "viewport" : "map");
      travelerMarker.current.setPitchAlignment(navigationMode && headingUp ? "viewport" : "map");
    }
    // Heading-up nav keeps the chevron pointing forward in the viewport.
    travelerMarker.current.setRotation(navigationMode && headingUp ? 0 : (heading ?? 0));
    if (following) followCamera(map, location, heading);
  }, [followCamera, following, heading, headingUp, location, navigationMode, travelerLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destination) return;
    if (!destinationMarker.current) {
      const element = document.createElement("div");
      element.className = styles.destinationMarker;
      element.setAttribute("aria-label", `Point B: ${destinationLabel}`);
      element.innerHTML = `<span></span>`;
      destinationMarker.current = new Marker({ element })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map);
    } else {
      destinationMarker.current.setLngLat([destination.longitude, destination.latitude]);
    }
  }, [destination, destinationLabel]);

  if (!location && !destination) {
    return <div className={styles.mapFallback}>Waiting for the job-site pin</div>;
  }
  if (failed) {
    return <div className={styles.mapFallback}>Map tiles are unavailable. Directions, distance, and ETA remain below.</div>;
  }

  return (
    <div className={styles.mapStage}>
      <div ref={container} className={styles.mapCanvas} aria-label="Live navigation map" />
      <div className={styles.mapControls} aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn({ duration: 200 })}>
          <Plus />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut({ duration: 200 })}>
          <Minus />
        </button>
        {navigationMode && (
          <button
            type="button"
            className={headingUp ? styles.following : ""}
            aria-label={headingUp ? "Heading up" : "North up"}
            aria-pressed={headingUp}
            onClick={() => {
              setHeadingUp((current) => !current);
              setFollowing(true);
            }}
          >
            <Compass />
          </button>
        )}
        <button
          type="button"
          className={following ? styles.following : ""}
          aria-label="Recenter on traveler"
          aria-pressed={following}
          onClick={() => {
            setFollowing(true);
            const map = mapRef.current;
            if (!map) return;
            if (navigationMode && location) followCamera(map, location, heading);
            else frameRoute();
          }}
        >
          <LocateFixed />
        </button>
      </div>
    </div>
  );
}
