/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Clock3, MapPin, MessageSquareQuote, Navigation, RefreshCw, Star, UsersRound } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { ActionModal } from "../../../../components/action-modal";
import { OfferTermsForm, type OfferTermsPayload } from "../../../../components/offer-terms-form";
import styles from "../../../offers.module.css";
import { useRealtimeInvalidation } from "../../../use-realtime-invalidation";

type Offer = {
  id: string;
  status: string;
  provider: {
    displayName: string;
    avatarUrl: string | null;
    rating: string | null;
    reviewCount: number;
    completedJobs: number;
    responseMinutes: number | null;
    verified: boolean;
    address: string;
    distance: string;
  };
  revisions: Array<{
    id: string;
    amountCentavos: number;
    availabilityText: string;
    estimatedDurationText: string | null;
    scope: string | null;
    message: string | null;
    revisionNumber: number;
  }>;
};

export default function CompareOffersPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error" | "selected" | "countering">("loading");
  const [counterOffer, setCounterOffer] = useState<Offer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/offers`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOffers(((await response.json()) as { data: Offer[] }).data);
      setState((current) => (current === "countering" || current === "selected" ? current : "ready"));
    } catch {
      setState((current) => (current === "countering" || current === "selected" ? current : "error"));
    }
  }, [jobId]);
  useRealtimeInvalidation(() => void load(), (event) => event.data.jobId === jobId);
  useEffect(() => {
    void load();
    const reconcile = () => void load();
    window.addEventListener("online", reconcile);
    return () => window.removeEventListener("online", reconcile);
  }, [load]);

  async function select(revisionId: string) {
    const response = await fetch(`/api/v1/jobs/${jobId}/select-offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerRevisionId: revisionId }),
    });
    setState(response.ok ? "selected" : "error");
  }

  async function submitCounter(payload: OfferTermsPayload) {
    if (!counterOffer) return;
    setState("countering");
    setNotice(null);
    const response = await fetch(`/api/v1/offers/${counterOffer.id}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setState("error");
      setNotice("Your counteroffer could not be sent. Try again.");
      return;
    }
    const updated = ((await response.json()) as { data: Offer }).data;
    setOffers((current) => current.map((offer) => (offer.id === updated.id ? updated : offer)));
    setCounterOffer(null);
    setState("ready");
    setNotice(`Counteroffer sent to ${counterOffer.provider.displayName}.`);
  }

  if (state === "selected") {
    return <main className={styles.shell}><section className={styles.success}><BadgeCheck aria-hidden="true" /><h1>Provider selected</h1><p>The agreed price and offer details are saved. Your provider has been notified.</p><Button onClick={() => location.assign(`/jobs/${jobId}`)}>Continue to job</Button></section></main>;
  }

  const latestForCounter = counterOffer?.revisions.at(-1);

  return (
    <main className={styles.shell}>
      <a className={styles.back} href={`/jobs/${jobId}`}><ArrowLeft aria-hidden="true" />Job details</a>
      <header className={styles.compareHeader}><div><p>Choose with confidence</p><h1>Compare offers</h1><span>Price, timing, location, and trust in one place.</span></div><Button variant="secondary" onClick={() => void load()}><RefreshCw aria-hidden="true" />Refresh</Button></header>
      {notice && <Feedback kind="success" title="Negotiation updated">{notice}</Feedback>}
      {state === "loading" && <div className={styles.skeletons} aria-label="Loading offers"><span /><span /></div>}
      {state === "error" && <Feedback kind="error" title="We couldn’t refresh offers">Check your connection, then try again.</Feedback>}
      {state === "ready" && offers.length === 0 && <section className={styles.empty}><UsersRound aria-hidden="true" /><h2>No offers yet</h2><p>We’ll notify you as soon as a matching provider responds.</p><Button variant="secondary" onClick={() => void load()}>Check again</Button></section>}
      <section className={styles.offerGrid}>
        {offers.map((offer) => {
          const latest = offer.revisions.at(-1)!;
          return (
            <article key={offer.id}>
              <div className={styles.provider}><span className={styles.avatar}>{offer.provider.avatarUrl ? <img src={offer.provider.avatarUrl} alt={`${offer.provider.displayName} profile`} /> : offer.provider.displayName[0]}</span><div><h2>{offer.provider.displayName}</h2><p>{offer.provider.verified && <><BadgeCheck aria-label="Identity verified" /> Verified · </>}<Star aria-hidden="true" /> {reputation(offer.provider.rating, offer.provider.reviewCount)} · {offer.provider.completedJobs} jobs</p></div></div>
              <p className={styles.price}>₱{(latest.amountCentavos / 100).toLocaleString()}</p>
              <dl>
                <div><Clock3 aria-hidden="true" /><dt>Available</dt><dd>{latest.availabilityText}</dd></div>
                <div><RefreshCw aria-hidden="true" /><dt>Response</dt><dd>{offer.provider.responseMinutes ? `${offer.provider.responseMinutes} min` : "New provider"}</dd></div>
                <div><MapPin aria-hidden="true" /><dt>Service area</dt><dd>{offer.provider.address || "Not provided"}</dd></div>
                <div><Navigation aria-hidden="true" /><dt>Distance</dt><dd>{offer.provider.distance}</dd></div>
              </dl>
              {(latest.scope || latest.message) && <div className={styles.scope}>{latest.scope && <><strong>What’s included</strong><p>{latest.scope}</p></>}{latest.message && <blockquote>{latest.message}</blockquote>}</div>}
              <p className={styles.history}>Revision {latest.revisionNumber} · {offer.revisions.length} version{offer.revisions.length === 1 ? "" : "s"} preserved</p>
              <div className={styles.offerActions}>
                <Button disabled={offer.status !== "active"} onClick={() => void select(latest.id)}>Hire {offer.provider.displayName}</Button>
                <Button
                  variant="secondary"
                  disabled={offer.status !== "active"}
                  onClick={() => {
                    setNotice(null);
                    setCounterOffer(offer);
                  }}
                >
                  <MessageSquareQuote aria-hidden="true" /> Counter
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      {counterOffer && latestForCounter && (
        <ActionModal
          eyebrow="Quick counteroffer"
          title={`Counter ${counterOffer.provider.displayName}`}
          onClose={() => {
            if (state !== "countering") setCounterOffer(null);
          }}
        >
          <OfferTermsForm
            key={`${counterOffer.id}-${latestForCounter.revisionNumber}`}
            defaults={latestForCounter}
            saving={state === "countering"}
            submitLabel={state === "countering" ? "Sending…" : "Send counteroffer"}
            onSubmit={submitCounter}
          />
        </ActionModal>
      )}
    </main>
  );
}

function reputation(rating: string | null, count: number) {
  return rating ? `${Number(rating).toFixed(1)} · ${count} review${count === 1 ? "" : "s"}` : "New · No reviews yet";
}
