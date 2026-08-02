"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Navigation, PhilippinePeso } from "lucide-react";
import { OpportunityRouteMetrics } from "../components/job-request-location";
import { formatMatchBudget } from "./match-opportunity-budget";

export type MatchOpportunitySummary = {
  id: number;
  jobId: string;
  title: string;
  area: { name: string };
  client: { displayName: string; avatarUrl: string | null };
  budgetMinCentavos: number | null;
  budgetMaxCentavos: number | null;
  approximateLocation: { latitude: number; longitude: number } | null;
};

export { formatMatchBudget } from "./match-opportunity-budget";

export function useMatchOpportunity(jobId: string) {
  const [opportunity, setOpportunity] = useState<MatchOpportunitySummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void fetch("/api/v1/opportunities", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { data: MatchOpportunitySummary[] };
        if (!active) return;
        const match = body.data.find((item) => item.jobId === jobId) ?? null;
        setOpportunity(match);
        setStatus(match ? "ready" : "error");
      })
      .catch(() => {
        if (!active) return;
        setOpportunity(null);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  return { opportunity, status };
}

export function MatchOpportunityAvatar({ opportunity }: { opportunity: MatchOpportunitySummary | null }) {
  if (opportunity?.client.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={opportunity.client.avatarUrl} alt={`${opportunity.client.displayName} profile`} />
    );
  }
  if (opportunity) {
    return <span aria-hidden="true">{opportunity.client.displayName.charAt(0).toUpperCase()}</span>;
  }
  return null;
}

export function MatchOpportunityDetails({
  opportunity,
  status,
}: {
  opportunity: MatchOpportunitySummary | null;
  status: "loading" | "ready" | "error";
}) {
  if (status === "loading") {
    return (
      <div className="appToastMatchMeta" aria-busy="true">
        <span>Loading match details…</span>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="appToastMatchMeta">
        <span>Open the job for full match details.</span>
      </div>
    );
  }

  return (
    <div className="appToastMatchMeta">
      <span><MapPin aria-hidden="true" />{opportunity.area.name}</span>
      <span>
        <Navigation aria-hidden="true" />
        <OpportunityRouteMetrics opportunityId={opportunity.id} location={opportunity.approximateLocation} />
      </span>
      <span><PhilippinePeso aria-hidden="true" />{formatMatchBudget(opportunity.budgetMinCentavos, opportunity.budgetMaxCentavos)}</span>
    </div>
  );
}

export function MatchOpportunityPrompt({
  jobId,
  children,
}: {
  jobId: string;
  children: (state: { opportunity: MatchOpportunitySummary | null; status: "loading" | "ready" | "error" }) => ReactNode;
}) {
  const state = useMatchOpportunity(jobId);
  return <>{children(state)}</>;
}
