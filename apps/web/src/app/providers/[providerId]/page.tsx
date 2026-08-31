"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChevronDown,
  MapPin,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react";
import { Feedback } from "@kaila/ui";
import { prepareCsrf } from "../../auth-client";
import type { ProviderPortfolioItem } from "../../../components/provider-portfolio-gallery";
import { ProviderPortfolioGallery } from "../../../components/provider-portfolio-gallery";
import { isDemoPortfolio, toggleDemoPortfolioLike, withDemoPortfolio } from "../../../components/provider-portfolio-demo";
import { ProviderServicesShowcase } from "../../../components/provider-services-showcase";
import styles from "../providers.module.css";

type Item = { id: number; name: string; icon?: string | null; slug?: string | null };
type PortfolioItem = ProviderPortfolioItem;
type Provider = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  yearsExperience: number;
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
  verified: boolean;
  services: Item[];
  serviceAreas: Item[];
  availability: { id: number; day_of_week: number; starts_at: string; ends_at: string }[];
  shopName: string | null;
  offersAtShop: boolean;
  availabilityStatus: "available" | "unavailable";
  portfolio: PortfolioItem[];
  reviews: { id: string; rating: number; comment: string | null; publishedAt: string }[];
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatRating(provider: Provider): string {
  if (provider.rating === null) return "New provider";
  return `${provider.rating.toFixed(1)} · ${provider.reviewCount} review${provider.reviewCount === 1 ? "" : "s"}`;
}

