import { useRealtimeInvalidation } from "../../../use-realtime-invalidation";

export function useJobRealtime(jobId: string, refresh: () => void) {
  useRealtimeInvalidation(refresh, (event) =>
    (event.resourceType === "service_job" && event.resourceId === jobId)
    || event.data.jobId === jobId,
  );
}
