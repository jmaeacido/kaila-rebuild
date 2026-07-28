/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock3, MapPin, PhilippinePeso, ShieldCheck, Star } from "lucide-react";
import { Button, Feedback, TextField } from "@kaila/ui";
import styles from "../../offers.module.css";

type Opportunity = {
  jobId: string;
  title: string;
  description: string;
  client: { displayName: string; avatarUrl: string | null; rating: string | null; reviewCount: number };
  area: { name: string };
  category: { name: string };
  scheduleType: string;
  scheduledAt: string | null;
  budgetMinCentavos: number | null;
  budgetMaxCentavos: number | null;
};
type Revision = {
  amountCentavos: number;
  availabilityText: string;
  estimatedDurationText: string | null;
  scope: string | null;
  message: string | null;
};
type Offer = {
  id: string;
  status: string;
  latestRevisionNumber: number;
  revisions: Revision[];
};

export default function MakeOfferPage({ params }: { params: Promise<{ jobId: string }> }) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "sending" | "success" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const { jobId } = await params;
      const [opportunitiesResponse, offersResponse] = await Promise.all([
        fetch("/api/v1/opportunities", { cache: "no-store" }),
        fetch(`/api/v1/jobs/${jobId}/offers`, { cache: "no-store" }),
      ]);
      if (!opportunitiesResponse.ok || !offersResponse.ok) throw new Error();
      const opportunities = (await opportunitiesResponse.json()) as { data: Opportunity[] };
      const offers = (await offersResponse.json()) as { data: Offer[] };
      setOpportunity(opportunities.data.find((item) => item.jobId === jobId) ?? null);
      setOffer(offers.data[0] ?? null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [params]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const data = new FormData(event.currentTarget);
    const { jobId } = await params;
    const payload = {
      amountCentavos: Math.round(Number(data.get("amount")) * 100),
      availabilityText: data.get("availability"),
      estimatedDurationText: data.get("duration") || null,
      scope: data.get("scope") || null,
      message: data.get("message") || null,
      expiresAt: null,
    };
    const response = await fetch(
      offer ? `/api/v1/offers/${offer.id}/revisions` : `/api/v1/jobs/${jobId}/offers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setOffer(((await response.json()) as { data: Offer }).data);
    setStatus("success");
  }

  const latest = offer?.revisions.at(-1);
  if (status === "loading") {
    return <main className={styles.shell}><div className={styles.skeletons}><span /></div></main>;
  }

  return (
    <main className={styles.shell}>
      <a className={styles.back} href="/opportunities"><ArrowLeft aria-hidden="true" />Opportunities</a>
      {opportunity && (
        <section className={styles.requestSummary}>
          <div className={styles.client}>
            <span className={styles.clientAvatar}>{opportunity.client.avatarUrl ? <img src={opportunity.client.avatarUrl} alt={`${opportunity.client.displayName} profile`} /> : opportunity.client.displayName[0]}</span>
            <span className={styles.clientText}><span>Posted by</span><strong>{opportunity.client.displayName}</strong><span className={styles.clientRating}><Star aria-hidden="true" />{reputation(opportunity.client.rating, opportunity.client.reviewCount)}</span></span>
          </div>
          <div><span>{opportunity.category.name}</span>{offer && <strong>Offer sent · Revision {offer.latestRevisionNumber}</strong>}</div>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.description}</p>
          <dl>
            <div><MapPin /><dt>Area</dt><dd>{opportunity.area.name}</dd></div>
            <div><Clock3 /><dt>When</dt><dd>{opportunity.scheduleType === "asap" ? "As soon as possible" : new Date(opportunity.scheduledAt || "").toLocaleString()}</dd></div>
            <div><PhilippinePeso /><dt>Client budget</dt><dd>{money(opportunity.budgetMinCentavos, opportunity.budgetMaxCentavos)}</dd></div>
          </dl>
          <small>The exact address stays private until the client hires.</small>
        </section>
      )}
      <header>
        <p>{offer ? "Your proposal" : "One clear proposal"}</p>
        <h2>{offer ? "Review or revise your offer" : "Make an offer"}</h2>
        <span>{offer ? "Your complete revision history is preserved." : "Your terms become part of an immutable negotiation history."}</span>
      </header>
      {status === "success" && <Feedback kind="success" title={offer && offer.latestRevisionNumber > 1 ? "Offer revised" : "Offer sent"}><ShieldCheck aria-hidden="true" />The client can review your latest price, timing, and details.</Feedback>}
      {status === "error" && <Feedback kind="error" title="Your offer wasn’t saved">Review your details and try again.</Feedback>}
      {(!offer || offer.status === "active") && (
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <TextField id="offer-amount" label="Price in pesos" name="amount" type="number" min="1" step="0.01" required defaultValue={latest ? latest.amountCentavos / 100 : undefined} />
          <TextField id="offer-availability" label="When can you start?" name="availability" placeholder="Today at 2 PM" required defaultValue={latest?.availabilityText} />
          <TextField id="offer-duration" label="Estimated duration" name="duration" placeholder="About two hours" defaultValue={latest?.estimatedDurationText ?? undefined} />
          <label>What’s included? <span>Optional</span><textarea name="scope" maxLength={2000} defaultValue={latest?.scope ?? undefined} /></label>
          <label>Message to the client <span>Optional</span><textarea name="message" maxLength={1000} defaultValue={latest?.message ?? undefined} /></label>
          <div className={styles.summary}><PhilippinePeso aria-hidden="true" /><p><strong>Price stays exact</strong><span>The client accepts this specific revision.</span></p><Clock3 aria-hidden="true" /><p><strong>You can revise later</strong><span>Earlier versions remain visible to both of you.</span></p></div>
          <Button type="submit" disabled={status === "sending"}>{status === "sending" ? "Saving…" : offer ? "Send revised offer" : "Send Offer"}</Button>
        </form>
      )}
    </main>
  );
}

function money(min: number | null, max: number | null) {
  if (min === null && max === null) return "Open to offers";
  const peso = (value: number | null) => value === null ? "—" : `₱${(value / 100).toLocaleString()}`;
  return `${peso(min)} – ${peso(max)}`;
}

function reputation(rating: string | null, count: number) {
  return rating ? `${Number(rating).toFixed(1)} · ${count} review${count === 1 ? "" : "s"}` : "New · No reviews yet";
}
