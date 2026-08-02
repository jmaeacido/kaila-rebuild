export type NavigationPoint = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt?: string;
  headingDegrees?: number | null;
};

export type NavigationStep = {
  instruction: string;
  maneuver: string;
  modifier: string | null;
  distanceMeters: number;
  durationSeconds: number;
  location: NavigationPoint;
};

export function straightLineMeters(from: NavigationPoint | null, to: NavigationPoint | null): number | null {
  if (!from || !to) return null;
  const radius = 6_371_000;
  const latitude = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitude = ((to.longitude - from.longitude) * Math.PI) / 180;
  const startLatitude = (from.latitude * Math.PI) / 180;
  const endLatitude = (to.latitude * Math.PI) / 180;
  const value =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitude / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

/** Forward azimuth from A → B in degrees [0, 360). */
export function bearingDegrees(from: NavigationPoint, to: NavigationPoint): number {
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Prefer a reliable GPS heading while moving; otherwise derive from consecutive points.
 * Returns null when neither source is trustworthy (caller should keep the previous heading).
 */
export function resolveTravelHeading(options: {
  gpsHeading: number | null | undefined;
  speedMetersPerSecond?: number | null;
  previous: NavigationPoint | null;
  current: NavigationPoint;
  minimumMoveMeters?: number;
}): number | null {
  const { gpsHeading, speedMetersPerSecond, previous, current, minimumMoveMeters = 8 } = options;
  const gpsValid =
    typeof gpsHeading === "number" &&
    !Number.isNaN(gpsHeading) &&
    (speedMetersPerSecond == null || speedMetersPerSecond > 0.8);
  if (gpsValid) return ((gpsHeading % 360) + 360) % 360;
  if (!previous) return null;
  const moved = straightLineMeters(previous, current);
  if (moved === null || moved < minimumMoveMeters) return null;
  return bearingDegrees(previous, current);
}

/** Advance past maneuvers the traveler has already reached. */
export function activeNavigationStep(
  location: NavigationPoint | null,
  steps: NavigationStep[],
  passMeters = 40,
): NavigationStep | null {
  if (steps.length === 0) return null;
  for (const step of steps) {
    if (step.maneuver === "depart") continue;
    const distance = straightLineMeters(location, step.location);
    if (distance === null || distance > passMeters) return step;
  }
  return steps[steps.length - 1] ?? null;
}

export function formatNavigationDistance(meters: number | null): string {
  if (meters === null) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.max(0, meters)} m`;
}

export function formatNavigationEta(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return "< 1 min";
  return `${Math.ceil(seconds / 60)} min`;
}

export function formatArrivalClock(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
