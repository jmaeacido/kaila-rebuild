"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, LocateFixed, MapPin, Store, UserRound, Wrench } from "lucide-react";
import { Button, Feedback, TextField } from "@kaila/ui";
import Link from "next/link";
import styles from "./profile.module.css";

type Item = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};

const independentCity = "independent-city";

export default function ProviderProfilePage() {
  const [categories, setCategories] = useState<Item[]>([]);
  const [areas, setAreas] = useState<Item[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [coverageMode, setCoverageMode] = useState<"city" | "barangays">("city");
  const [barangayIds, setBarangayIds] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<Item[]>([]);
  const [referenceStatus, setReferenceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadedBarangaysCityId, setLoadedBarangaysCityId] = useState("");
  const barangaysLoading = Boolean(cityId) && loadedBarangaysCityId !== cityId;
  const [message, setMessage] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [offersAtShop, setOffersAtShop] = useState(false);
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const provinces = useMemo(
    () => areas.filter((area) => area.type === "province"),
    [areas],
  );
  const independentLocalities = useMemo(
    () =>
      areas.filter((area) => {
        if (!["city", "municipality"].includes(area.type ?? "")) return false;
        return areas.find((parent) => parent.id === area.parent_id)?.type === "region";
      }),
    [areas],
  );
  const cities = useMemo(
    () =>
      provinceId === independentCity
        ? independentLocalities
        : areas.filter(
            (area) =>
              ["city", "municipality"].includes(area.type ?? "") &&
              String(area.parent_id) === provinceId,
          ),
    [areas, independentLocalities, provinceId],
  );

  const loadReferenceData = useCallback(async () => {
    setReferenceStatus("loading");
    await fetch("/api/v1/marketplace/reference-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{
          data: { categories: Item[]; areas: Item[] };
        }>;
      })
      .then((body) => {
        setCategories(body.data.categories);
        setAreas(body.data.areas);
        setReferenceStatus("ready");
      })
      .catch(() => setReferenceStatus("error"));
  }, []);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    let active = true;

    if (!cityId) {
      return () => {
        active = false;
      };
    }

    void fetch(`/api/v1/marketplace/areas?parentId=${encodeURIComponent(cityId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data: Item[] }>;
      })
      .then((body) => {
        if (!active) return;
        setBarangays(body.data.filter((area) => area.type === "barangay"));
      })
      .catch(() => {
        if (!active) return;
        setBarangays([]);
      })
      .finally(() => {
        if (active) setLoadedBarangaysCityId(cityId);
      });

    return () => {
      active = false;
    };
  }, [cityId]);

  function chooseProvince(value: string) {
    setProvinceId(value);
    setCityId("");
    setBarangayIds([]);
    setBarangays([]);
    setLoadedBarangaysCityId("");
  }

  function chooseCity(value: string) {
    setCityId(value);
    setBarangayIds([]);
    setBarangays([]);
    setLoadedBarangaysCityId("");
  }

  function toggleBarangay(value: string) {
    setBarangayIds((current) =>
      current.includes(value) ? current.filter((id) => id !== value) : [...current, value],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedAreaIds = coverageMode === "city" ? [cityId] : barangayIds;
    if (!cityId || selectedAreaIds.length === 0 || (offersAtShop && !shopLocation)) {
      setMessage("error");
      return;
    }
    setMessage("saving");
    const data = new FormData(event.currentTarget);
    await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const token = document.cookie
      .split("; ")
      .find((part) => part.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    const response = await fetch("/api/v1/me/provider-profile", {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}),
      },
      body: JSON.stringify({
        displayName: data.get("displayName"),
        bio: data.get("bio"),
        yearsExperience: Number(data.get("yearsExperience")),
        serviceIds: [Number(data.get("serviceId"))],
        areaIds: selectedAreaIds.map(Number),
        availability: [{ dayOfWeek: 1, startsAt: "08:00", endsAt: "17:00" }],
        offersAtShop,
        shopName: offersAtShop ? data.get("shopName") : null,
        shopAddress: offersAtShop ? data.get("shopAddress") : null,
        shopLatitude: offersAtShop ? shopLocation?.latitude : null,
        shopLongitude: offersAtShop ? shopLocation?.longitude : null,
      }),
    });
    setMessage(response.ok ? "saved" : "error");
  }

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        <ArrowLeft aria-hidden="true" /> Home
      </Link>
      <section className={styles.panel} aria-labelledby="profile-title">
        <div className={styles.intro}>
          <span className={styles.introIcon}><BadgeCheck aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>PROVIDER ONBOARDING</p>
            <h1 id="profile-title">Build a profile clients can trust</h1>
            <p>Show what you do and where you work. KAILA reviews every profile before it appears in search.</p>
          </div>
        </div>
        <ol className={styles.steps} aria-label="Profile sections">
          <li><span>1</span>About you</li>
          <li><span>2</span>Service area</li>
          <li><span>3</span>Shop option</li>
        </ol>
        {referenceStatus === "error" && (
          <Feedback kind="error" title="Services and locations didn’t load">
            Check your connection, then try again.
            <Button type="button" variant="secondary" onClick={() => void loadReferenceData()}>Try again</Button>
          </Feedback>
        )}
        <form onSubmit={(event) => void submit(event)} className={styles.form}>
          <fieldset className={styles.formSection}>
            <legend><span>1</span><UserRound aria-hidden="true" /> About you</legend>
            <p>Use the name clients should recognize and describe the work you do best.</p>
            <TextField id="displayName" name="displayName" label="Business or display name" autoComplete="organization" required />
            <label>
              About your work
              <textarea name="bio" required minLength={20} maxLength={1200} placeholder="Describe your services, experience, and what clients can expect." />
              <small>At least 20 characters. Don’t include private contact details.</small>
            </label>
            <div className={styles.basicGrid}>
              <TextField
                id="yearsExperience"
                name="yearsExperience"
                label="Years of experience"
                type="number"
                inputMode="numeric"
                min={0}
                max={80}
                required
              />
              <label>
                Primary service
                <select name="serviceId" required disabled={referenceStatus !== "ready"}>
                  <option value="">{referenceStatus === "loading" ? "Loading services…" : "Choose a service"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <fieldset className={styles.serviceArea}>
            <legend>
              <span>2</span><MapPin aria-hidden="true" /> Service area
            </legend>
            <p>Cover the whole city or municipality, or choose several barangays.</p>
            <div className={styles.addressFields}>
              <label>
                Province
                <select
                  required
                  value={provinceId}
                  onChange={(event) => chooseProvince(event.target.value)}
                >
                  <option value="">Choose province</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                  {independentLocalities.length > 0 && (
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
            </div>
            <div className={styles.coverageChoices}>
              <label>
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "city"}
                  onChange={() => setCoverageMode("city")}
                />
                <span>
                  <strong>Whole city / municipality</strong>
                  <small>Receive matching jobs from every barangay.</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "barangays"}
                  onChange={() => setCoverageMode("barangays")}
                />
                <span>
                  <strong>Selected barangays</strong>
                  <small>Choose only the locations you serve.</small>
                </span>
              </label>
            </div>
            {coverageMode === "barangays" && (
              <div className={styles.barangayPicker}>
                <div className={styles.barangayHeading}>
                  <strong>Barangays</strong>
                  <span>
                    {barangayIds.length} selected
                  </span>
                </div>
                {!cityId && <p>Choose a city or municipality first.</p>}
                {cityId && barangaysLoading && <p>Loading barangays…</p>}
                {cityId && !barangaysLoading && barangays.length === 0 && (
                  <p>No barangays found for this city or municipality.</p>
                )}
                {cityId && !barangaysLoading && (
                  <div className={styles.barangayGrid}>
                    {barangays.map((barangay) => (
                      <label key={barangay.id}>
                        <input
                          type="checkbox"
                          checked={barangayIds.includes(String(barangay.id))}
                          onChange={() => toggleBarangay(String(barangay.id))}
                        />
                        <span>{barangay.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </fieldset>
          <fieldset className={styles.shopService}>
            <legend><span>3</span><Store aria-hidden="true" /> Shop service</legend>
            <label className={styles.shopToggle}>
              <input type="checkbox" checked={offersAtShop} onChange={(event) => setOffersAtShop(event.target.checked)} />
              <span><strong>Clients can also come to my shop</strong><small>Keep this enabled alongside your home-service coverage if you offer both.</small></span>
            </label>
            {offersAtShop && <div className={styles.shopFields}>
              <TextField id="shopName" name="shopName" label="Shop name" required />
              <TextField id="shopAddress" name="shopAddress" label="Shop address or landmark" required />
              <Button type="button" variant="secondary" onClick={() => navigator.geolocation?.getCurrentPosition((position) => setShopLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setMessage("error"), { enableHighAccuracy: true })}>
                <LocateFixed aria-hidden="true" /> {shopLocation ? "Shop pin saved" : "Pin my current shop location"}
              </Button>
              <p>{shopLocation ? `${shopLocation.latitude.toFixed(5)}, ${shopLocation.longitude.toFixed(5)}` : "Use this while physically at the shop. Clients receive this destination only when they hire you for shop service."}</p>
            </div>}
          </fieldset>
          <div className={styles.submitBar}>
            <span><Wrench aria-hidden="true" /> You can update your profile after review.</span>
            <Button type="submit" isLoading={message === "saving"} disabled={referenceStatus !== "ready"}>
              Submit for review
            </Button>
          </div>
        </form>
        {message === "saved" && (
          <Feedback kind="success" title="Profile sent for review">
            <CheckCircle2 aria-hidden="true" /> We’ll let you know when it is ready.
          </Feedback>
        )}
        {message === "error" && (
          <Feedback kind="error" title="Profile wasn’t saved">
            Check each field and try again.
          </Feedback>
        )}
      </section>
    </main>
  );
}
