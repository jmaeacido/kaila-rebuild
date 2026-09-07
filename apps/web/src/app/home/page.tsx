"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  MapPin,
  Navigation,
  Search,
  Star,
} from "lucide-react";
import { Feedback } from "@kaila/ui";
import { MarketplaceNavigation } from "../../components/marketplace-navigation";
import { ServiceCategoryBadge, ServiceCategoryIcon } from "../../components/service-category-icon";
import { OpportunityRouteMetrics } from "../../components/job-request-location";
import styles from "./home.module.css";
import { isEphemeralRealtimeEvent } from "../notification-feedback";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import type { TravelMetrics } from "../travel-metrics";

type User = {
  name: string;
  avatarUrl: string | null;
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
  reputation: { averageRating: number | null; reviewCount: number };
};

type Reference = { id: number; name: string };
type Category = Reference & { icon: string };
type Counterpart = {
  role: "client" | "provider";
  displayName: string;
  avatarUrl: string | null;
  rating: string | number | null;
  reviewCount: number;
};
type Job = {
  id: string;
  role: "client" | "provider";
  status: string;
  title: string;
  area: Reference;
  category: Category;
  scheduledAt: string | null;
  counterpart: Counterpart | null;
  travel: TravelMetrics | null;
  serviceLocationMode: "at_client" | "at_provider" | "remote";
  ratingReceived: { rating: number } | null;
  ratingGiven: { rating: number } | null;
};
type Opportunity = {
  id: number;
  jobId: string;
  title: string;
  area: Reference;
  category: Category;
  scheduleType: string;
  scheduledAt: string | null;
  client: { displayName: string; avatarUrl: string | null; rating: string | number | null; reviewCount: number };
  approximateLocation: { latitude: number; longitude: number } | null;
  budgetMinCentavos: number | null;
  budgetMaxCentavos: number | null;
  offer: { id: string; status: string; latestRevisionNumber: number } | null;
};
type Provider = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  services: Reference[];
  serviceAreas: Reference[];
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
};
type OwnedProvider = {
  completed_jobs: number;
  response_minutes: number | null;
  service_areas?: Array<{ id: number; name: string; type?: string }>;
};

function coverageAreaLabel(
  serviceAreas: OwnedProvider["service_areas"] | undefined,
): string | null {
  if (!serviceAreas?.length) return null;
  const locality = serviceAreas.find((area) =>
    ["city", "municipality"].includes(area.type ?? ""),
  );
  return locality?.name ?? serviceAreas[0]?.name ?? null;
}

