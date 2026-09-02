"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import type { ProviderPortfolioItem } from "./provider-portfolio-gallery";
import styles from "./provider-portfolio-viewer.module.css";

type ProviderPortfolioViewerProps = {
  items: ProviderPortfolioItem[];
  initialIndex: number;
  onClose: () => void;
  onToggleLike: (item: ProviderPortfolioItem) => void;
  liking?: boolean;
  canLike?: boolean;
};

export function ProviderPortfolioViewer({
  items,
  initialIndex,
  onClose,
  onToggleLike,
  liking = false,
  canLike = true,
}: ProviderPortfolioViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];

  const goPrevious = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((current) => (current - 1 + items.length) % items.length);
  }, [items.length]);

  const goNext = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIndex(initialIndex), 0);
    return () => window.clearTimeout(timer);
  }, [initialIndex]);

  useEffect(() => {
    const html = document.documentElement;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      html.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [goNext, goPrevious, onClose]);

  if (!item) return null;

  return createPortal(
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="Work photo viewer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.toolbar}>
          <button type="button" className={styles.iconButton} data-flat-button onClick={onClose} aria-label="Close viewer">
            <X aria-hidden="true" />
          </button>
          <p className={styles.counter}>
            {index + 1} / {items.length}
          </p>
          <span aria-hidden="true" />
        </header>

        <div className={styles.stage}>
          {items.length > 1 ? (
            <button type="button" className={`${styles.navButton} ${styles.navPrevious}`} data-flat-button onClick={goPrevious} aria-label="Previous photo">
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}
          <Image
            unoptimized
            key={item.id}
            src={item.downloadPath}
            alt={item.caption || "Provider work photo"}
            width={1200}
            height={900}
            className={styles.stageImage}
          />
          {items.length > 1 ? (
            <button type="button" className={`${styles.navButton} ${styles.navNext}`} data-flat-button onClick={goNext} aria-label="Next photo">
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerCopy}>
            <p className={styles.caption}>{item.caption || "Work photo"}</p>
            {items.length > 1 ? (
              <div className={styles.dots} aria-hidden="true">
                {items.map((entry, dotIndex) => (
                  <span key={entry.id} className={dotIndex === index ? styles.dotActive : styles.dot} />
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className={item.liked ? `${styles.likeButton} ${styles.likeButtonActive}` : styles.likeButton}
            data-flat-button
            disabled={liking || !canLike}
            aria-pressed={item.liked}
            aria-label={canLike ? (item.liked ? "Remove like" : "Like this photo") : "Sign in to like this photo"}
            onClick={() => onToggleLike(item)}
          >
            <Heart aria-hidden="true" fill={item.liked ? "currentColor" : "none"} />
            <span>{item.likeCount ?? 0}</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
