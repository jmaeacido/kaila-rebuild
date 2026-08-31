import Image from "next/image";
import { CommunityMedia } from "./community-client";
import styles from "./community.module.css";

type CommunityPostMediaGridProps = {
  media: CommunityMedia[];
  limit?: number;
  onMediaClick?: (index: number) => void;
};

function mediaLayoutClass(count: number): string {
  if (count === 1) return `${styles.media} ${styles.mediaCount1}`;
  if (count === 3) return `${styles.media} ${styles.mediaCount3}`;
  return styles.media;
}

export function CommunityPostMediaGrid({ media, limit = 4, onMediaClick }: CommunityPostMediaGridProps) {
  const items = media.filter((item) => item.url).slice(0, limit);
  if (items.length === 0) return null;

  return (
    <div className={mediaLayoutClass(items.length)}>
      {items.map((item, index) => {
        const image = <Image unoptimized width={720} height={480} src={item.url!} alt={item.originalName} />;
        if (!onMediaClick) {
          return <div className={styles.mediaTileStatic} key={item.id}>{image}</div>;
        }

        return (
          <button
            type="button"
            className={styles.mediaTile}
            key={item.id}
            onClick={() => onMediaClick(index)}
            aria-label={`View ${item.originalName}`}
          >
            {image}
          </button>
        );
      })}
    </div>
  );
}
