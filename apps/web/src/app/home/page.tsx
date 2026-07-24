"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Hammer,
  Home,
  House,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { Feedback } from "@kaila/ui";
import type { LucideIcon } from "lucide-react";
import styles from "./home.module.css";

type User = {
  name: string;
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
};

type Reference = { id: number; name: string };
type Job = {
  id: string;
  status: string;
  title: string;
  area: Reference;
  category: Reference;
  scheduledAt: string | null;
};
type Opportunity = {
  id: number;
  jobId: string;
  title: string;
  area: Reference;
  category: Reference;
  scheduleType: string;
  scheduledAt: string | null;
};

const categoryIcons: LucideIcon[] = [
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  House,
  BookOpen,
];

const jobStatusLabels: Record<string, string> = {
  draft: "Draft",
  posted: "Waiting for offers",
  offered: "Offers received",
  hired: "Provider selected",
  traveling: "Provider on the way",
  working: "Work in progress",
  completed: "Completed",
  rated_closed: "Completed and rated",
};

export default function AuthenticatedHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Reference[]>([]);
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
        data: { categories: Reference[] };
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
  const latestJob = jobs[0];
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
            {categories.slice(0, 6).map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length];
              return (
                <Link
                  href={`/post-job?categoryId=${category.id}`}
                  key={category.id}
                >
                  <span>
                    <Icon aria-hidden="true" />
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
              {isProvider ? "YOUR NEXT OPPORTUNITY" : "YOUR LATEST JOB"}
            </p>
            <h2 id="current-title">
              {isProvider ? "Nearby work" : "Current activity"}
            </h2>
          </div>
          <Link href={isProvider ? "/opportunities" : "/post-job"}>
            {isProvider ? "See all" : "New job"}
            <ChevronRight aria-hidden="true" />
          </Link>
        </header>

        {isProvider && latestOpportunity ? (
          <article className={styles.activityCard}>
            <span className={styles.activityIcon}>
              <BriefcaseBusiness aria-hidden="true" />
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
        ) : !isProvider && latestJob ? (
          <article className={styles.activityCard}>
            <span className={styles.activityIcon}>
              <Clock3 aria-hidden="true" />
            </span>
            <div>
              <span>
                {jobStatusLabels[latestJob.status] || "Job updated"}
              </span>
              <h3>{latestJob.title}</h3>
              <p>
                <MapPin aria-hidden="true" />
                {latestJob.area.name}
              </p>
            </div>
            {latestJob.status === "posted" ? (
              <Link href={`/jobs/${latestJob.id}/offers`}>
                Offers
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <span className={styles.statusPill}>
                {latestJob.category.name}
              </span>
            )}
          </article>
        ) : (
          <div className={styles.empty}>
            <BriefcaseBusiness aria-hidden="true" />
            <div>
              <h3>{isProvider ? "No nearby jobs yet" : "No jobs yet"}</h3>
              <p>
                {isProvider
                  ? "We’ll show matching local work here when it becomes available."
                  : "Post what you need and matching providers can send offers."}
              </p>
            </div>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </div>
        )}
      </section>

      <section className={styles.helpCard} aria-label="KAILA help">
        <span>
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <h2>Not sure where to start?</h2>
          <p>Katabang can guide you through posting, offers, and job issues.</p>
        </div>
        <Link href="/help/katabang">
          Ask Katabang
          <ArrowRight aria-hidden="true" />
        </Link>
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
