"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { communityFilters } from "./community-constants";
import type { CommunityFeedContext } from "./community-client";
import styles from "./community.module.css";

type CommunityBrowseRailProps = {
  filter: string;
  tag: string;
  homeArea: CommunityFeedContext["homeArea"];
  onFilterChange: (value: string) => void;
  onClearTag: () => void;
};

export function CommunityBrowseRail({
  filter,
  tag,
  homeArea,
  onFilterChange,
  onClearTag,
}: CommunityBrowseRailProps) {
  return (
    <aside className={styles.browseRail} aria-label="Browse community">
      {homeArea ? (
        <section className={styles.railCard}>
          <p className={styles.railEyebrow}>Your area</p>
          <p className={styles.railArea}>
            <MapPin aria-hidden="true" />
            <span>Posts near {homeArea.name}</span>
          </p>
        </section>
      ) : null}

      <section className={styles.railCard}>
        <p className={styles.railEyebrow}>Browse</p>
        <div className={styles.railFilters} role="tablist" aria-label="Filter community posts">
          {communityFilters.map((item) => (
            <button
              className={`${styles.railFilter} ${filter === item.value ? styles.railFilterActive : ""}`}
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {tag ? (
        <section className={styles.railCard}>
          <p className={styles.railEyebrow}>Active tag</p>
          <div className={styles.railTagRow}>
            <Link
              className={`${styles.hashtag} ${styles.hashtagActive}`}
              href={`/community?tag=${encodeURIComponent(tag)}`}
              aria-current="page"
            >
              #{tag}
            </Link>
            <button className={styles.tagFilterClear} type="button" onClick={onClearTag} aria-label="Clear hashtag filter">
              <X aria-hidden="true" />
              Clear
            </button>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
