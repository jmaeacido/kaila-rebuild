"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Star,
} from "lucide-react";
import { Feedback } from "@kaila/ui";
import { ServiceCategoryIcon } from "../../components/service-category-icon";
import styles from "./home.module.css";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";

type User = {
  name: string;
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
  reputation: { averageRating: number | null; reviewCount: number };
};

type Reference = { id: number; name: string };
type Category = Reference & { icon: string };
type Job = {
  id: string;
  role: "client" | "provider";
  status: string;
  title: string;
  area: Reference;
  category: Category;
  scheduledAt: string | null;
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
};

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
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [userResponse, referenceResponse, jobsResponse] = await Promise.all([
        fetch("/api/v1/me", { cache: "no-store" }),
        fetch("/api/v1/marketplace/reference-data"),
        fetch("/api/v1/jobs", { cache: "no-store" }),
      ]);

      if (!userResponse.ok || !referenceResponse.ok || !jobsResponse.ok) {
        throw new Error("Home data request failed.");
      }

      const userBody = (await userResponse.json()) as { data: User };
      const referenceBody = (await referenceResponse.json()) as {
        data: { categories: Category[] };
      };
      const jobsBody = (await jobsResponse.json()) as { data: Job[] };
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

      setUser(userBody.data);
      setCategories(referenceBody.data.categories);
      setJobs(jobsBody.data);
      setOpportunities(providerOpportunities);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);
  useRealtimeInvalidation(() => void load(), (event) =>
    ["service_job", "offer_thread", "notification", "job_conversation", "travel_session"].includes(event.resourceType),
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const reconcile = () => void load();
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
  const activeJobs = isProvider ? activeProviderJobs : activeClientJobs;
  const currentJob = activeJobs[0];
  const jobHistory = jobs.filter(
    (job) =>
      job.role === (isProvider ? "provider" : "client") &&
      ["completed", "rated_closed", "cancelled"].includes(job.status),
  );
  const latestOpportunity = opportunities[0];
  const primaryHref = isProvider ? "/opportunities" : "/post-job";
  const primaryLabel = isProvider ? "Find nearby work" : "Post a job";

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

  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.route} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.greeting}>Hi, {firstName}</p>
        <p className={styles.heroReputation}>
          <Star aria-hidden="true" />
          {user.reputation.averageRating === null
            ? "New · No published reviews yet"
            : `${user.reputation.averageRating.toFixed(1)} overall · ${user.reputation.reviewCount} review${user.reputation.reviewCount === 1 ? "" : "s"}`}
        </p>
        <h1 id="home-title">
          {isProvider
            ? "Ready to help someone nearby?"
            : "What do you need right now?"}
        </h1>
        <p>
          {isProvider
            ? "See local jobs that match your services and coverage area."
            : "Tell us what needs doing and hear from local providers."}
        </p>
        <Link className={styles.primaryAction} href={primaryHref}>
          {isProvider ? (
            <BriefcaseBusiness aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {primaryLabel}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      {!isProvider && (
        <section className={styles.discovery} aria-labelledby="services-title">
          <header>
            <div>
              <p className={styles.eyebrow}>POPULAR NEAR YOU</p>
              <h2 id="services-title">Choose a service</h2>
            </div>
            <Link href="/post-job">
              <Search aria-hidden="true" />
              View all
            </Link>
          </header>
          <div className={styles.categoryGrid}>
            {categories.slice(0, 6).map((category) => {
              return (
                <Link
                  href={`/post-job?categoryId=${category.id}`}
                  key={category.id}
                >
                  <span>
                    <ServiceCategoryIcon icon={category.icon} aria-hidden="true" />
                  </span>
                  {category.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.current} aria-labelledby="current-title">
        <header>
          <div>
            <p className={styles.eyebrow}>
              {activeJobs.length ? `YOUR ACTIVE JOB${activeJobs.length === 1 ? "" : "S"}` : isProvider ? "YOUR NEXT OPPORTUNITY" : "YOUR LATEST JOB"}
            </p>
            <h2 id="current-title">
              {activeJobs.length ? "Hired work" : isProvider ? "Nearby work" : "Current activity"}
            </h2>
          </div>
          <Link href={currentJob ? `/jobs/${currentJob.id}` : isProvider ? "/opportunities" : "/post-job"}>
            {currentJob ? "Open job" : isProvider ? "See all" : "New job"}
            <ChevronRight aria-hidden="true" />
          </Link>
        </header>

        {activeJobs.length ? (
          <div className={styles.activeJobList}>
          {activeJobs.map((job) => <article className={styles.activityCard} key={job.id}>
            <span className={styles.activityIcon}>
              <ServiceCategoryIcon icon={job.category.icon} aria-hidden="true" />
            </span>
            <div>
              <span>{jobStatusLabels[job.status] || "Hired job updated"}</span>
              <h3>{job.title}</h3>
              <p><MapPin aria-hidden="true" />{job.area.name}</p>
            </div>
            <Link href={`/jobs/${job.id}`}>
              Continue
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>)}
          </div>
        ) : isProvider && latestOpportunity ? (
          <article className={styles.activityCard}>
            <span className={styles.activityIcon}>
              <ServiceCategoryIcon icon={latestOpportunity.category.icon} aria-hidden="true" />
            </span>
            <div>
              <span>{latestOpportunity.category.name}</span>
              <h3>{latestOpportunity.title}</h3>
              <p>
                <MapPin aria-hidden="true" />
                {latestOpportunity.area.name}
              </p>
            </div>
            <Link href={`/opportunities/${latestOpportunity.jobId}`}>
              View
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        ) : (
          <div className={styles.empty}>
            <BriefcaseBusiness aria-hidden="true" />
            <div>
              <h3>{isProvider ? "No nearby jobs yet" : "No active jobs"}</h3>
              <p>
                {isProvider
                  ? "We’ll show matching local work here when it becomes available."
                  : "Completed work stays in Job history. Post a new job whenever you need help."}
              </p>
            </div>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </div>
        )}
      </section>

      <section className={styles.history} aria-labelledby="history-title" id="job-history">
          <header>
            <div>
              <p className={styles.eyebrow}>{isProvider ? "YOUR WORK" : "YOUR JOBS"}</p>
              <h2 id="history-title">Job history</h2>
            </div>
            <span>{jobHistory.length} job{jobHistory.length === 1 ? "" : "s"}</span>
          </header>
          {jobHistory.length ? (
            <div className={styles.historyList}>
              {jobHistory.map((job) => (
                <Link href={`/jobs/${job.id}`} key={job.id}>
                  <span className={styles.historyIcon}><ServiceCategoryIcon icon={job.category.icon} aria-hidden="true" /></span>
                  <span>
                    <strong>{job.title}</strong>
                    <small><MapPin aria-hidden="true" /> {job.area.name}</small>
                    {job.ratingReceived && (
                      <small className={styles.jobRating}>
                        <Star aria-hidden="true" />
                        {job.ratingReceived.rating}.0 received
                        {job.ratingGiven ? ` · ${job.ratingGiven.rating}.0 given` : ""}
                      </small>
                    )}
                  </span>
                  <span className={styles.historyStatus}>{jobStatusLabels[job.status] || job.status}</span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <BriefcaseBusiness aria-hidden="true" />
              <div>
                <h3>No hired jobs yet</h3>
                <p>{isProvider ? "Jobs appear here after a client accepts your offer." : "Posted jobs appear here as they move from offers to completion."}</p>
              </div>
              <Link href={isProvider ? "/opportunities" : "/post-job"}>{isProvider ? "Find nearby work" : "Post a job"}</Link>
            </div>
          )}
        </section>

      <nav className={styles.bottomNav} aria-label="Marketplace navigation">
        <Link aria-current="page" href="/home" prefetch={false}>
          <Home aria-hidden="true" />
          Home
        </Link>
        <Link href="/post-job" prefetch={false}>
          <Plus aria-hidden="true" />
          Post
        </Link>
        <Link
          href={user.providerEligible ? "/opportunities" : "/provider-profile"}
          prefetch={false}
        >
          <BriefcaseBusiness aria-hidden="true" />
          Work
        </Link>
        <Link href="/messages" prefetch={false}>
          <MessageCircle aria-hidden="true" />
          Messages
        </Link>
        <Link href="/account" prefetch={false}>
          <Settings aria-hidden="true" />
          Account
        </Link>
      </nav>
    </main>
  );
}