export default function ProviderProfilePage() {
  const { providerId } = useParams<{ providerId: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<ProviderPortfolioItem[]>([]);
  const [canLike, setCanLike] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/v1/providers/${providerId}`, { cache: "no-store", credentials: "include" }),
      fetch("/api/v1/auth/session-status", { credentials: "include" }),
    ])
      .then(async ([providerResponse, sessionResponse]) => {
        if (!providerResponse.ok) throw new Error();
        const providerBody = (await providerResponse.json()) as { data: Provider };
        setProvider(providerBody.data);
        setPortfolioItems(withDemoPortfolio(providerBody.data.portfolio));
        if (sessionResponse.ok) {
          const sessionBody = (await sessionResponse.json()) as { data: { authenticated?: boolean } };
          setCanLike(Boolean(sessionBody.data.authenticated));
        }
      })
      .catch(() => setError(true));
  }, [providerId]);

  async function togglePortfolioLike(item: ProviderPortfolioItem) {
    if (item.demo) {
      setPortfolioItems((current) => toggleDemoPortfolioLike(current, item.id));
      return;
    }
    if (!canLike) return;

    setLiking(true);
    const method = item.liked ? "DELETE" : "PUT";
    const token = await prepareCsrf();
    const response = await fetch(`/api/v1/profile-assets/${item.id}/like`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
      },
    });
    setLiking(false);
    if (!response.ok) return;

    const body = (await response.json()) as { data: { liked: boolean; likeCount: number } };
    setPortfolioItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, liked: body.data.liked, likeCount: body.data.likeCount }
          : entry,
      ),
    );
  }

  const requestHref = useMemo(() => {
    if (!provider) return "/post-job";
    return `/post-job?providerId=${provider.id}&categoryId=${provider.services[0]?.id || ""}`;
  }, [provider]);

  if (error) {
    return (
      <main className={styles.shell}>
        <Feedback kind="error" title="Provider unavailable">
          This profile may no longer be accepting requests.
        </Feedback>
      </main>
    );
  }

  if (!provider) {
    return (
      <main className={styles.shell}>
        <p className={styles.loading}>Loading provider…</p>
      </main>
    );
  }

  const isAvailable = provider.availabilityStatus !== "unavailable";
  const showingDemoPortfolio = isDemoPortfolio(portfolioItems, provider.portfolio.length);

  return (
    <main className={styles.shell}>
      <header className={styles.profileHeader}>
        <Link href="/providers" aria-label="Back to providers">
          <ArrowLeft />
        </Link>
        <p>Provider profile</p>
      </header>

      <div className={styles.profileLayout}>
        <div className={styles.mainColumn}>
          <section className={styles.heroCard} aria-label="Provider overview">
            <div className={styles.heroTop}>
              <div className={styles.avatar}>
                {provider.avatarUrl ? (
                  <Image
                    unoptimized
                    width={72}
                    height={72}
                    src={provider.avatarUrl}
                    alt={`${provider.displayName} profile`}
                  />
                ) : (
                  provider.displayName[0]
                )}
              </div>
              <div className={styles.heroIdentity}>
                <div className={styles.heroTitleRow}>
                  <h1>
                    {provider.displayName}
                    {provider.verified ? <BadgeCheck aria-label="Verified provider" /> : null}
                  </h1>
                  <span className={isAvailable ? styles.available : styles.unavailable}>
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p>
                  {provider.shopName
                    ? (
                      <>
                        <Store aria-hidden="true" />
                        {provider.shopName}
                      </>
                    )
                    : `${provider.yearsExperience} years of experience`}
                </p>
              </div>
            </div>

            <p className={styles.bio}>{provider.bio}</p>

            <div className={styles.trustRow}>
              <span>
                <Star aria-hidden="true" />
                {formatRating(provider)}
              </span>
              <span>
                <BriefcaseBusiness aria-hidden="true" />
                {provider.completedJobs} completed job{provider.completedJobs === 1 ? "" : "s"}
              </span>
              {provider.verified ? (
                <span>
                  <ShieldCheck aria-hidden="true" />
                  Credentials verified
                </span>
              ) : null}
            </div>

            <ProviderServicesShowcase services={provider.services} variant="embedded" />

            <Link className={`${styles.profileLink} ${styles.heroCta}`} href={requestHref}>
              Request Service
            </Link>
          </section>

          <section className={styles.card}>
            <ProviderPortfolioGallery
              items={portfolioItems}
              previewNote={
                showingDemoPortfolio
                  ? "Development preview — sample project photos"
                  : undefined
              }
              emptyMessage="No work photos shared yet. Approved project shots from the provider will appear here."
              onToggleLike={(item) => void togglePortfolioLike(item)}
              liking={liking}
              canLike={canLike || showingDemoPortfolio}
            />
          </section>

          <section className={styles.factsGrid} aria-label="Provider details">
            <article className={styles.factCard}>
              <h2>
                <MapPin aria-hidden="true" />
                Covered locations
              </h2>
              <p>{provider.serviceAreas.map((item) => item.name).join(", ")}</p>
            </article>
            <article className={styles.factCard}>
              <h2>
                <CalendarClock aria-hidden="true" />
                Availability
              </h2>
              {provider.availability.length === 0 ? (
                <p>Schedule shared after you connect.</p>
              ) : (
                provider.availability.map((slot) => (
                  <p key={slot.id}>
                    {days[slot.day_of_week]} · {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}
                  </p>
                ))
              )}
            </article>
          </section>

          <details className={styles.reviews}>
            <summary>
              <span>
                <strong>Ratings and reviews</strong>
                <small>{provider.reviewCount} published</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className={styles.reviewList}>
              {provider.reviews.length === 0 ? (
                <p>No published reviews yet.</p>
              ) : (
                provider.reviews.map((review) => (
                  <article key={review.id}>
                    <strong>
                      <Star aria-hidden="true" />
                      {review.rating}.0
                    </strong>
                    {review.comment ? <p>{review.comment}</p> : null}
                    <small>{review.publishedAt}</small>
                  </article>
                ))
              )}
            </div>
          </details>

          <p className={styles.intro}>
            Personal phone numbers and contact details remain private. Coordinate safely in KAILA after sending a request.
          </p>
        </div>

        <aside className={styles.sideColumn} aria-label="Book this provider">
          <div className={styles.stickyCard}>
            <div className={styles.hireCardHeader}>
              <p className={styles.sideEyebrow}>Ready to hire?</p>
              <div className={styles.hireCardIdentity}>
                <div className={styles.hireMiniAvatar}>
                  {provider.avatarUrl ? (
                    <Image
                      unoptimized
                      width={44}
                      height={44}
                      src={provider.avatarUrl}
                      alt=""
                    />
                  ) : (
                    provider.displayName[0]
                  )}
                </div>
                <div>
                  <h2>{provider.displayName}</h2>
                  <p>{formatRating(provider)}</p>
                </div>
              </div>
            </div>
            <div className={styles.hireCardBody}>
              <ul className={styles.hireCardBullets}>
                <li>Coordinate safely inside KAILA</li>
                <li>No payment until you agree on scope</li>
                {provider.portfolio.length > 0 ? (
                  <li>{provider.portfolio.length} approved work photo{provider.portfolio.length === 1 ? "" : "s"}</li>
                ) : showingDemoPortfolio ? (
                  <li>Sample work photos shown in development</li>
                ) : null}
              </ul>
              <Link className={styles.profileLink} href={requestHref}>
                Request Service
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.mobileCtaBar}>
        <Link className={styles.profileLink} href={requestHref}>
          Request Service
        </Link>
      </div>
    </main>
  );
}
