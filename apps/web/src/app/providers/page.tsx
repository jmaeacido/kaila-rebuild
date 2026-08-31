"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, MapPin, Search, Star } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { SelectField } from "../../components/select-field";
import styles from "./providers.module.css";

type Reference = { id: number; name: string; parent_id?: number | null; type?: string };
type Provider = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  services: Reference[];
  serviceAreas: Reference[];
  availabilityStatus: string;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
};

function formatReputation(rating: number | null, reviewCount: number): string {
  if (rating === null) {
    return reviewCount > 0 ? `New · ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "New · No reviews yet";
  }
  return `${rating.toFixed(1)} · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`;
}

export default function FindProvidersPage() {
  const [references, setReferences] = useState<{ categories: Reference[]; areas: Reference[] }>({ categories: [], areas: [] });
  const [filters, setFilters] = useState({ categoryId: "", areaId: "", query: "" });
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "searching" | "error">("loading");

  const search = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    setStatus("searching");
    const params = new URLSearchParams();
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.areaId) params.set("areaId", filters.areaId);
    if (filters.query.trim()) params.set("query", filters.query.trim());
    try {
      const response = await fetch(`/api/v1/providers?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data: Provider[] };
      setProviders(body.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [filters]);

  useEffect(() => {
    void fetch("/api/v1/marketplace/reference-data")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { data: typeof references };
        setReferences(body.data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (status !== "ready" || providers !== null) return;
    void search();
  }, [providers, search, status]);

  const areaOptions = references.areas
    .filter((item) => ["city", "municipality"].includes(item.type || ""))
    .map((item) => ({ value: String(item.id), label: item.name }));

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/home" aria-label="Back to Home">
          <ArrowLeft />
        </Link>
        <div>
          <p>Provider discovery</p>
          <h1>Find providers</h1>
        </div>
      </header>

      <form className={styles.filters} onSubmit={(event) => void search(event)}>
        <label>
          Service
          <SelectField
            label="Service"
            value={filters.categoryId}
            onChange={(categoryId) => setFilters((current) => ({ ...current, categoryId }))}
            placeholder="All services"
            options={references.categories.map((item) => ({ value: String(item.id), label: item.name }))}
          />
        </label>
        <label>
          City or municipality
          <SelectField
            label="City or municipality"
            value={filters.areaId}
            onChange={(areaId) => setFilters((current) => ({ ...current, areaId }))}
            placeholder="All cities and municipalities"
            options={areaOptions}
          />
        </label>
        <label>
          Provider or business name
          <div className={styles.searchField}>
            <Search aria-hidden="true" />
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search by name"
            />
          </div>
        </label>
        <Button disabled={status === "searching"}>{status === "searching" ? "Searching…" : "Search providers"}</Button>
      </form>

      {status === "error" && (
        <Feedback kind="error" title="We couldn’t load providers">
          Check your connection and try again.
        </Feedback>
      )}

      {status === "searching" && providers === null && (
        <section className={styles.results} aria-busy="true" aria-label="Searching providers">
          <span className={styles.skeleton} />
          <span className={styles.skeleton} />
        </section>
      )}

      {providers?.length === 0 && status === "ready" && (
        <section className={styles.empty}>
          <BriefcaseBusiness aria-hidden="true" />
          <h2>No providers are currently available for this service in your area.</h2>
          <p>You may post a job request so matching providers can respond when available.</p>
          <Link href={`/post-job${filters.categoryId ? `?categoryId=${filters.categoryId}` : ""}`}>Post a job request</Link>
        </section>
      )}

      {providers && providers.length > 0 && (
        <section className={styles.results} aria-live="polite">
          <p className={styles.resultsCount}>
            {providers.length} provider{providers.length === 1 ? "" : "s"} found
          </p>
          {providers.map((provider) => {
            const visibleServices = provider.services.slice(0, 3);
            const hiddenServiceCount = provider.services.length - visibleServices.length;
            const isAvailable = provider.availabilityStatus === "available";

            return (
              <article className={styles.card} key={provider.id}>
                <div className={styles.cardTop}>
                  <div className={styles.cardAvatar}>
                    {provider.avatarUrl ? (
                      <Image
                        unoptimized
                        width={56}
                        height={56}
                        src={provider.avatarUrl}
                        alt={`${provider.displayName} profile`}
                      />
                    ) : (
                      provider.displayName.slice(0, 1)
                    )}
                  </div>
                  <div className={styles.cardIdentity}>
                    <div className={styles.cardTitleRow}>
                      <h2>
                        {provider.displayName}
                        {provider.verified && <BadgeCheck aria-label="Verified provider" />}
                      </h2>
                      <span className={isAvailable ? styles.available : styles.unavailable}>
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    {provider.serviceAreas.length > 0 && (
                      <p className={styles.cardLocation}>
                        <MapPin aria-hidden="true" />
                        {provider.serviceAreas
                          .map((area) => area.name)
                          .slice(0, 2)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {provider.services.length > 0 && (
                  <div className={styles.services}>
                    {visibleServices.map((service) => (
                      <span key={service.id}>{service.name}</span>
                    ))}
                    {hiddenServiceCount > 0 && <span className={styles.servicesMore}>+{hiddenServiceCount} more</span>}
                  </div>
                )}

                <div className={styles.metrics}>
                  <span>
                    <Star aria-hidden="true" />
                    {formatReputation(provider.rating, provider.reviewCount)}
                  </span>
                  <span>
                    <BriefcaseBusiness aria-hidden="true" />
                    {provider.completedJobs} completed
                  </span>
                </div>

                <Link className={styles.profileLink} href={`/providers/${provider.id}`}>
                  View profile
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
