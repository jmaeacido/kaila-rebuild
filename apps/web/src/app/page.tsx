"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  House,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

type Reference = { id: number; name: string };
type Provider = {
  id: number;
  displayName: string;
  bio: string;
  rating: string | null;
  completedJobs: number;
  responseMinutes: number | null;
  verified: boolean;
  serviceAreas: Reference[];
};
type ReferenceResult = { categories: Reference[]; areas: Reference[] };

export default function HomePage() {
  const [categories, setCategories] = useState<Reference[]>([]);
  const [areas, setAreas] = useState<Reference[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "searching" | "error"
  >("loading");

  const applyReferences = useCallback((result: ReferenceResult) => {
    setCategories(result.categories);
    setAreas(result.areas);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void fetch("/api/v1/marketplace/reference-data")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Reference data request failed.");
        }
        const body = (await response.json()) as { data: ReferenceResult };
        return body.data;
      })
      .then(applyReferences)
      .catch(() => setStatus("error"));
  }, [applyReferences]);

  async function discover() {
    if (!categoryId || !areaId) {
      return;
    }

    const session = await fetch("/api/v1/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!session.ok) {
      const destination = `/?categoryId=${encodeURIComponent(
        categoryId,
      )}&areaId=${encodeURIComponent(areaId)}`;
      window.location.assign(`/login?next=${encodeURIComponent(destination)}`);
      return;
    }

    setStatus("searching");
    try {
      const response = await fetch(
        `/api/v1/providers?categoryId=${categoryId}&areaId=${areaId}`,
      );
      if (!response.ok) {
        throw new Error("Provider search failed.");
      }
      const body = (await response.json()) as { data: Provider[] };
      setProviders(body.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function chooseCategory(id: number) {
    setCategoryId(String(id));
    document.querySelector("#find-help")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="KAILA home">
          <Image
            className={styles.brandLogo}
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
        </Link>
        <nav className={styles.primaryNav} aria-label="Main navigation">
          <a href="#find-help">Find help</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/community">Community</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.providerLink} href="/login">
            Sign in
          </Link>
          <Link className={styles.headerCta} href="/register">
            Get started
          </Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.routeLine} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <MapPin aria-hidden="true" />
            Trusted local help, right when you need it
          </p>
          <h1 id="home-title">
            Get everyday jobs done by people <em>near you.</em>
          </h1>
          <p className={styles.heroLead}>
            From urgent repairs to beauty, cleaning, and tutoring—tell KAILA
            what you need and hear from trusted local providers.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={styles.primaryCta}
              href="/login?next=%2Fpost-job"
            >
              Post a job
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              className={styles.secondaryCta}
              href="/login?next=%2F%3Fstart%3Dfind"
            >
              <Search aria-hidden="true" />
              Find a provider
            </Link>
          </div>
          <div className={styles.trustLine}>
            <span>
              <ShieldCheck aria-hidden="true" />
              Verified when shown
            </span>
            <span>
              <Clock3 aria-hidden="true" />
              Post in under a minute
            </span>
            <span>
              <MessageCircle aria-hidden="true" />
              Chat in one place
            </span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Local service journey">
          <div className={styles.mapCard}>
            <div className={styles.mapGrid} aria-hidden="true" />
            <span className={styles.mapLabel}>
              <MapPin aria-hidden="true" />
              Your neighborhood
            </span>
            <span className={`${styles.pin} ${styles.pinOne}`}>
              <Wrench aria-hidden="true" />
            </span>
            <span className={`${styles.pin} ${styles.pinTwo}`}>
              <House aria-hidden="true" />
            </span>
            <span className={`${styles.pin} ${styles.pinThree}`}>
              <Sparkles aria-hidden="true" />
            </span>
            <div className={styles.matchCard}>
              <span className={styles.avatar}>M</span>
              <div>
                <strong>Maria’s Home Care</strong>
                <span>
                  <Star aria-hidden="true" />
                  4.9 · 1.2 km away
                </span>
              </div>
              <BadgeCheck aria-label="Verified provider" />
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.findSection}
        id="find-help"
        aria-labelledby="find-title"
      >
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>START NEARBY</p>
          <h2 id="find-title">What do you need help with?</h2>
          <p>Choose a service and area to discover available providers.</p>
        </div>

        <div className={styles.categoryRail} aria-label="Popular services">
          {categories.slice(0, 6).map((category, index) => {
            const icons = [
              Wrench,
              Sparkles,
              House,
              UsersRound,
              BriefcaseBusiness,
              HeartHandshake,
            ];
            const Icon = icons[index % icons.length];
            return (
              <button
                className={
                  categoryId === String(category.id)
                    ? styles.categoryActive
                    : undefined
                }
                key={category.id}
                onClick={() => chooseCategory(category.id)}
                type="button"
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                {category.name}
              </button>
            );
          })}
        </div>

        <div className={styles.searchCard} aria-label="Find local providers">
          <label>
            <span>Service</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
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
            <span>Area</span>
            <select
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
            >
              <option value="">Choose your area</option>
              {areas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => void discover()}
            disabled={!categoryId || !areaId || status === "searching"}
          >
            <Search aria-hidden="true" />
            {status === "searching" ? "Searching…" : "Find providers"}
          </Button>
        </div>

        {status === "loading" && (
          <div
            className={styles.skeletons}
            aria-live="polite"
            aria-label="Loading services"
          >
            <span />
            <span />
          </div>
        )}
        {status === "error" && (
          <Feedback kind="error" title="We couldn’t load providers">
            Check your connection, then try again.
          </Feedback>
        )}
        {status === "ready" && providers?.length === 0 && (
          <div className={styles.empty}>
            <MapPin aria-hidden="true" />
            <h2>No providers here yet</h2>
            <p>Try another nearby area or service.</p>
            <Button variant="secondary" onClick={() => setProviders(null)}>
              Change search
            </Button>
          </div>
        )}
        {providers && providers.length > 0 && (
          <section
            className={styles.results}
            aria-labelledby="results-title"
          >
            <h2 id="results-title">Providers near you</h2>
            <div className={styles.providerGrid}>
              {providers.map((provider) => (
                <article className={styles.providerCard} key={provider.id}>
                  <div className={styles.providerAvatar} aria-hidden="true">
                    {provider.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className={styles.providerTitle}>
                      <h3>{provider.displayName}</h3>
                      {provider.verified && (
                        <span className={styles.verified}>
                          <ShieldCheck aria-hidden="true" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p>{provider.bio}</p>
                    <p className={styles.facts}>
                      {provider.rating ?? "New"} rating ·{" "}
                      {provider.completedJobs} jobs ·{" "}
                      {provider.serviceAreas
                        .map((area) => area.name)
                        .join(", ")}
                    </p>
                    <Button>View profile</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      <section
        className={styles.howSection}
        id="how-it-works"
        aria-labelledby="how-title"
      >
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>SIMPLE FROM START TO FINISH</p>
          <h2 id="how-title">Help is only a few taps away</h2>
        </div>
        <div className={styles.steps}>
          <article>
            <span>1</span>
            <div className={styles.stepIcon}>
              <BriefcaseBusiness aria-hidden="true" />
            </div>
            <h3>Tell us the job</h3>
            <p>Share what you need, where you are, and when you need help.</p>
          </article>
          <article>
            <span>2</span>
            <div className={styles.stepIcon}>
              <UsersRound aria-hidden="true" />
            </div>
            <h3>Compare local offers</h3>
            <p>Review price, timing, experience, ratings, and verified status.</p>
          </article>
          <article>
            <span>3</span>
            <div className={styles.stepIcon}>
              <CheckCircle2 aria-hidden="true" />
            </div>
            <h3>Choose with confidence</h3>
            <p>Hire, chat, follow progress, and review—all through KAILA.</p>
          </article>
        </div>
      </section>

      <section className={styles.audienceSection}>
        <article className={styles.clientPanel}>
          <div>
            <p className={styles.kicker}>FOR CLIENTS</p>
            <h2>Your to-do list just got lighter.</h2>
            <p>
              Find nearby people for repairs, cleaning, personal care, lessons,
              and more.
            </p>
          </div>
          <Link href="/register?next=%2Fpost-job">
            Post your first job
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>
        <article className={styles.providerPanel}>
          <div>
            <p className={styles.kicker}>FOR PROVIDERS</p>
            <h2>Turn your skills into local opportunity.</h2>
            <p>
              Build trust, find work nearby, send offers, and grow your
              reputation.
            </p>
          </div>
          <Link href="/register?role=provider&next=%2Fprovider-profile">
            Build your provider profile
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/">
          <Image
            className={styles.brandLogo}
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
          />
        </Link>
        <p>Nearby help, made simple.</p>
        <nav aria-label="Footer navigation">
          <Link href="/community">Community</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/help/katabang">Help</Link>
        </nav>
      </footer>
    </main>
  );
}
