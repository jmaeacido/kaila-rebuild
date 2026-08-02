"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  House,
  LocateFixed,
  MapPinned,
  MapPin,
  Store,
  Video,
  Send,
  X,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { JobLocationMap, type JobLocation } from "./job-location-map";
import { BudgetRange } from "./budget-range";
import { CategorySelect, type ServiceCategory } from "./category-select";
import { AttachmentPicker, attachmentFiles } from "../../components/attachment-picker";
import styles from "./page.module.css";

type Reference = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};
type Category = Reference & ServiceCategory;
type Step = 1 | 2 | 3;
type LocationStatus = "idle" | "locating" | "resolving" | "pinned" | "error";

export default function PostJobPage() {
  const [directProvider, setDirectProvider] = useState<{ id: number; displayName: string } | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const createKey = useRef(crypto.randomUUID());
  const pinRequest = useRef(0);
  const [showMap, setShowMap] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    areaId: "",
    scheduleType: "asap",
    serviceLocationMode: "at_client",
    scheduledAt: "",
    budgetMin: "",
    budgetMax: "",
    addressLabel: "",
    latitude: "",
    longitude: "",
  });

  const pinnedLocation =
    form.latitude && form.longitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;

  useEffect(() => {
    void fetch("/api/v1/marketplace/reference-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as {
          data: { categories: Category[]; areas: Reference[] };
        };
        setCategories(body.data.categories);
        const requestedCategory = new URLSearchParams(window.location.search).get("categoryId");
        const requestedProvider = new URLSearchParams(window.location.search).get("providerId");
        if (
          requestedCategory &&
          body.data.categories.some((category) => String(category.id) === requestedCategory)
        ) {
          setForm((current) => ({ ...current, categoryId: requestedCategory }));
        }
        if (requestedProvider) {
          const providerResponse = await fetch(`/api/v1/providers/${requestedProvider}`, { cache: "no-store" });
          if (!providerResponse.ok) throw new Error();
          const providerBody = (await providerResponse.json()) as { data: { id: number; displayName: string } };
          setDirectProvider(providerBody.data);
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  function field(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function pin(location: JobLocation, source: "current" | "map") {
    const request = ++pinRequest.current;
    setForm((current) => ({
      ...current,
      areaId: "",
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    }));
    setLocationStatus("resolving");
    setMessage("Checking the pinned barangay…");

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
      if (!response.ok || !body.data) {
        throw new Error(body.message || "KAILA could not identify this pin. Try another location.");
      }
      setForm((current) => ({ ...current, areaId: String(body.data?.id ?? "") }));
      setLocationStatus("pinned");
      const area = [body.data.name, body.data.city].filter(Boolean).join(", ");
      setMessage(
        `${source === "current" ? "Current location" : "Job site"} pinned in ${area}.`,
      );
    } catch (error) {
      if (request !== pinRequest.current) return;
      setLocationStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "KAILA could not identify this pin. Try another location.",
      );
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setMessage("This device does not support GPS. Choose the job site on the map.");
      return;
    }
    setLocationStatus("locating");
    setMessage("Finding your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void pin(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          "current",
        );
        setShowMap(true);
      },
      (error) => {
        setLocationStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enable it or choose the job site on the map."
            : "KAILA could not get a fresh GPS fix. Try again or choose the job site on the map.",
        );
      },
      { timeout: 12000, maximumAge: 30000, enableHighAccuracy: true },
    );
  }

  function clearPin() {
    pinRequest.current += 1;
    setForm((current) => ({
      ...current,
      areaId: "",
      latitude: "",
      longitude: "",
    }));
    setLocationStatus("idle");
    setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 3) {
      if (step === 1 && !form.categoryId) {
        setMessage("Choose a service before continuing.");
        return;
      }
      if (step === 2 && (!form.areaId || !form.latitude || !form.longitude)) {
        setLocationStatus("error");
        setMessage("Place the job-site pin in a supported barangay before continuing.");
        return;
      }
      setStep((step + 1) as Step);
      return;
    }
    setStatus("saving");
    const submission = new FormData(event.currentTarget as HTMLFormElement);
    const attachments = attachmentFiles(submission, "attachments");
    const payload = {
      title: form.title,
      description: form.description,
      categoryId: Number(form.categoryId),
      areaId: Number(form.areaId),
      scheduleType: form.scheduleType,
      serviceLocationMode: form.serviceLocationMode,
      scheduledAt:
        form.scheduleType === "scheduled" ? new Date(form.scheduledAt).toISOString() : null,
      budgetMinCentavos: form.budgetMin ? Math.round(Number(form.budgetMin) * 100) : null,
      budgetMaxCentavos: form.budgetMax ? Math.round(Number(form.budgetMax) * 100) : null,
      addressLabel: form.addressLabel || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      const created = await fetch(directProvider ? `/api/v1/providers/${directProvider.id}/direct-requests` : "/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": createKey.current },
        body: JSON.stringify(payload),
      });
      if (!created.ok) throw new Error();
      const body = (await created.json()) as { data: { id: string } };
      setCreatedJobId(body.data.id);
      for (const file of attachments) {
        const upload = new FormData();
        upload.set("file", file);
        const uploaded = await fetch(`/api/v1/jobs/${body.data.id}/assets`, {
          method: "POST",
          body: upload,
        });
        if (!uploaded.ok) {
          throw new Error("ATTACHMENT_UPLOAD_FAILED");
        }
      }
      if (!directProvider) {
        const posted = await fetch(`/api/v1/jobs/${body.data.id}/post`, { method: "POST" });
        if (!posted.ok) throw new Error();
      }
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && error.message === "ATTACHMENT_UPLOAD_FAILED"
          ? "A photo or video could not be uploaded, so your job was kept as a draft. Check your connection and try again."
          : "Your job could not be posted. Your details are still here—check your connection and try again.",
      );
    }
  }

  if (status === "loading") {
    return (
      <main className={styles.shell}>
        <div className={styles.skeleton} aria-label="Loading job form" />
      </main>
    );
  }
  if (status === "success") {
    return (
      <main className={styles.shell}>
        <section className={styles.success}>
          <CheckCircle2 aria-hidden="true" />
          <h1>{directProvider ? "Request sent" : "Your job is posted"}</h1>
          <p>{directProvider ? `${directProvider.displayName} received your private request. Your conversation is ready.` : "We’re alerting matching providers nearby."}</p>
          <Button onClick={() => location.assign(directProvider && createdJobId ? `/jobs/${createdJobId}/hired/conversation` : "/home")}>{directProvider ? "Open conversation" : "Back to Home"}</Button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header>
        <Link href="/home" aria-label="Back to home">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <span>Step {step} of 3</span>
          <progress value={step} max="3">
            {step} of 3
          </progress>
        </div>
      </header>
      <form onSubmit={submit}>
        <section className={styles.card}>
          {step === 1 && (
            <>
              <p className={styles.eyebrow}>{directProvider ? `Requesting ${directProvider.displayName}` : "Tell us what you need"}</p>
              <h1>{directProvider ? "What service do you need?" : "What can we help with?"}</h1>
              <label>
                Service
                <CategorySelect
                  categories={categories}
                  value={form.categoryId}
                  onChange={(value) => {
                    field("categoryId", value);
                    setMessage("");
                  }}
                />
              </label>
              {message && <p className={styles.fieldError} role="alert">{message}</p>}
              <label>
                Short title
                <input
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(event) => field("title", event.target.value)}
                  placeholder="Fix a leaking kitchen tap"
                />
              </label>
              <label>
                What needs to be done?
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  value={form.description}
                  onChange={(event) => field("description", event.target.value)}
                  placeholder="Add the details a provider needs to understand the job."
                />
              </label>
              <fieldset className={styles.locationMode}>
                <legend>Where will the service happen?</legend>
                <label>
                  <input type="radio" name="serviceLocationMode" checked={form.serviceLocationMode === "at_client"} onChange={() => field("serviceLocationMode", "at_client")} />
                  <span><House aria-hidden="true" /><strong>At my location</strong><small>The provider travels to you.</small></span>
                </label>
                <label>
                  <input type="radio" name="serviceLocationMode" checked={form.serviceLocationMode === "at_provider"} onChange={() => field("serviceLocationMode", "at_provider")} />
                  <span><Store aria-hidden="true" /><strong>At the provider’s shop</strong><small>You travel to the selected provider.</small></span>
                </label>
                <label>
                  <input type="radio" name="serviceLocationMode" checked={form.serviceLocationMode === "remote"} onChange={() => field("serviceLocationMode", "remote")} />
                  <span><Video aria-hidden="true" /><strong>Online or remote</strong><small>No one needs to travel.</small></span>
                </label>
              </fieldset>
            </>
          )}
          {step === 2 && (
            <>
              <p className={styles.eyebrow}>
                <MapPin aria-hidden="true" /> Nearby help
              </p>
              <h1>{form.serviceLocationMode === "at_client" ? "Where is the job?" : "Where are you starting from?"}</h1>
              <label>
                Landmark <span className={styles.optionalLabel}>(optional)</span>
                <input
                  value={form.addressLabel}
                  maxLength={180}
                  onChange={(event) => field("addressLabel", event.target.value)}
                  placeholder="Near the covered court"
                />
              </label>
              <section className={styles.locationPicker} aria-labelledby="job-site-pin">
                <div>
                  <strong id="job-site-pin">{form.serviceLocationMode === "at_client" ? "Job site pin" : "Your area pin"}</strong>
                  <p>
                    {pinnedLocation
                      ? "Pinned. Providers can see approximate distance."
                      : form.serviceLocationMode === "at_client" ? "Use GPS only if you are already at the job site, or choose it on the map." : "This helps KAILA find suitable providers and estimate your trip."}
                  </p>
                </div>
                <div className={styles.locationActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={locationStatus === "locating"}
                    onClick={locate}
                  >
                    <LocateFixed aria-hidden="true" />
                    {locationStatus === "locating" ? "Finding location…" : form.serviceLocationMode === "at_client" ? "I am at the job site" : "Use my location"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowMap(true)}>
                    <MapPinned aria-hidden="true" /> Pick on map
                  </Button>
                  {pinnedLocation && (
                    <Button type="button" variant="danger" onClick={clearPin}>
                      <X aria-hidden="true" /> Clear pin
                    </Button>
                  )}
                </div>
                {showMap && (
                  <JobLocationMap
                    location={pinnedLocation}
                    onChange={(next) => void pin(next, "map")}
                  />
                )}
                {message && (
                  <p
                    className={`${styles.locationStatus} ${
                      locationStatus === "error" ? styles.locationError : ""
                    }`}
                    role={locationStatus === "error" ? "alert" : "status"}
                  >
                    {locationStatus === "pinned" && <CheckCircle2 aria-hidden="true" />}
                    {message}
                  </p>
                )}
                <p className={styles.locationNote}>
                  Map photos and labels may be older or incomplete. KAILA uses the pin for provider
                  distance.
                </p>
              </section>
              <p className={styles.privacy}>
                {form.serviceLocationMode === "at_client" ? "Providers see the approximate address before hiring; your exact pin is shared only after hiring." : "Providers see your approximate starting area. After hiring, navigation routes you to the provider’s saved shop location."}
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <p className={styles.eyebrow}>
                <CalendarClock aria-hidden="true" /> Timing and budget
              </p>
              <h1>When do you need help?</h1>
              <div className={styles.choices}>
                <label>
                  <input
                    type="radio"
                    name="schedule"
                    checked={form.scheduleType === "asap"}
                    onChange={() => field("scheduleType", "asap")}
                  />
                  As soon as possible
                </label>
                <label>
                  <input
                    type="radio"
                    name="schedule"
                    checked={form.scheduleType === "scheduled"}
                    onChange={() => field("scheduleType", "scheduled")}
                  />
                  Choose a date
                </label>
              </div>
              {form.scheduleType === "scheduled" && (
                <label>
                  Date and time
                  <input
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => field("scheduledAt", event.target.value)}
                  />
                </label>
              )}
              <BudgetRange
                minimum={form.budgetMin}
                maximum={form.budgetMax}
                onMinimumChange={(value) => field("budgetMin", value)}
                onMaximumChange={(value) => field("budgetMax", value)}
              />
              <AttachmentPicker
                name="attachments"
                label="Add job photos or videos"
                hint="Optional. Take a photo/video or choose up to 5 files, 10 MB each. Providers see them after a safety scan."
              />
            </>
          )}
          {status === "error" && (
            <Feedback kind="error" title="We couldn’t continue">
              {message || "Reload the page and try again."}
            </Feedback>
          )}
        </section>
        <footer>
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((step - 1) as Step)}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={status === "saving" || (step === 2 && locationStatus === "resolving")}
          >
            {step === 3 ? (
              <>
                <Send aria-hidden="true" /> {status === "saving" ? "Posting…" : "Post Job"}
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </footer>
      </form>
    </main>
  );
}
