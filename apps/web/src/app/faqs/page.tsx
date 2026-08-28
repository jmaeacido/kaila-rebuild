"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  LifeBuoy,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BrandMark } from "../../components/brand-mark";
import { SUPPORT_EMAIL } from "../../lib/support-email";
import styles from "./faqs.module.css";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  href?: { label: string; path: string };
};

type FaqGroup = {
  id: string;
  title: string;
  items: FaqItem[];
};

const groups: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        id: "what-is-kaila",
        question: "What is KAILA?",
        answer:
          "KAILA is a local services marketplace. Clients post what they need, nearby independent providers send offers, and both sides manage the job — messages, travel, work, and ratings — in one place.",
      },
      {
        id: "client-or-provider",
        question: "Can I use KAILA as a client and a provider?",
        answer:
          "Yes. One account can switch between client and provider mode after you set up a provider profile. Your jobs, messages, and ratings stay attached to the same account.",
        href: { label: "Open account", path: "/account" },
      },
      {
        id: "google-sign-in",
        question: "Can I sign in with Google?",
        answer:
          "Yes. You can create an account or sign in with Google. Google accounts confirm identity with your email when deleting an account, because KAILA does not store a password for that sign-in method.",
        href: { label: "Sign in", path: "/login" },
      },
    ],
  },
  {
    id: "clients",
    title: "For clients",
    items: [
      {
        id: "post-job",
        question: "How do I post a job?",
        answer:
          "From Home, tap Post a job, choose a service, describe the work, and pin the job site on the map. KAILA uses that pin to set the barangay for matching nearby providers.",
        href: { label: "Post a job", path: "/post-job" },
      },
      {
        id: "offers",
        question: "How do offers work?",
        answer:
          "Matched providers can send offers with price, timing, and scope. Compare those details on the job, then accept the offer that fits you. KAILA never chooses a provider or sets a price for you.",
        href: { label: "View your jobs", path: "/jobs" },
      },
      {
        id: "home-area",
        question: "What is my home area?",
        answer:
          "Your home area is the barangay you set in Account. It helps personalize local guidance. If your phone location is in a different city or municipality, KAILA shows a reminder so you can update it.",
        href: { label: "Update home area", path: "/account" },
      },
      {
        id: "payments",
        question: "Does KAILA take payments?",
        answer:
          "KAILA helps you hire and coordinate local work. Payment arrangements stay between you and the provider unless a future release says otherwise. Agree on price in the offer before work starts.",
      },
    ],
  },
  {
    id: "providers",
    title: "For providers",
    items: [
      {
        id: "become-provider",
        question: "How do I start taking jobs?",
        answer:
          "Open your provider profile, add the services you offer, set your coverage area, and complete required profile details. When you are eligible and in provider mode, nearby matching jobs appear under Work.",
        href: { label: "Provider profile", path: "/provider-profile" },
      },
      {
        id: "coverage",
        question: "How does coverage area affect matches?",
        answer:
          "KAILA matches jobs whose barangay falls inside the cities, municipalities, or barangays you cover. Keep coverage accurate so you only see work you can reach.",
        href: { label: "Update coverage", path: "/provider-profile" },
      },
      {
        id: "travel",
        question: "What happens after I am hired?",
        answer:
          "You can message the client, start travel navigation when heading to the job, mark arrival, complete the work, and submit completion. The client confirms, then both sides can rate.",
      },
    ],
  },
  {
    id: "trust-safety",
    title: "Trust and safety",
    items: [
      {
        id: "safety",
        question: "How do I report a safety problem?",
        answer:
          "Use Safety to report scams, threats, or unsafe conduct. For immediate danger, contact local emergency services first, then report in KAILA so the team can review.",
        href: { label: "Open Safety", path: "/safety" },
      },
      {
        id: "ratings",
        question: "When do ratings appear?",
        answer:
          "After a job is completed, both sides can leave a rating. Published ratings help the community choose trustworthy local help.",
      },
      {
        id: "delete-account",
        question: "How do I delete my account?",
        answer:
          "Go to Settings → Delete account. Finish any active jobs, disputes, or safety cases first. Password accounts confirm with their password; Google accounts confirm by typing their email, then typing DELETE.",
        href: { label: "Account deletion", path: "/account-deletion" },
      },
    ],
  },
  {
    id: "app-help",
    title: "Using the app",
    items: [
      {
        id: "katabang",
        question: "What is Katabang?",
        answer:
          "Katabang is KAILA’s in-app assistant. It can guide you to the right screen, but it never chooses providers, sets prices, or changes your account for you.",
      },
      {
        id: "notifications",
        question: "How do notifications work?",
        answer:
          "KAILA can send in-app and push updates for offers, messages, calls, and job changes. Manage quiet hours and notification preferences in Settings.",
        href: { label: "Open Settings", path: "/settings" },
      },
      {
        id: "support",
        question: "How do I contact support?",
        answer:
          `Open Support to start a request about your account, booking, or app experience and follow replies in the same thread. You can also email ${SUPPORT_EMAIL} when you cannot stay signed in.`,
        href: { label: "Contact support", path: "/support" },
      },
    ],
  },
];

