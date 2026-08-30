"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, LocateFixed, MapPin, Store, UserRound, Wrench } from "lucide-react";
import { Button, Feedback, TextField } from "@kaila/ui";
import Link from "next/link";
import type { ServiceCategory } from "../../components/category-select";
import { SelectField } from "../../components/select-field";
import { ServiceCategoryMultiSelect } from "../../components/service-category-multi-select";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import styles from "./profile.module.css";

type Item = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};

type ProviderProfile = {
  display_name: string;
  bio: string;
  years_experience: number;
  status: string;
  review_note: string | null;
  offers_at_shop: boolean;
  shop_name: string | null;
  shop_address: string | null;
  shop_latitude: string | number | null;
  shop_longitude: string | number | null;
  services: Array<{ id: number; name: string }>;
  service_areas: Array<{ id: number; name: string; type?: string; parent_id?: number | null }>;
};

const independentCity = "independent-city";

function isRegionDirectLocality(areas: Item[], area: Item): boolean {
  if (!["city", "municipality"].includes(area.type ?? "")) return false;
  const parent = areas.find((entry) => entry.id === area.parent_id);
  return parent?.type === "region";
}

async function fetchArea(areaId: number): Promise<Item & { parent?: Item | null }> {
  const response = await fetch(`/api/v1/marketplace/areas/${encodeURIComponent(String(areaId))}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("AREA_LOOKUP_FAILED");
  return ((await response.json()) as { data: Item & { parent?: Item | null } }).data;
}

function provinceIdForCity(areas: Item[], city: Item): string {
  if (isRegionDirectLocality(areas, city)) return independentCity;
  const parent = areas.find((area) => area.id === city.parent_id);
  return parent?.type === "province" ? String(parent.id) : "";
}

async function resolveCitySelection(
  areas: Item[],
  cityId: number,
): Promise<{ provinceId: string; cityId: string } | null> {
  let city = areas.find((area) => area.id === cityId);
  if (!city) {
    try {
      city = await fetchArea(cityId);
    } catch {
      return null;
    }
  }
  if (!city || !["city", "municipality"].includes(city.type ?? "")) return null;
  const provinceId = provinceIdForCity(areas, city);
  return provinceId ? { provinceId, cityId: String(city.id) } : null;
}

async function applyServiceAreas(
  areas: Item[],
  serviceAreas: ProviderProfile["service_areas"],
  setCoverageMode: (mode: "city" | "barangays") => void,
  setProvinceId: (value: string) => void,
  setCityId: (value: string) => void,
  setBarangayIds: (value: string[]) => void,
) {
  const locality = serviceAreas.find((area) => ["city", "municipality"].includes(area.type ?? ""));
  const barangayAreas = serviceAreas.filter((area) => area.type === "barangay");

  if (locality) {
    setCoverageMode("city");
    const resolved = await resolveCitySelection(areas, locality.id);
    if (resolved) {
      setProvinceId(resolved.provinceId);
      setCityId(resolved.cityId);
    }
    return;
  }

  if (barangayAreas.length === 0) return;

  setCoverageMode("barangays");
  setBarangayIds(barangayAreas.map((area) => String(area.id)));

  try {
    const firstBarangay = await fetchArea(barangayAreas[0].id);
    const city =
      firstBarangay.parent && ["city", "municipality"].includes(firstBarangay.parent.type ?? "")
        ? firstBarangay.parent
        : areas.find((area) => area.id === firstBarangay.parent_id);
    if (!city) return;
    const resolved = await resolveCitySelection(areas, city.id);
    if (resolved) {
      setProvinceId(resolved.provinceId);
      setCityId(resolved.cityId);
    }
  } catch {
    // Keep the saved barangay ids even if the cascade cannot be restored.
  }
}

export default function ProviderProfilePage() {
  const formIsDirty = useRef(false);
  const loadSequence = useRef(0);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
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
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [offersAtShop, setOffersAtShop] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const markFormDirty = useCallback(() => {
    formIsDirty.current = true;
    loadSequence.current += 1;
  }, []);

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
    const sequence = ++loadSequence.current;
    setReferenceStatus("loading");
    try {
      const [referenceResponse, profileResponse] = await Promise.all([
        fetch("/api/v1/marketplace/reference-data", { cache: "no-store", credentials: "include" }),
        fetch("/api/v1/me/marketplace-profile", { cache: "no-store", credentials: "include" }),
      ]);
      if (!referenceResponse.ok) throw new Error();

      const referenceBody = (await referenceResponse.json()) as {
        data: { categories: ServiceCategory[]; areas: Item[] };
      };
      const nextAreas = referenceBody.data.areas;
      setCategories(referenceBody.data.categories);
      setAreas(nextAreas);
      setReferenceStatus("ready");

      if (profileResponse.ok) {
        const provider = ((await profileResponse.json()) as { data: { provider: ProviderProfile | null } }).data
          .provider;
        if (provider && !formIsDirty.current && sequence === loadSequence.current) {
          setDisplayName(provider.display_name ?? "");
          setBio(provider.bio ?? "");
          setYearsExperience(
            provider.years_experience != null ? String(provider.years_experience) : "",
          );
          setServiceIds(provider.services?.map((service) => String(service.id)) ?? []);
          setProfileStatus(provider.status ?? null);
          setReviewNote(provider.review_note ?? null);
          setOffersAtShop(Boolean(provider.offers_at_shop));
          setShopName(provider.shop_name ?? "");
          setShopAddress(provider.shop_address ?? "");
          if (provider.shop_latitude != null && provider.shop_longitude != null) {
            setShopLocation({
              latitude: Number(provider.shop_latitude),
              longitude: Number(provider.shop_longitude),
            });
          }
          await applyServiceAreas(
            nextAreas,
            provider.service_areas ?? [],
            setCoverageMode,
            setProvinceId,
            setCityId,
            setBarangayIds,
          );
        }
      }
    } catch {
      setReferenceStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useRealtimeInvalidation(
    () => void loadReferenceData(),
    (event) =>
      (event.type === "profile.updated" && event.resourceType === "provider_profile")
      || event.type.startsWith("notification."),
  );

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
    markFormDirty();
    setProvinceId(value);
    setCityId("");
    setBarangayIds([]);
    setBarangays([]);
    setLoadedBarangaysCityId("");
  }

  function chooseCity(value: string) {
    markFormDirty();
    setCityId(value);
    setBarangayIds([]);
    setBarangays([]);
    setLoadedBarangaysCityId("");
  }

  function toggleBarangay(value: string) {
    markFormDirty();
    setBarangayIds((current) =>
      current.includes(value) ? current.filter((id) => id !== value) : [...current, value],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedAreaIds = coverageMode === "city" ? [cityId] : barangayIds;
    if (!cityId || selectedAreaIds.length === 0 || serviceIds.length === 0 || (offersAtShop && !shopLocation)) {
      setMessage("error");
      return;
    }
    setMessage("saving");
    loadSequence.current += 1;
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
        displayName,
        bio,
        yearsExperience: Number(yearsExperience),
        serviceIds: serviceIds.map(Number),
        areaIds: selectedAreaIds.map(Number),
        availability: [{ dayOfWeek: 1, startsAt: "08:00", endsAt: "17:00" }],
        offersAtShop,
        shopName: offersAtShop ? shopName : null,
        shopAddress: offersAtShop ? shopAddress : null,
        shopLatitude: offersAtShop ? shopLocation?.latitude : null,
        shopLongitude: offersAtShop ? shopLocation?.longitude : null,
      }),
    });
    if (response.ok) {
      const saved = ((await response.json()) as { data: ProviderProfile }).data;
      setProfileStatus(saved.status ?? "pending_review");
      setReviewNote(saved.review_note ?? null);
      formIsDirty.current = false;
    }
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
        {profileStatus === "active" && (
          <Feedback kind="success" title="Profile approved">
            Your provider profile is live. Saving changes sends it back for review.
          </Feedback>
        )}
        {profileStatus === "pending_review" && (
          <Feedback kind="info" title="Profile under review">
            We&apos;re reviewing your profile. You can still update details here if something changed.
          </Feedback>
        )}
        {profileStatus === "rejected" && (
          <Feedback kind="error" title="Profile needs changes">
            {reviewNote || "Update the details below, then submit again for review."}
          </Feedback>
        )}
        {referenceStatus === "error" && (
          <Feedback kind="error" title="Services and locations didn’t load">
            Check your connection, then try again.
            <Button type="button" variant="secondary" onClick={() => void loadReferenceData()}>Try again</Button>
          </Feedback>
        )}
        <form
          onInput={markFormDirty}
          onSubmit={(event) => void submit(event)}
          className={styles.form}
        >
          <fieldset className={styles.formSection}>
            <legend><span>1</span><UserRound aria-hidden="true" /> About you</legend>
            <p>Use the name clients should recognize and describe the work you do best.</p>
            <TextField
              id="displayName"
              name="displayName"
              label="Business or display name"
              autoComplete="organization"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <label>
              About your work
              <textarea
                name="bio"
                required
                minLength={20}
                maxLength={1200}
                placeholder="Describe your services, experience, and what clients can expect."
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
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
                value={yearsExperience}
                onChange={(event) => setYearsExperience(event.target.value)}
              />
            </div>
            <ServiceCategoryMultiSelect
              categories={categories}
              values={serviceIds}
              onChange={(values) => {
                markFormDirty();
                setServiceIds(values);
              }}
              disabled={referenceStatus !== "ready"}
            />
          </fieldset>
          <fieldset className={styles.serviceArea}>
            <legend>
              <span>2</span><MapPin aria-hidden="true" /> Service area
            </legend>
            <p>Cover the whole city or municipality, or choose several barangays.</p>
            <div className={styles.addressFields}>
              <label>
                Province
                <SelectField label="Province" required value={provinceId} onChange={chooseProvince} placeholder="Choose province" options={[...provinces.map((province)=>({value:String(province.id),label:province.name})),...(independentLocalities.length>0?[{value:independentCity,label:"Independent City"}]:[])]} />
              </label>
              <label>
                City / Municipality
                <SelectField label="City or municipality" required disabled={!provinceId} value={cityId} onChange={chooseCity} placeholder="Choose city or municipality" options={cities.map((city)=>({value:String(city.id),label:city.name}))} />
              </label>
            </div>
            <div className={styles.coverageChoices}>
              <label>
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "city"}
                  onChange={() => {
                    markFormDirty();
                    setCoverageMode("city");
                  }}
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
                  onChange={() => {
                    markFormDirty();
                    setCoverageMode("barangays");
                  }}
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
              <input
                type="checkbox"
                checked={offersAtShop}
                onChange={(event) => setOffersAtShop(event.target.checked)}
              />
              <span><strong>Clients can also come to my shop</strong><small>Keep this enabled alongside your home-service coverage if you offer both.</small></span>
            </label>
            {offersAtShop && <div className={styles.shopFields}>
              <TextField
                id="shopName"
                name="shopName"
                label="Shop name"
                required
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
              />
              <TextField
                id="shopAddress"
                name="shopAddress"
                label="Shop address or landmark"
                required
                value={shopAddress}
                onChange={(event) => setShopAddress(event.target.value)}
              />
              <Button type="button" variant="secondary" onClick={() => navigator.geolocation?.getCurrentPosition((position) => {
                markFormDirty();
                setShopLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
              }, () => setMessage("error"), { enableHighAccuracy: true })}>
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
