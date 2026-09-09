import Image from "next/image";
import { CommunityMedia } from "./community-client";
import styles from "./community.module.css";

type CommunityPostMediaGridProps = {
  media: CommunityMedia[];
  limit?: number;
  showPending?: boolean;
  onMediaClick?: (index: number) => void;
};

function mediaLayoutClass(count: number): string {
  if (count === 1) return `${styles.media} ${styles.mediaCount1}`;
  if (count === 3) return `${styles.media} ${styles.mediaCount3}`;
  return styles.media;
}

export function CommunityPostMediaGrid({ media, limit = 4, showPending = false, onMediaClick }: CommunityPostMediaGridProps) {
  const items = media
    .filter((item) => item.url || (showPending && (item.scanStatus === "pending" || item.scanStatus === "failed")))
    .slice(0, limit);
  if (items.length === 0) return null;

  const clickable = items.filter((item) => item.url);

  return (
    <div className={mediaLayoutClass(items.length)}>
      {items.map((item) => {
        if (!item.url) {
          return (
            <div className={`${styles.mediaTileStatic} ${styles.mediaPending}`} key={item.id}>
              {item.scanStatus === "failed" ? "Photo could not be scanned" : "Scanning photo…"}
            </div>
          );
        }

        const image = <Image unoptimized width={720} height={480} src={item.url} alt={item.originalName.endsWith(".webp") ? "Post photo" : item.originalName} />;
        if (!onMediaClick) {
          return <div className={styles.mediaTileStatic} key={item.id}>{image}</div>;
        }

        const viewerIndex = clickable.findIndex((entry) => entry.id === item.id);
        return (
          <button
            type="button"
            className={styles.mediaTile}
            key={item.id}
            onClick={() => onMediaClick(Math.max(0, viewerIndex))}
            aria-label={`View ${item.originalName}`}
          >
            {image}
          </button>
        );
      })}
    </div>
  );
}
