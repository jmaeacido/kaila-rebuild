/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImageIcon,
  MapPin,
  PhilippinePeso,
  RotateCcw,
  ShieldCheck,
  Star,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { ActionModal } from "../../../components/action-modal";
import {
  OfferTermsForm,
  suggestedAmountCentavos,
  suggestedAvailability,
  type OfferTermsDefaults,
  type OfferTermsPayload,
} from "../../../components/offer-terms-form";
import styles from "../../offers.module.css";
import mediaStyles from "./opportunity-media.module.css";
import { useRealtimeInvalidation } from "../../use-realtime-invalidation";
import { ServiceCategoryIcon } from "../../../components/service-category-icon";
import { JobRequestLocation } from "../../../components/job-request-location";

type Opportunity = {
  id: number;
  jobId: string;
  title: string;
  description: string;
  client: { displayName: string; avatarUrl: string | null; rating: string | null; reviewCount: number };
  area: { name: string };
  category: { name: string; icon: string };
  scheduleType: string;
  scheduledAt: string | null;
  budgetMinCentavos: number | null;
  budgetMaxCentavos: number | null;
  approximateAddress: string;
  approximateLocation: { latitude: number; longitude: number } | null;
  assets: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  }[];
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
  const { jobId } = use(params);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "sending" | "success" | "error">("loading");
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [mediaZoomed, setMediaZoomed] = useState(false);
  const closeMediaButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const [opportunitiesResponse, offersResponse] = await Promise.all([
        fetch("/api/v1/opportunities", { cache: "no-store" }),
        fetch(`/api/v1/jobs/${jobId}/offers`, { cache: "no-store" }),
      ]);
      if (!opportunitiesResponse.ok || !offersResponse.ok) throw new Error();
      const opportunities = (await opportunitiesResponse.json()) as { data: Opportunity[] };
      const offers = (await offersResponse.json()) as { data: Offer[] };
      setOpportunity(opportunities.data.find((item) => item.jobId === jobId) ?? null);
      setOffer(offers.data[0] ?? null);
      setStatus((current) => (current === "sending" ? current : "idle"));
    } catch {
      setStatus((current) => (current === "sending" ? current : "error"));
    }
  }, [jobId]);
  useRealtimeInvalidation(() => void load(), (event) => event.data.jobId === jobId);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  const closeMedia = useCallback(() => {
    setSelectedMediaIndex(null);
    setMediaZoomed(false);
  }, []);

  const moveMedia = useCallback((direction: -1 | 1) => {
    setMediaZoomed(false);
    setSelectedMediaIndex((current) => {
      const count = opportunity?.assets.length ?? 0;
      if (current === null || count === 0) return current;
      return (current + direction + count) % count;
    });
  }, [opportunity]);

  useEffect(() => {
    if (selectedMediaIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeMediaButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMedia();
      if (event.key === "ArrowLeft") moveMedia(-1);
      if (event.key === "ArrowRight") moveMedia(1);
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
    };
  }, [closeMedia, moveMedia, selectedMediaIndex]);

  async function submitOffer(payload: OfferTermsPayload) {
    setStatus("sending");
    const response = await fetch(
      offer ? `/api/v1/offers/${offer.id}/revisions` : `/api/v1/jobs/${jobId}/offers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setOffer(((await response.json()) as { data: Offer }).data);
    setOfferOpen(false);
    setStatus("success");
  }

  const latest = offer?.revisions.at(-1);
  const canOffer = !offer || offer.status === "active";
  const defaults: OfferTermsDefaults = latest
    ? latest
    : {
        amountCentavos: opportunity
          ? suggestedAmountCentavos(opportunity.budgetMinCentavos, opportunity.budgetMaxCentavos)
          : null,
        availabilityText: opportunity
          ? suggestedAvailability(opportunity.scheduleType, opportunity.scheduledAt)
          : "",
      };

  if (status === "loading") {
    return <main className={styles.shell}><div className={styles.skeletons}><span /></div></main>;
  }

  return (
    <main className={`${styles.shell} ${styles.offerShell}`}>
      <a className={styles.back} href="/opportunities"><ArrowLeft aria-hidden="true" />Opportunities</a>
      {opportunity && (
        <section className={styles.requestSummary}>
          <div className={styles.client}>
            <span className={styles.clientAvatar}>{opportunity.client.avatarUrl ? <img src={opportunity.client.avatarUrl} alt={`${opportunity.client.displayName} profile`} /> : opportunity.client.displayName[0]}</span>
            <span className={styles.clientText}><span>Posted by</span><strong>{opportunity.client.displayName}</strong><span className={styles.clientRating}><Star aria-hidden="true" />{reputation(opportunity.client.rating, opportunity.client.reviewCount)}</span></span>
          </div>
          <div><span><ServiceCategoryIcon icon={opportunity.category.icon} aria-hidden="true" />{opportunity.category.name}</span>{offer && <strong>Offer sent · Revision {offer.latestRevisionNumber}</strong>}</div>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.description}</p>
          <JobRequestLocation opportunityId={opportunity.id} address={opportunity.approximateAddress} location={opportunity.approximateLocation} />
          <dl>
            <div><MapPin /><dt>Area</dt><dd>{opportunity.area.name}</dd></div>
            <div><Clock3 /><dt>When</dt><dd>{opportunity.scheduleType === "asap" ? "As soon as possible" : new Date(opportunity.scheduledAt || "").toLocaleString()}</dd></div>
            <div><PhilippinePeso /><dt>Client budget</dt><dd>{money(opportunity.budgetMinCentavos, opportunity.budgetMaxCentavos)}</dd></div>
          </dl>
          {opportunity.assets.length > 0 && (
            <section className={mediaStyles.section} aria-labelledby="job-media-title">
              <h2 id="job-media-title">Job photos and videos</h2>
              <div className={mediaStyles.grid}>
                {opportunity.assets.map((asset) => (
                  <article className={mediaStyles.asset} key={asset.id}>
                    {asset.mimeType.startsWith("image/") ? (
                      <button className={mediaStyles.preview} type="button" onClick={() => setSelectedMediaIndex(opportunity.assets.indexOf(asset))} aria-label={`Preview ${asset.name}`}>
                        <img src={asset.url} alt={asset.name} loading="lazy" />
                      </button>
                    ) : asset.mimeType.startsWith("video/") ? (
                      <button className={mediaStyles.preview} type="button" onClick={() => setSelectedMediaIndex(opportunity.assets.indexOf(asset))} aria-label={`Preview video ${asset.name}`}>
                        <video src={asset.url} muted playsInline preload="metadata" aria-hidden="true" />
                        <span className={mediaStyles.playBadge}><Video aria-hidden="true" /></span>
                      </button>
                    ) : (
                      <span className={mediaStyles.fallback}>
                        {asset.mimeType.startsWith("video/") ? <Video aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
                      </span>
                    )}
                    <strong title={asset.name}>{asset.name}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}
          <small>The exact address stays private until the client hires.</small>
        </section>
      )}

      {status === "success" && (
        <Feedback kind="success" title={offer && offer.latestRevisionNumber > 1 ? "Offer revised" : "Offer sent"}>
          <ShieldCheck aria-hidden="true" />The client can compare your price and timing with other providers.
        </Feedback>
      )}
      {status === "error" && <Feedback kind="error" title="Your offer wasn’t saved">Check your connection and try again.</Feedback>}

      {latest && (
        <section className={styles.sentOffer} aria-labelledby="sent-offer-title">
          <header>
            <p>Your latest offer</p>
            <h2 id="sent-offer-title">₱{(latest.amountCentavos / 100).toLocaleString()}</h2>
          </header>
          <dl>
            <div><Clock3 aria-hidden="true" /><dt>Available</dt><dd>{latest.availabilityText}</dd></div>
            {latest.estimatedDurationText && <div><RotateCcw aria-hidden="true" /><dt>Duration</dt><dd>{latest.estimatedDurationText}</dd></div>}
          </dl>
          {(latest.scope || latest.message) && (
            <div className={styles.scope}>
              {latest.scope && <><strong>What’s included</strong><p>{latest.scope}</p></>}
              {latest.message && <blockquote>{latest.message}</blockquote>}
            </div>
          )}
          <p className={styles.history}>Revision {offer?.latestRevisionNumber} preserved in negotiation history</p>
        </section>
      )}

      {canOffer && (
        <div className={styles.offerDock}>
          <div>
            <p>{offer ? "Still competing" : "Move fast"}</p>
            <span>{offer ? "Send a revised price or timing in seconds." : "Other providers may already be offering. Price and timing are enough."}</span>
          </div>
          <Button onClick={() => setOfferOpen(true)}>
            {offer ? <RotateCcw aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            {offer ? "Revise offer" : "Send offer"}
          </Button>
        </div>
      )}

      {offerOpen && canOffer && (
        <ActionModal
          eyebrow={offer ? "Quick revision" : "Quick offer"}
          title={offer ? "Revise your offer" : "Send your offer"}
          onClose={() => setOfferOpen(false)}
        >
          <OfferTermsForm
            key={offer?.latestRevisionNumber ?? "new"}
            defaults={defaults}
            saving={status === "sending"}
            submitLabel={status === "sending" ? "Sending…" : offer ? "Send revised offer" : "Send offer"}
            onSubmit={submitOffer}
          />
        </ActionModal>
      )}

      {selectedMediaIndex !== null && opportunity?.assets[selectedMediaIndex] && (
        <div className={mediaStyles.viewer} role="dialog" aria-modal="true" aria-labelledby="media-viewer-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMedia(); }}>
          <section className={mediaStyles.viewerPanel}>
            <header>
              <div>
                <h2 id="media-viewer-title">{opportunity.assets[selectedMediaIndex].name}</h2>
                <p>{selectedMediaIndex + 1} of {opportunity.assets.length}</p>
              </div>
              <button ref={closeMediaButton} type="button" onClick={closeMedia} aria-label="Close media preview"><X aria-hidden="true" /></button>
            </header>
            <div className={mediaStyles.viewerStage}>
              {opportunity.assets.length > 1 && <button className={mediaStyles.previous} type="button" onClick={() => moveMedia(-1)} aria-label="Previous attachment"><ChevronLeft aria-hidden="true" /></button>}
              {opportunity.assets[selectedMediaIndex].mimeType.startsWith("image/") ? (
                <img className={mediaZoomed ? mediaStyles.zoomed : ""} src={opportunity.assets[selectedMediaIndex].url} alt={opportunity.assets[selectedMediaIndex].name} />
              ) : (
                <video key={opportunity.assets[selectedMediaIndex].id} src={opportunity.assets[selectedMediaIndex].url} controls autoPlay playsInline preload="metadata" aria-label={opportunity.assets[selectedMediaIndex].name} />
              )}
              {opportunity.assets.length > 1 && <button className={mediaStyles.next} type="button" onClick={() => moveMedia(1)} aria-label="Next attachment"><ChevronRight aria-hidden="true" /></button>}
            </div>
            <footer>
              {opportunity.assets[selectedMediaIndex].mimeType.startsWith("image/") && (
                <>
                  <button type="button" onClick={() => setMediaZoomed((current) => !current)}>
                    {mediaZoomed ? <ZoomOut aria-hidden="true" /> : <ZoomIn aria-hidden="true" />}
                    {mediaZoomed ? "Zoom out" : "Zoom in"}
                  </button>
                  <button type="button" disabled={!mediaZoomed} onClick={() => setMediaZoomed(false)}><RotateCcw aria-hidden="true" /> Reset</button>
                </>
              )}
              <span>Use arrow keys to browse · Esc to close</span>
            </footer>
          </section>
        </div>
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
