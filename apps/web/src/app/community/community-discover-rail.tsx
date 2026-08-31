"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardList, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { CommunityFeedContext } from "./community-client";
import styles from "./community.module.css";

type CommunityDiscoverRailProps = {
  context: CommunityFeedContext | null;
  isProvider: boolean;
  ready: boolean;
};

export function CommunityDiscoverRail({ context, isProvider, ready }: CommunityDiscoverRailProps) {
  const trending = context?.trendingTags ?? [];
  const newProviders = context?.newProviders ?? [];
  const ctaHref = isProvider ? "/opportunities" : "/post-job";
  const ctaLabel = isProvider ? "Find work" : "Post a job";
  const CtaIcon = isProvider ? BriefcaseBusiness : ClipboardList;

  return (
    <aside className={styles.discoverRail} aria-label="Discover locally">
      <section className={styles.railCard}>
        <p className={styles.railEyebrow}>Need help now?</p>
        <Link className={styles.railCta} href={ctaHref}>
          <CtaIcon aria-hidden="true" />
          <span>{ctaLabel}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      {ready && trending.length > 0 ? (
        <section className={styles.railCard}>
          <p className={styles.railEyebrow}>
            <Sparkles aria-hidden="true" />
            Trending near you
          </p>
          <ul className={styles.trendingList}>
            {trending.map((item) => (
              <li key={item.tag}>
                <Link className={styles.trendingLink} href={`/community?tag=${encodeURIComponent(item.tag)}`}>
                  <span>#{item.tag}</span>
                  <small>{item.count}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ready && newProviders.length > 0 ? (
        <section className={styles.railCard}>
          <p className={styles.railEyebrow}>New providers near you</p>
          <ul className={styles.providerList}>
            {newProviders.map((item) => (
              <li key={item.id}>
                <Link className={styles.providerCard} href={`/community/${item.id}`}>
                  <span className={styles.providerThumb} aria-hidden="true">
                    {item.mediaUrl ? (
                      <Image src={item.mediaUrl} alt="" width={44} height={44} unoptimized />
                    ) : (
                      <UserRound aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.providerCopy}>
                    <strong>{item.title}</strong>
                    {item.areaLabel ? <small>{item.areaLabel}</small> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.railCard} ${styles.safetyCard}`}>
        <p className={styles.railEyebrow}>
          <ShieldCheck aria-hidden="true" />
          Community safety
        </p>
        <p className={styles.safetyCopy}>Share useful local updates and report anything that feels unsafe.</p>
        <Link className={styles.safetyLink} href="/safety">
          Safety tips
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </aside>
  );
}
