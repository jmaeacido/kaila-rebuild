"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  PhilippinePeso,
  Hammer,
  ImageIcon,
  LocateFixed,
  MapPinned,
  Video,
  Trash2,
  X,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { areaPathLabel, type AreaReference } from "../../address-hierarchy";
import { AttachmentPicker, attachmentFiles } from "../../../components/attachment-picker";
import { JobLocationMap, type JobLocation } from "../../post-job/job-location-map";
import styles from "./job-details.module.css";
import assetStyles from "./job-assets.module.css";
import { useRealtimeInvalidation } from "../../use-realtime-invalidation";
import { ServiceCategoryIcon } from "../../../components/service-category-icon";
import { formatTravelDistance, formatTravelEta, type TravelMetrics } from "../../travel-metrics";
import { MediaViewer, type ViewableMedia } from "../../../components/media-viewer";

type Reference = { id: number; name: string };
type CategoryReference = Reference & { icon: string };
type TimelineEvent = { id: string; type: string; occurredAt: string };
type LocationStatus = "idle" | "locating" | "resolving" | "pinned" | "error";
type JobAsset = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: "pending" | "clean" | "rejected" | "failed";
  url: string | null;
};
type Job = {
  id: string;
  role: "client" | "provider";
  status: string;
  title: string;
  description: string;
  category: CategoryReference;
  area: Reference & { parent_id: number | null };
  scheduleType: "asap" | "scheduled";
  scheduledAt: string | null;
  budgetMinCentavos: number | null;
  budgetMaxCentavos: number | null;
  addressLabel: string | null;
  location: { latitude: string | number; longitude: string | number } | null;
  postedAt: string | null;
  canEdit: boolean;
  canCancel: boolean;
  timeline: TimelineEvent[];
  assets: JobAsset[];
  counterpart: {
    role: "client" | "provider";
    displayName: string;
    avatarUrl: string | null;
    rating: string | number | null;
    reviewCount: number;
  } | null;
  travel: TravelMetrics | null;
  serviceLocationMode: "at_client" | "at_provider" | "remote";
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  posted: "Waiting for offers",
  offers_received: "Offers received",
  provider_selected: "Provider selected",
  provider_traveling: "Provider on the way",
  working: "Work in progress",
  completion_submitted: "Waiting for confirmation",
  revision_requested: "Revision requested",
  completed: "Completed",
  rated_closed: "Completed and rated",
  cancelled: "Cancelled",
  disputed: "Under review",
};

