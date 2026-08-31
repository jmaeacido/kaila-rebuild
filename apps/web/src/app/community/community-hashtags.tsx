import Link from "next/link";
import styles from "./community.module.css";

type CommunityHashtagsProps = {
  tags: string[];
  compact?: boolean;
};

export function CommunityHashtags({ tags, compact = false }: CommunityHashtagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className={compact ? `${styles.hashtags} ${styles.hashtagsCompact}` : styles.hashtags} aria-label="Hashtags">
      {tags.map((tag) => (
        <li key={tag}>
          <Link className={styles.hashtag} href={`/community?tag=${encodeURIComponent(tag)}`}>
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