const groupIcons = {
  "getting-started": Sparkles,
  clients: Users,
  providers: BriefcaseBusiness,
  "trust-safety": ShieldCheck,
  "app-help": Smartphone,
} as const;

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: groups.flatMap((group) => group.items).map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function FaqAccordionItem({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonId = useId();

  return (
    <article className={styles.item}>
      <h3>
        <button
          id={buttonId}
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span>{item.question}</span>
          <ChevronDown aria-hidden="true" className={open ? styles.chevronOpen : undefined} />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={open ? styles.panelOpen : styles.panel}
        hidden={!open}
      >
        <p>{item.answer}</p>
        {item.href ? (
          <Link href={item.href.path}>{item.href.label}</Link>
        ) : null}
      </div>
    </article>
  );
}

export default function FaqsPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(groups[0]?.items[0]?.id ?? null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.question.toLowerCase().includes(needle)
            || item.answer.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const resultCount = filtered.reduce((total, group) => total + group.items.length, 0);
  const hasQuery = query.trim().length > 0;

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <nav className={styles.topbar} aria-label="FAQs navigation">
        <Link className={styles.brand} href="/" aria-label="KAILA home">
          <BrandMark priority />
        </Link>
        <Link className={styles.back} href="/">
          <ArrowLeft aria-hidden="true" />
          Back home
        </Link>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroIcon} aria-hidden="true"><CircleHelp /></span>
          <p className={styles.eyebrow}>Help center</p>
          <h1>How can we help?</h1>
          <p>Find quick answers about hiring, offering services, and staying safe on KAILA.</p>
        </div>
        <div className={styles.searchArea}>
          <label className={styles.search}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>Search frequently asked questions</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you need help with?"
              autoComplete="off"
            />
            {hasQuery ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear FAQ search">
                <X aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <p className={styles.searchHint}>Try “offers”, “coverage”, or “account”.</p>
        </div>
      </header>

      {!hasQuery ? (
        <nav className={styles.topicNav} aria-label="Browse FAQs by topic">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Browse by topic</p>
            <h2>Choose what you need help with</h2>
          </div>
          <div className={styles.topicList}>
            {groups.map((group) => {
              const Icon = groupIcons[group.id as keyof typeof groupIcons];
              return (
                <a href={`#faq-group-${group.id}`} key={group.id}>
                  <span aria-hidden="true"><Icon /></span>
                  <strong>{group.title}</strong>
                  <small>{group.items.length} questions</small>
                  <ArrowRight aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </nav>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.groups} aria-label="FAQ groups">
          {hasQuery ? (
            <div className={styles.results} aria-live="polite">
              <div>
                <p className={styles.eyebrow}>Search results</p>
                <h2>{resultCount === 1 ? "1 answer found" : `${resultCount} answers found`}</h2>
              </div>
              <button type="button" onClick={() => setQuery("")}>Clear search</button>
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <CircleHelp aria-hidden="true" />
              <strong>No matching questions</strong>
              <p>Try a different word, or contact support for personal help.</p>
              <button type="button" onClick={() => setQuery("")}>Show all questions</button>
            </div>
          ) : null}
          {filtered.map((group) => (
            <section className={styles.group} key={group.id} aria-labelledby={`faq-group-${group.id}`}>
              <h2 id={`faq-group-${group.id}`}>{group.title}</h2>
              <div className={styles.list}>
                {group.items.map((item) => (
                  <FaqAccordionItem
                    key={item.id}
                    item={item}
                    open={openId === item.id}
                    onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>

        <aside className={styles.aside} aria-label="More help">
          <article className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true"><Sparkles /></span>
            <div>
              <h2>Ask Katabang</h2>
              <p>Get quick guidance while you use KAILA. Katabang never chooses providers or prices.</p>
            </div>
            <Link href="/home">Open Home to chat <ArrowRight aria-hidden="true" /></Link>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true"><LifeBuoy /></span>
            <div>
              <h2>Still need help?</h2>
              <p>Send a support request and follow replies in one place.</p>
            </div>
            <Link href="/support">Contact support <ArrowRight aria-hidden="true" /></Link>
            <a className={styles.email} href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </article>
        </aside>
      </div>

      <footer className={styles.footer}>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/account-deletion">Account deletion</Link>
        <Link href="/safety">Safety</Link>
      </footer>
    </main>
  );
}