function pesos(value: number | null): string {
  return value === null ? "Open" : `₱${(value / 100).toLocaleString()}`;
}

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const [job, setJob] = useState<Job | null>(null);
  const [categories, setCategories] = useState<Reference[]>([]);
  const [areas, setAreas] = useState<AreaReference[]>([]);
  const [editing, setEditing] = useState(false);
  const [editAreaId, setEditAreaId] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState<JobLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationNotice, setLocationNotice] = useState("");
  const [removedAssetIds, setRemovedAssetIds] = useState<string[]>([]);
  const pinRequest = useRef(0);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { jobId } = await params;
      const [jobResponse, referenceResponse] = await Promise.all([
        fetch(`/api/v1/jobs/${jobId}`, { cache: "no-store" }),
        fetch("/api/v1/marketplace/reference-data", { cache: "no-store" }),
      ]);
      if (!jobResponse.ok || !referenceResponse.ok) throw new Error();
      setJob(((await jobResponse.json()) as { data: Job }).data);
      const references = (await referenceResponse.json()) as {
        data: { categories: Reference[]; areas: AreaReference[] };
      };
      setCategories(references.data.categories);
      setAreas(references.data.areas);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [params]);
  useRealtimeInvalidation(() => void load(), (event) =>
    (event.resourceType === "service_job" && event.resourceId === job?.id)
    || event.data.jobId === job?.id,
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) return;
    setStatus("saving");
    setNotice("");
    const data = new FormData(event.currentTarget);
    if (!editLocation) {
      setStatus("ready");
      setLocationStatus("error");
      setLocationNotice("Place the job-site pin before saving.");
      return;
    }
    const newAttachments = attachmentFiles(data, "attachments");
    const response = await fetch(`/api/v1/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        description: data.get("description"),
        categoryId: Number(data.get("categoryId")),
        areaId: Number(data.get("areaId")),
        scheduleType: data.get("scheduleType"),
        scheduledAt:
          data.get("scheduleType") === "scheduled"
            ? new Date(String(data.get("scheduledAt"))).toISOString()
            : null,
        budgetMinCentavos: data.get("budgetMin")
          ? Math.round(Number(data.get("budgetMin")) * 100)
          : null,
        budgetMaxCentavos: data.get("budgetMax")
          ? Math.round(Number(data.get("budgetMax")) * 100)
          : null,
        addressLabel: data.get("addressLabel") || null,
        latitude: editLocation.latitude,
        longitude: editLocation.longitude,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setStatus("ready");
      setNotice(body?.error?.message || "This job could not be updated.");
      return;
    }
    try {
      for (const assetId of removedAssetIds) {
        const removed = await fetch(`/api/v1/job-assets/${assetId}`, { method: "DELETE" });
        if (!removed.ok) throw new Error("MEDIA_UPDATE_FAILED");
      }
      for (const file of newAttachments) {
        const upload = new FormData();
        upload.set("file", file);
        const uploaded = await fetch(`/api/v1/jobs/${job.id}/assets`, {
          method: "POST",
          body: upload,
        });
        if (!uploaded.ok) throw new Error("MEDIA_UPDATE_FAILED");
      }
      await load();
      setEditing(false);
      setRemovedAssetIds([]);
      setNotice("Your job details, location, and media were updated.");
    } catch {
      await load();
      setEditing(false);
      setRemovedAssetIds([]);
      setNotice("Your job details were saved, but some media changes could not be completed. Review the job and try again.");
    }
  }

  async function pin(location: JobLocation, source: "current" | "map") {
    if (!job) return;
    const request = ++pinRequest.current;
    setLocationStatus("resolving");
    setLocationNotice("Checking the pinned barangay…");
    try {
      const response = await fetch(
        `/api/v1/jobs/resolve-area?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as {
        data?: { id: number; name: string; city: string | null };
        message?: string;
      };
      if (request !== pinRequest.current) return;
      if (!response.ok || !body.data) throw new Error(body.message || "KAILA could not identify this pin.");
      setEditLocation(location);
      setEditAreaId(String(body.data.id));
      setLocationStatus("pinned");
      setLocationNotice(
        `${source === "current" ? "Current location" : "Job site"} pinned in ${[body.data.name, body.data.city].filter(Boolean).join(", ")}.`,
      );
    } catch (error) {
      if (request !== pinRequest.current) return;
      setLocationStatus("error");
      setLocationNotice(error instanceof Error ? error.message : "KAILA could not identify this pin.");
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationNotice("This device does not support GPS. Choose the job site on the map.");
      return;
    }
    setLocationStatus("locating");
    setLocationNotice("Finding your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setShowMap(true);
        void pin({ latitude: position.coords.latitude, longitude: position.coords.longitude }, "current");
      },
      () => {
        setLocationStatus("error");
        setLocationNotice("KAILA could not get your location. Enable permission or choose the job site on the map.");
      },
      { timeout: 12000, maximumAge: 30000, enableHighAccuracy: true },
    );
  }

  function beginEditing() {
    setEditAreaId(String(job?.area.id ?? ""));
    setEditLocation(
      job?.location
        ? { latitude: Number(job.location.latitude), longitude: Number(job.location.longitude) }
        : null,
    );
    setLocationStatus(job?.location ? "pinned" : "idle");
    setLocationNotice("");
    setRemovedAssetIds([]);
    setShowMap(Boolean(job?.location));
    setEditing(true);
  }

  async function cancelJob(event: FormEvent) {
    event.preventDefault();
    if (!job || cancelReason.trim().length < 10) return;
    setStatus("saving");
    const response = await fetch(`/api/v1/jobs/${job.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });
    if (!response.ok) {
      setStatus("ready");
      setNotice("This job could not be cancelled. Review its current status and try again.");
      return;
    }
    const result = (await response.json()) as {
      data: { status: string; requestId?: string };
    };
    setCancelling(false);
    setCancelReason("");
    setNotice(
      response.status === 202
        ? "Cancellation request sent to the provider."
        : "The job was cancelled.",
    );
    if (result.data.status === "cancelled") {
      await load();
    } else {
      setStatus("ready");
    }
  }

  if (status === "loading" && !job) {
    return <main className={styles.shell}><div className={styles.skeleton} /></main>;
  }
  if (status === "error" || !job) {
    return (
      <main className={styles.shell}>
        <Feedback kind="error" title="Job details are unavailable">
          Check your connection or return to Home.
        </Feedback>
        <Link href="/home">Back to Home</Link>
      </main>
    );
  }

  const isDraft = job.status === "draft";
  const isHired = !["draft", "posted", "offers_received", "cancelled"].includes(job.status);
  const areaLabel = areaPathLabel(areas, String(job.area.id)) || job.area.name;
  const viewableMedia = job.assets.filter((asset): asset is JobAsset & { url: string } => asset.url !== null && (asset.mimeType.startsWith("image/") || asset.mimeType.startsWith("video/")));

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/home"><ArrowLeft aria-hidden="true" /> Home</Link>
        <span className={styles.status}>{statusLabels[job.status] || job.status}</span>
      </header>

      <section className={styles.hero}>
        <p><ServiceCategoryIcon icon={job.category.icon} aria-hidden="true" />{job.category.name}</p>
        <h1>{job.title}</h1>
        <span>{job.postedAt ? `Posted ${new Date(job.postedAt).toLocaleString()}` : "Not posted yet"}</span>
      </section>

      {notice && (
        <Feedback kind={notice.includes("could not") ? "error" : "success"} title="Job update">
          {notice}
        </Feedback>
      )}

      {job.counterpart && (
        <section className={assetStyles.counterpart} aria-labelledby="counterpart-title">
          <span className={assetStyles.counterpartAvatar}>
            {job.counterpart.avatarUrl ? (
              <Image src={job.counterpart.avatarUrl} alt={`${job.counterpart.displayName} profile`} fill sizes="48px" unoptimized />
            ) : job.counterpart.displayName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p>{job.role === "client" ? "Your provider" : "Your client"}</p>
            <h2 id="counterpart-title">{job.counterpart.displayName}</h2>
            <span>{job.counterpart.rating === null ? "New · No published reviews" : `${Number(job.counterpart.rating).toFixed(1)} rating · ${job.counterpart.reviewCount} review${job.counterpart.reviewCount === 1 ? "" : "s"}`}</span>
          </div>
        </section>
      )}

      {isHired && job.status === "provider_traveling" && (
        <section className={assetStyles.routeSummary} aria-labelledby="route-summary-title">
          <div><Navigation aria-hidden="true" /><span><small>Distance to {job.serviceLocationMode === "at_provider" ? "shop" : "client"}</small><strong id="route-summary-title">{formatTravelDistance(job.travel?.distanceMeters ?? null)}</strong></span></div>
          <div><Clock3 aria-hidden="true" /><span><small>Estimated arrival</small><strong>{formatTravelEta(job.travel?.etaSeconds ?? null)}</strong></span></div>
        </section>
      )}

      {editing ? (
        <form className={styles.editForm} onSubmit={(event) => void save(event)}>
          <header><h2>Edit job</h2><button type="button" onClick={() => setEditing(false)} aria-label="Close edit form"><X /></button></header>
          <label>Short title<input name="title" required maxLength={120} defaultValue={job.title} /></label>
          <label>What needs to be done?<textarea name="description" required minLength={10} maxLength={3000} defaultValue={job.description} /></label>
          <label>
            Service
            <select name="categoryId" required defaultValue={job.category.id} disabled={!isDraft}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <input type="hidden" name="areaId" value={editAreaId || job.area.id} />
          <input type="hidden" name="categoryId" value={job.category.id} disabled={isDraft} />
          <div className={styles.scheduleChoices}>
            <label><input type="radio" name="scheduleType" value="asap" defaultChecked={job.scheduleType === "asap"} /> As soon as possible</label>
            <label><input type="radio" name="scheduleType" value="scheduled" defaultChecked={job.scheduleType === "scheduled"} /> Scheduled</label>
          </div>
          <label>Date and time<input name="scheduledAt" type="datetime-local" defaultValue={localDateTime(job.scheduledAt)} /></label>
          <div className={styles.budget}>
            <label>Budget from (₱)<input name="budgetMin" type="number" min="0" defaultValue={job.budgetMinCentavos === null ? "" : job.budgetMinCentavos / 100} /></label>
            <label>Budget to (₱)<input name="budgetMax" type="number" min="0" defaultValue={job.budgetMaxCentavos === null ? "" : job.budgetMaxCentavos / 100} /></label>
          </div>
          <label>Landmark or address<input name="addressLabel" maxLength={180} defaultValue={job.addressLabel || ""} /></label>
          <section className={assetStyles.locationPicker} aria-labelledby="edit-job-site-pin">
            <div>
              <strong id="edit-job-site-pin">Job site pin</strong>
              <p>{editLocation ? "Pinned. Providers can see approximate distance." : "Use GPS at the job site or choose it on the map."}</p>
            </div>
            <div className={assetStyles.locationActions}>
              <Button type="button" variant="secondary" disabled={locationStatus === "locating"} onClick={locate}>
                <LocateFixed aria-hidden="true" /> {locationStatus === "locating" ? "Finding location…" : "I am at the job site"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowMap(true)}>
                <MapPinned aria-hidden="true" /> Pick on map
              </Button>
            </div>
            {showMap && <JobLocationMap location={editLocation} onChange={(next) => void pin(next, "map")} />}
            {locationNotice && <p className={locationStatus === "error" ? assetStyles.locationError : assetStyles.locationStatus} role={locationStatus === "error" ? "alert" : "status"}>{locationNotice}</p>}
            <p className={assetStyles.locationNote}>Your exact pin and landmark stay private until hiring.</p>
          </section>
          <section className={assetStyles.mediaEditor} aria-labelledby="edit-job-media">
            <div>
              <h3 id="edit-job-media">Job photos and videos</h3>
              <p>Keep up to five files that help providers understand the work.</p>
            </div>
            {job.assets.filter((asset) => !removedAssetIds.includes(asset.id)).length > 0 && (
              <div className={assetStyles.grid}>
                {job.assets.filter((asset) => !removedAssetIds.includes(asset.id)).map((asset) => (
                  <article className={assetStyles.asset} key={asset.id}>
                    <div className={assetStyles.preview}>
                      {asset.url && asset.mimeType.startsWith("image/") ? (
                        <Image src={asset.url} alt={asset.name} fill sizes="(max-width: 479px) 50vw, 180px" unoptimized />
                      ) : asset.url && asset.mimeType.startsWith("video/") ? (
                        <video src={asset.url} controls preload="metadata" aria-label={asset.name} />
                      ) : asset.mimeType.startsWith("video/") ? (
                        <Video aria-hidden="true" />
                      ) : (
                        <ImageIcon aria-hidden="true" />
                      )}
                    </div>
                    <span><strong>{asset.name}</strong><small>{asset.scanStatus === "clean" ? "Ready to view" : "Safety scan in progress"}</small></span>
                    <button type="button" className={assetStyles.remove} onClick={() => setRemovedAssetIds((current) => [...current, asset.id])} aria-label={`Remove ${asset.name}`}><Trash2 aria-hidden="true" /></button>
                  </article>
                ))}
              </div>
            )}
            <AttachmentPicker
              name="attachments"
              maxFiles={Math.max(0, 5 - (job.assets.length - removedAssetIds.length))}
              hint={`${Math.max(0, 5 - (job.assets.length - removedAssetIds.length))} file slots available, 10 MB each.`}
            />
          </section>
          {!isDraft && <p className={styles.lockNote}>The service is locked after posting. Moving the job updates the matched providers.</p>}
          <div className={styles.formActions}><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Discard</Button><Button isLoading={status === "saving"}>Save changes</Button></div>
        </form>
      ) : (
        <>
          <section className={styles.details}>
            <h2>Job details</h2>
            <p className={styles.description}>{job.description}</p>
            <dl>
              <div><ServiceCategoryIcon icon={job.category.icon} aria-hidden="true" /><dt>Service</dt><dd>{job.category.name}</dd></div>
              <div><MapPin /><dt>Area</dt><dd>{areaLabel}</dd></div>
              <div><CalendarClock /><dt>When</dt><dd>{job.scheduleType === "asap" ? "As soon as possible" : new Date(job.scheduledAt || "").toLocaleString()}</dd></div>
              <div><PhilippinePeso /><dt>Budget</dt><dd>{job.budgetMinCentavos === null && job.budgetMaxCentavos === null ? "Open" : `${pesos(job.budgetMinCentavos)} – ${pesos(job.budgetMaxCentavos)}`}</dd></div>
            </dl>
            {job.addressLabel && <p className={styles.privateDetail}><MapPin /> {job.addressLabel} <span>{isHired ? "Shared with job participants" : "Private until hiring"}</span></p>}
          </section>

          {job.assets.length > 0 && (
            <section className={assetStyles.section}>
              <h2>Job photos and videos</h2>
              <div className={assetStyles.grid}>
                {job.assets.map((asset) => (
                  <article className={assetStyles.asset} key={asset.id}>
                    {asset.url && (asset.mimeType.startsWith("image/") || asset.mimeType.startsWith("video/")) ? (
                    <button className={assetStyles.preview} type="button" onClick={() => setSelectedMediaIndex(viewableMedia.findIndex((candidate) => candidate.id === asset.id))} aria-label={`Preview ${asset.name}`}>
                      {asset.mimeType.startsWith("image/") ? <Image src={asset.url} alt={asset.name} fill sizes="(max-width: 479px) 50vw, 180px" unoptimized /> : <><video src={asset.url} muted playsInline preload="metadata" aria-hidden="true" /><span className={assetStyles.playBadge}><Video aria-hidden="true" /></span></>}
                    </button>
                    ) : (
                    <div className={assetStyles.preview}>
                      {asset.mimeType.startsWith("video/") ? (
                        <Video aria-hidden="true" />
                      ) : (
                        <ImageIcon aria-hidden="true" />
                      )}
                    </div>
                    )}
                    <span>
                      <strong>{asset.name}</strong>
                      <small>
                        {asset.scanStatus === "clean"
                          ? "Ready to view"
                          : asset.scanStatus === "pending"
                            ? "Safety scan in progress"
                            : asset.scanStatus === "failed"
                              ? "Safety scan delayed"
                              : "Unavailable after safety review"}
                      </small>
                    </span>
                    {asset.url && <button className={assetStyles.openAsset} type="button" onClick={() => setSelectedMediaIndex(viewableMedia.findIndex((candidate) => candidate.id === asset.id))}>View {asset.mimeType.startsWith("video/") ? "video" : "image"}</button>}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className={styles.timeline}>
            <h2>Activity</h2>
            {job.timeline.map((event) => (
              <div key={event.id}><Clock3 /><span><strong>{event.type.replaceAll(".", " ")}</strong><small>{new Date(event.occurredAt).toLocaleString()}</small></span></div>
            ))}
          </section>

          <div className={styles.actions}>
            {job.canEdit && <Button onClick={beginEditing}><Pencil /> Edit job</Button>}
            {["posted", "offers_received"].includes(job.status) && <Button variant="secondary" onClick={() => location.assign(`/jobs/${job.id}/offers`)}>View offers</Button>}
            {isHired && <Button onClick={() => location.assign(`/jobs/${job.id}/hired/conversation`)}><MessageCircle /> Message {job.role === "client" ? "provider" : "client"}</Button>}
            {isHired && job.serviceLocationMode !== "remote" && ["provider_selected", "provider_traveling"].includes(job.status) && <Button variant="secondary" onClick={() => location.assign(`/jobs/${job.id}/hired/travel`)}><Navigation /> {job.serviceLocationMode === "at_provider" ? job.role === "client" ? "Navigate to Shop" : "Track client" : job.role === "provider" ? "Navigate to Client" : "Track provider"}</Button>}
            {isHired && <Button variant="secondary" onClick={() => location.assign(`/jobs/${job.id}/work`)}><Hammer /> {job.status === "provider_selected" && job.role === "provider" ? "Start work" : "Work status"}</Button>}
            {job.canCancel && <Button variant="danger" onClick={() => setCancelling(true)}><Trash2 /> Cancel job</Button>}
          </div>
          {!job.canEdit && !["cancelled", "completed", "rated_closed"].includes(job.status) && (
            <p className={styles.lockNote}>Editing is locked because an offer or work agreement already exists.</p>
          )}
        </>
      )}

      {cancelling && (
        <section className={styles.cancelPanel} aria-labelledby="cancel-title">
          <header><div><p>Important action</p><h2 id="cancel-title">Cancel this job?</h2></div><button type="button" onClick={() => setCancelling(false)} aria-label="Close cancellation"><X /></button></header>
          <p>This preserves the job history. Tell us why you need to cancel.</p>
          <form onSubmit={(event) => void cancelJob(event)}>
            <label>Reason<textarea required minLength={10} maxLength={1000} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Briefly explain what changed." /></label>
            <div><Button type="button" variant="secondary" onClick={() => setCancelling(false)}>Keep job</Button><Button variant="danger" disabled={cancelReason.trim().length < 10 || status === "saving"}>Confirm cancellation</Button></div>
          </form>
        </section>
      )}
      {selectedMediaIndex !== null && <MediaViewer assets={viewableMedia as ViewableMedia[]} initialIndex={selectedMediaIndex} onClose={() => setSelectedMediaIndex(null)} />}
    </main>
  );
}
