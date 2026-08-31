"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Images } from "lucide-react";
import { ProviderPortfolioViewer } from "./provider-portfolio-viewer";
import styles from "./provider-portfolio-gallery.module.css";

export type ProviderPortfolioItem = {
  id: string;
  caption: string | null;
  downloadPath: string;
  likeCount?: number;
  liked?: boolean;
  demo?: boolean;
};

type ProviderPortfolioGalleryProps = {
  items: ProviderPortfolioItem[];
  title?: string;
  compact?: boolean;
  emptyMessage?: string;
  previewNote?: string;
  onToggleLike?: (item: ProviderPortfolioItem) => Promise<void> | void;
  liking?: boolean;
  canLike?: boolean;
};

export function ProviderPortfolioGallery({
  items,
  title = "Work photos",
  compact = false,
  emptyMessage = "This provider has not shared approved work photos yet.",
  previewNote,
  onToggleLike,
  liking = false,
  canLike = true,
}: ProviderPortfolioGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <section
        className={compact ? styles.compact : styles.section}
        aria-labelledby="provider-portfolio-heading"
      >
        <div className={styles.heading}>
          <Images aria-hidden="true" />
          <div>
            <h2 id="provider-portfolio-heading">{title}</h2>
            <p>
              {previewNote
                ? previewNote
                : items.length === 0
                  ? "Project shots appear here after KAILA approves them"
                  : `${items.length} photo${items.length === 1 ? "" : "s"} from completed work`}
            </p>
          </div>
        </div>
        {items.length === 0 ? (
          <p className={styles.empty}>{emptyMessage}</p>
        ) : (
          <ul className={styles.grid}>
            {items.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.tileButton}
                  onClick={() => setViewerIndex(itemIndex)}
                  aria-label={`View ${item.caption || "work photo"}`}
                >
                  <figure className={styles.tile}>
                    <Image
                      unoptimized
                      src={item.downloadPath}
                      alt={item.caption || "Provider work photo"}
                      width={960}
                      height={720}
                      className={styles.image}
                      sizes="(min-width: 64rem) 320px, 50vw"
                    />
                    <figcaption>
                      <span>{item.caption || "Work photo"}</span>
                      {(item.likeCount ?? 0) > 0 ? (
                        <span className={styles.tileLikes}>
                          <Heart aria-hidden="true" fill={item.liked ? "currentColor" : "none"} />
                          {item.likeCount}
                        </span>
                      ) : null}
                    </figcaption>
                  </figure>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewerIndex !== null ? (
        <ProviderPortfolioViewer
          items={items}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onToggleLike={onToggleLike ?? (() => undefined)}
          liking={liking}
          canLike={canLike && Boolean(onToggleLike)}
        />
      ) : null}
    </>
  );
}