async function resolveAreaName(areaId: number | null | undefined): Promise<string | null> {
  if (!areaId) return null;
  try {
    const response = await fetch(`/api/v1/marketplace/areas/${areaId}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data: { name: string } };
    return body.data.name || null;
  } catch {
    return null;
  }
}

const jobStatusLabels: Record<string, string> = {
  draft: "Draft",
  posted: "Waiting for offers",
  offers_received: "Offers received",
  provider_selected: "Provider selected",
  provider_traveling: "Provider on the way",
  completion_submitted: "Waiting for confirmation",
  revision_requested: "Revision requested",
  working: "Work in progress",
  completed: "Completed",
  rated_closed: "Completed and rated",
};

export default function AuthenticatedHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ownedProvider, setOwnedProvider] = useState<OwnedProvider | null>(null);
  const [homeAreaName, setHomeAreaName] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setStatus("loading");
    try {
      const [userResponse, referenceResponse, jobsResponse, providersResponse, profileResponse] = await Promise.all([
        fetch("/api/v1/me", { cache: "no-store" }),
        fetch("/api/v1/marketplace/reference-data"),
        fetch("/api/v1/jobs", { cache: "no-store" }),
        fetch("/api/v1/providers", { cache: "no-store" }),
        fetch("/api/v1/me/marketplace-profile", { cache: "no-store" }),
      ]);

      if (!userResponse.ok || !referenceResponse.ok || !jobsResponse.ok || !providersResponse.ok || !profileResponse.ok) {
        throw new Error("Home data request failed.");
      }

      const userBody = (await userResponse.json()) as { data: User };
      const referenceBody = (await referenceResponse.json()) as {
        data: { categories: Category[] };
      };
      const jobsBody = (await jobsResponse.json()) as { data: Job[] };
      const providersBody = (await providersResponse.json()) as { data: Provider[] };
      const profileBody = (await profileResponse.json()) as {
        data: {
          client: { area_id: number | null } | null;
          provider: OwnedProvider | null;
        };
      };
      let providerOpportunities: Opportunity[] = [];

      if (userBody.data.providerEligible) {
        const opportunityResponse = await fetch("/api/v1/opportunities", {
          cache: "no-store",
        });
        if (!opportunityResponse.ok) {
          throw new Error("Opportunity request failed.");
        }
        providerOpportunities = (
          (await opportunityResponse.json()) as { data: Opportunity[] }
        ).data;
      }

      const resolvedHomeArea = await resolveAreaName(profileBody.data.client?.area_id);

      setUser(userBody.data);
      setCategories(referenceBody.data.categories);
      setJobs(jobsBody.data);
      setProviders(providersBody.data);
      setOwnedProvider(profileBody.data.provider);
      setHomeAreaName(resolvedHomeArea);
      setOpportunities(providerOpportunities);
      setStatus("ready");
    } catch {
      if (!quiet) setStatus("error");
    }
  }, []);
  useRealtimeInvalidation(() => void load(true), (event) =>
    ["service_job", "offer_thread", "notification", "job_conversation", "travel_session", "job_asset", "job_opportunity", "message_asset"].includes(event.resourceType)
    && !isEphemeralRealtimeEvent(event.type),
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const reconcile = () => void load(true);
    window.addEventListener("online", reconcile);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", reconcile);
    };
  }, [load]);

  const isProvider =
    user?.activeMode === "provider" && user.providerEligible === true;
  const firstName = useMemo(
    () => user?.name.trim().split(/\s+/)[0] || "there",
    [user],
  );
  const activeClientJobs = jobs.filter(
    (job) =>
      job.role === "client" &&
      !["completed", "rated_closed", "cancelled"].includes(job.status),
  );
  const activeProviderJobs = jobs.filter(
    (job) =>
      job.role === "provider" &&
      !["completed", "rated_closed", "cancelled"].includes(job.status),
  );
  if (status === "loading") {
    return (
      <main className={styles.shell} aria-label="Loading Home">
        <div className={styles.heroSkeleton} />
        <div className={styles.cardSkeletons}>
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  if (status === "error" || !user) {
    return (
      <main className={styles.shell}>
        <Feedback kind="error" title="We couldn’t load your Home">
          Check your connection and try again.
        </Feedback>
        <button className={styles.retry} onClick={() => void load()} type="button">
          Try again
        </button>
      </main>
    );
  }

  if (!isProvider) {
    return (
      <ClientHome
        firstName={firstName}
        avatarUrl={user.avatarUrl}
        categories={categories}
        activeJobs={activeClientJobs}
        providers={providers}
        homeAreaName={homeAreaName}
      />
    );
  }

  return (
    <ProviderHome
      firstName={firstName}
      avatarUrl={user.avatarUrl}
      user={user}
      provider={ownedProvider}
      activeJobs={activeProviderJobs}
      opportunities={opportunities}
    />
  );
}

function ProviderHome({
  firstName,
  avatarUrl,
  user,
  provider,
  activeJobs,
  opportunities,
}: {
  firstName: string;
  avatarUrl: string | null;
  user: User;
  provider: OwnedProvider | null;
  activeJobs: Job[];
  opportunities: Opportunity[];
}) {
  const locationLabel = coverageAreaLabel(provider?.service_areas);
  const openOpportunities = opportunities.filter((opportunity) => !opportunity.offer);
  const sentOffers = opportunities.filter((opportunity) => opportunity.offer);
  const todaysJobs = activeJobs.filter((job) => !job.scheduledAt || isToday(job.scheduledAt));

  return (
    <main className={`${styles.shell} ${styles.providerShell}`}>
      <header className={styles.providerWelcome}>
        <GreetingAvatar name={firstName} avatarUrl={avatarUrl} />
        <div>
          <p>Good {timeOfDay()},</p>
          <h1>{firstName}</h1>
          {locationLabel ? (
            <span className={styles.providerLocation}><MapPin aria-hidden="true" />{locationLabel}</span>
          ) : null}
        </div>
        <Link className={styles.availabilityPill} href="/provider-profile" aria-label="Review provider availability">
          <span aria-hidden="true" />Available
        </Link>
      </header>

      <section className={styles.providerSummary} aria-label="Provider summary">
        <div><BriefcaseBusiness aria-hidden="true" /><span><small>Jobs Completed</small><strong>{provider?.completed_jobs ?? 0}</strong></span></div>
        <div><Star aria-hidden="true" /><span><small>Rating</small><strong>{user.reputation.averageRating?.toFixed(1) ?? "New"}</strong></span></div>
        <div><CalendarClock aria-hidden="true" /><span><small>Response</small><strong>{provider?.response_minutes ? `${provider.response_minutes} min` : "New"}</strong></span></div>
        <div><Search aria-hidden="true" /><span><small>Opportunities</small><strong>{openOpportunities.length}</strong></span></div>
      </section>

      <ProviderSection title="Jobs Near You" href="/opportunities" id="matched-jobs-title">
        {openOpportunities.length ? (
          <div className={styles.providerCardList}>
            {openOpportunities.slice(0, 3).map((opportunity) => (
              <article className={styles.providerJobCard} key={opportunity.id}>
                <ServiceCategoryBadge icon={opportunity.category.icon} className={styles.providerJobIcon} />
                <div className={styles.providerJobBody}>
                  <span className={styles.providerJobCategory}>{opportunity.category.name}</span>
                  <h3>{opportunity.title}</h3>
                  <p><MapPin aria-hidden="true" />{opportunity.area.name}</p>
                  <p className={styles.providerRoute}><Navigation aria-hidden="true" /><OpportunityRouteMetrics opportunityId={opportunity.id} location={opportunity.approximateLocation} /></p>
                  <strong className={styles.providerBudget}>{money(opportunity.budgetMinCentavos, opportunity.budgetMaxCentavos)}</strong>
                </div>
                <Link href={`/opportunities/${opportunity.jobId}`}>View Job</Link>
              </article>
            ))}
          </div>
        ) : (
          <ProviderEmpty icon={<BriefcaseBusiness aria-hidden="true" />} title="No nearby jobs right now" copy="We’ll show new jobs here when they match your services and area." />
        )}
      </ProviderSection>

      <ProviderSection title="Today’s Schedule" href="/home#current-title" id="current-title">
        {todaysJobs.length ? (
          <div className={styles.providerCompactList}>
            {todaysJobs.slice(0, 3).map((job) => (
              <Link href={`/jobs/${job.id}`} key={job.id}>
                <span className={styles.providerCompactIcon}><CalendarClock aria-hidden="true" /></span>
                <span><strong>{job.title}</strong><small><MapPin aria-hidden="true" />{job.area.name}</small></span>
                <span className={styles.providerTime}>{scheduleLabel(job)}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <ProviderEmpty icon={<CalendarClock aria-hidden="true" />} title="No work scheduled" copy="Accepted jobs will appear here." />
        )}
      </ProviderSection>

      <ProviderSection title="Your Offers" href="/opportunities">
        {sentOffers.length ? (
          <div className={styles.providerCompactList}>
            {sentOffers.slice(0, 3).map((opportunity) => (
              <Link href={`/opportunities/${opportunity.jobId}`} key={opportunity.id}>
                <ServiceCategoryBadge icon={opportunity.category.icon} className={styles.providerOfferIcon} />
                <span><strong>{opportunity.title}</strong><small>Offer sent · Revision {opportunity.offer?.latestRevisionNumber}</small></span>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <ProviderEmpty icon={<ClipboardList aria-hidden="true" />} title="No offers yet" copy="Jobs you make an offer on will appear here." />
        )}
      </ProviderSection>

      <MarketplaceNavigation />
    </main>
  );
}

function ProviderSection({ title, href, id, children }: { title: string; href: string; id?: string; children: ReactNode }) {
  return (
    <section className={styles.providerSection} aria-labelledby={id}>
      <header><h2 id={id}>{title}</h2><Link href={href}>See All</Link></header>
      {children}
    </section>
  );
}

function ProviderEmpty({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className={styles.providerEmpty}>{icon}<span><strong>{title}</strong><small>{copy}</small></span></div>;
}

function scheduleLabel(job: Job) {
  if (!job.scheduledAt) return "ASAP";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(job.scheduledAt));
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function money(min: number | null, max: number | null) {
  if (min === null && max === null) return "Open to offers";
  const peso = (value: number | null) => value === null ? "—" : `₱${(value / 100).toLocaleString()}`;
  return `${peso(min)} – ${peso(max)}`;
}

function ClientHome({
  firstName,
  avatarUrl,
  categories,
  activeJobs,
  providers,
  homeAreaName,
}: {
  firstName: string;
  avatarUrl: string | null;
  categories: Category[];
  activeJobs: Job[];
  providers: Provider[];
  homeAreaName: string | null;
}) {
  const visibleCategories = categories.slice(0, 7);
  const locationLabel = homeAreaName;

  return (
    <main className={`${styles.shell} ${styles.clientShell}`}>
      <header className={styles.clientWelcome}>
        <GreetingAvatar name={firstName} avatarUrl={avatarUrl} />
        <div>
          <p>Good {timeOfDay()},</p>
          <h1>{firstName}</h1>
          {locationLabel ? (
            <span><MapPin aria-hidden="true" />{locationLabel}</span>
          ) : null}
        </div>
      </header>

      <Link className={styles.serviceSearch} href="/providers">
        <Search aria-hidden="true" />
        <span>What service do you need?</span>
      </Link>

      <section className={styles.clientCategories} aria-label="Service categories">
        <div className={styles.clientCategoryGrid}>
          {visibleCategories.map((category) => (
            <Link href={`/post-job?categoryId=${category.id}`} key={category.id}>
              <ServiceCategoryBadge icon={category.icon} className={styles.clientServiceIcon} />
              <strong>{category.name}</strong>
            </Link>
          ))}
          <Link href="/post-job" className={styles.allServices}>
            <ServiceCategoryBadge icon="Ellipsis" className={styles.clientServiceIcon} />
            <strong>More services</strong>
          </Link>
        </div>
      </section>

      <Link className={styles.postJobBanner} href="/post-job">
        <span className={styles.postJobIcon}><ClipboardList aria-hidden="true" /></span>
        <span>
          <strong>Post a Job</strong>
          <small>Tell KAILA what you need and receive offers nearby.</small>
        </span>
        <span className={styles.postJobArrow}><ArrowRight aria-hidden="true" /></span>
      </Link>

      <section className={styles.clientSection} aria-labelledby="client-active-jobs">
        <header>
          <h2 id="client-active-jobs">Active Jobs</h2>
          <Link href="/home#current-title">See All</Link>
        </header>
        {activeJobs.length > 0 ? (
          <div className={styles.clientJobList}>
            {activeJobs.slice(0, 2).map((job) => (
              <article className={styles.clientJobCard} key={job.id}>
                <span className={styles.clientJobIcon}>
                  <ServiceCategoryIcon icon={job.category.icon} aria-hidden="true" />
                </span>
                <div>
                  <h3>{job.title}</h3>
                  <p>{jobStatusLabels[job.status] || "Job updated"}</p>
                  <small><MapPin aria-hidden="true" />{job.area.name}</small>
                </div>
                <Link href={`/jobs/${job.id}`}>View job</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.clientEmpty}>
            <span><ClipboardList aria-hidden="true" /></span>
            <div><h3>No active jobs</h3><p>Your posted jobs will appear here.</p></div>
            <Link href="/post-job">Post a Job</Link>
          </div>
        )}
      </section>

      <section className={styles.clientSection} aria-labelledby="trusted-providers">
        <header>
          <h2 id="trusted-providers">Trusted Providers Nearby</h2>
          <Link href="/providers">See All</Link>
        </header>
        {providers.length > 0 ? (
          <div className={styles.trustedGrid}>
            {providers.slice(0, 2).map((provider) => (
              <Link className={styles.trustedCard} href={`/providers/${provider.id}`} key={provider.id}>
                <span className={styles.providerAvatar}>
                  {provider.avatarUrl ? (
                    <Image src={provider.avatarUrl} alt={`${provider.displayName} profile`} width={56} height={56} unoptimized />
                  ) : provider.displayName.charAt(0).toUpperCase()}
                </span>
                <span className={styles.providerDetails}>
                  <strong>{provider.displayName}</strong>
                  <small className={styles.providerRating}><Star aria-hidden="true" />{provider.rating === null ? "New" : provider.rating.toFixed(1)} ({provider.reviewCount})</small>
                  <small><MapPin aria-hidden="true" />{provider.serviceAreas[0]?.name ?? "Local provider"}</small>
                  {provider.verified && <small className={styles.verified}><BadgeCheck aria-hidden="true" />Verified</small>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.clientEmpty}>
            <span><Search aria-hidden="true" /></span>
            <div><h3>No providers to show yet</h3><p>Try browsing all available providers.</p></div>
            <Link href="/providers">Find providers</Link>
          </div>
        )}
      </section>

      <MarketplaceNavigation />
    </main>
  );
}

function GreetingAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <Link className={styles.greetingAvatar} href="/account" aria-label="Open account">
      <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      {avatarUrl ? <Image src={avatarUrl} alt="" width={48} height={48} unoptimized /> : null}
    </Link>
  );
}

function timeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
