import Link from "next/link";
import type { PublicCommunityPost } from "../../lib/community-public";
import styles from "./community.module.css";

export function CommunityCrawlLinks({ posts }: { posts: PublicCommunityPost[] }) {
  if (posts.length === 0) return null;

  return (
    <nav className={styles.crawlLinks} aria-label="Published community posts">
      <h2 className={styles.crawlLinksTitle}>Published community posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/community/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
