export type TravelMetrics = {
  status: string;
  distanceMeters: number | null;
  etaSeconds: number | null;
  arrivedAt: string | null;
};

export function formatTravelDistance(meters: number | null): string {
  if (meters === null) return "Calculating distance…";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.max(0, meters)} m`;
}

export function formatTravelEta(seconds: number | null): string {
  if (seconds === null) return "Calculating ETA…";
  if (seconds < 60) return "Under 1 min";
  return `${Math.ceil(seconds / 60)} min`;
}
