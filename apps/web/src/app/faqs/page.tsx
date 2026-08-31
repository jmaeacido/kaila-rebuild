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
import { usePublicSessionStatus } from "../auth-guard";
import { faqGroups as groups, type FaqItem } from "./faq-data";
import styles from "./faqs.module.css";

const groupIcons = {
  "getting-started": Sparkles,
  clients: Users,
  providers: BriefcaseBusiness,
  "trust-safety": ShieldCheck,
  "app-help": Smartphone,
} as const;

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
  const publicSessionStatus = usePublicSessionStatus();
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
      {publicSessionStatus === "anonymous" ? (
        <nav className={styles.topbar} aria-label="FAQs navigation">
          <Link className={styles.brand} href="/" aria-label="KAILA public home">
            <BrandMark priority />
          </Link>
          <Link className={styles.back} href="/">
            <ArrowLeft aria-hidden="true" />
            KAILA home
          </Link>
        </nav>
      ) : null}

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
