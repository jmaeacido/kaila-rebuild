"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  LocateFixed,
  MapPinned,
  MapPin,
  Send,
  X,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { JobLocationMap, type JobLocation } from "./job-location-map";
import { AttachmentPicker, attachmentFiles } from "../../components/attachment-picker";
import styles from "./page.module.css";

type Reference = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};
type Step = 1 | 2 | 3;
type LocationStatus = "idle" | "locating" | "pinned" | "error";

const independentCity = "independent-city";

export default function PostJobPage() {
  const [step, setStep] = useState<Step>(1);
  const [categories, setCategories] = useState<Reference[]>([]);
  const [areas, setAreas] = useState<Reference[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const createKey = useRef(crypto.randomUUID());
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    areaId: "",
    scheduleType: "asap",
    scheduledAt: "",
    budgetMin: "",
    budgetMax: "",
    addressLabel: "",
    latitude: "",
    longitude: "",
  });

  const provinces = useMemo(
    () => areas.filter((area) => area.type === "province"),
    [areas],
  );
  const independentCities = useMemo(
    () =>
      areas.filter(
        (area) =>
          area.type === "city" &&
          areas.find((parent) => parent.id === area.parent_id)?.type === "region",
      ),
    [areas],
  );
  const cities = useMemo(
    () =>
      provinceId === independentCity
        ? independentCities
        : areas.filter(
            (area) =>
              ["city", "municipality"].includes(area.type ?? "") &&
              String(area.parent_id) === provinceId,
          ),
    [areas, independentCities, provinceId],
  );
  const barangays = useMemo(
    () =>
      areas.filter(
        (area) => area.type === "barangay" && String(area.parent_id) === cityId,
      ),
    [areas, cityId],
  );
  const pinnedLocation =
    form.latitude && form.longitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;

  useEffect(() => {
    void fetch("/api/v1/marketplace/reference-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as {
          data: { categories: Reference[]; areas: Reference[] };
        };
        setCategories(body.data.categories);
        setAreas(body.data.areas);
        const requestedCategory = new URLSearchParams(window.location.search).get("categoryId");
        if (
          requestedCategory &&
          body.data.categories.some((category) => String(category.id) === requestedCategory)
        ) {
          setForm((current) => ({ ...current, categoryId: requestedCategory }));
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  function field(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function chooseProvince(value: string) {
    setProvinceId(value);
    setCityId("");
    field("areaId", "");
  }

  function chooseCity(value: string) {
    setCityId(value);
    field("areaId", "");
  }

  function pin(location: JobLocation, source: "current" | "map") {
    setForm((current) => ({
      ...current,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    }));
    setLocationStatus("pinned");
    setMessage(
      source === "current"
        ? "Current location pinned as the job site."
        : "Job site pinned on the map.",
    );
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
        pin(
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
    setForm((current) => ({ ...current, latitude: "", longitude: "" }));
    setLocationStatus("idle");
    setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 3) {
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
      scheduledAt:
        form.scheduleType === "scheduled" ? new Date(form.scheduledAt).toISOString() : null,
      budgetMinCentavos: form.budgetMin ? Math.round(Number(form.budgetMin) * 100) : null,
      budgetMaxCentavos: form.budgetMax ? Math.round(Number(form.budgetMax) * 100) : null,
      addressLabel: form.addressLabel || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      const created = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": createKey.current },
        body: JSON.stringify(payload),
      });
      if (!created.ok) throw new Error();
      const body = (await created.json()) as { data: { id: string } };
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
      const posted = await fetch(`/api/v1/jobs/${body.data.id}/post`, { method: "POST" });
      if (!posted.ok) throw new Error();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && error.message === "ATTACHMENT_UPLOAD_FAILED"
          ? "A photo could not be uploaded, so your job was kept as a draft. Check your connection and try again."
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
          <h1>Your job is posted</h1>
          <p>We’re alerting matching providers nearby.</p>
          <Button onClick={() => location.assign("/home")}>Back to Home</Button>
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
              <p className={styles.eyebrow}>Tell us what you need</p>
              <h1>What can we help with?</h1>
              <label>
                Service
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) => field("categoryId", event.target.value)}
                >
                  <option value="">Choose a service</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
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
            </>
          )}
          {step === 2 && (
            <>
              <p className={styles.eyebrow}>
                <MapPin aria-hidden="true" /> Nearby help
              </p>
              <h1>Where is the job?</h1>
              <div className={styles.addressFields}>
                <label>
                  Province
                  <select required value={provinceId} onChange={(event) => chooseProvince(event.target.value)}>
                    <option value="">Choose province</option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                    {independentCities.length > 0 && (
                      <option value={independentCity}>Independent City</option>
                    )}
                  </select>
                </label>
                <label>
                  City / Municipality
                  <select
                    required
                    disabled={!provinceId}
                    value={cityId}
                    onChange={(event) => chooseCity(event.target.value)}
                  >
                    <option value="">Choose city or municipality</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Barangay
                  <select
                    required
                    disabled={!cityId}
                    value={form.areaId}
                    onChange={(event) => field("areaId", event.target.value)}
                  >
                    <option value="">Choose barangay</option>
                    {barangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Landmark or address
                <input
                  value={form.addressLabel}
                  maxLength={180}
                  onChange={(event) => field("addressLabel", event.target.value)}
                  placeholder="Shown only after you hire"
                />
              </label>
              <section className={styles.locationPicker} aria-labelledby="job-site-pin">
                <div>
                  <strong id="job-site-pin">Job site pin</strong>
                  <p>
                    {pinnedLocation
                      ? "Pinned. Providers can see approximate distance."
                      : "Use GPS only if you are already at the job site, or choose it on the map."}
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
                    {locationStatus === "locating" ? "Finding location…" : "I am at the job site"}
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
                    onChange={(next) => pin(next, "map")}
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
                Providers see only your selected barangay before you hire. Your pin and address stay
                private.
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
              <div className={styles.budget}>
                <label>
                  Budget from (₱)
                  <input
                    type="number"
                    min="0"
                    value={form.budgetMin}
                    onChange={(event) => field("budgetMin", event.target.value)}
                  />
                </label>
                <label>
                  Budget to (₱)
                  <input
                    type="number"
                    min={form.budgetMin || "0"}
                    value={form.budgetMax}
                    onChange={(event) => field("budgetMax", event.target.value)}
                  />
                </label>
              </div>
              <AttachmentPicker
                name="attachments"
                label="Add job photos or PDFs"
                hint="Optional. Add up to 5 files, 10 MB each. Providers see them after a safety scan."
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
          <Button type="submit" disabled={status === "saving"}>
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
