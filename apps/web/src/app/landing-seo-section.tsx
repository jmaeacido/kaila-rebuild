import Link from "next/link";
import type { PublicCommunityPost } from "../lib/community-public";
import styles from "./page.module.css";

export function LandingSeoSection({ recentPosts }: { recentPosts: PublicCommunityPost[] }) {
  return (
    <section className={styles.seoSection} aria-labelledby="kaila-discovery-title">
      <div className={styles.seoSectionInner}>
        <p className={styles.kicker}>DISCOVER KAILA</p>
        <h2 id="kaila-discovery-title">KAILA is the local services marketplace for the Philippines</h2>
        <p>
          KAILA helps people hire trusted independent service providers nearby. Post a job, compare local offers,
          chat in one place, follow travel and work progress, and leave ratings when the job is done. KAILA is a
          marketplace platform — not a service provider — so clients stay in control of who they hire and what they pay.
        </p>
        <div className={styles.seoColumns}>
          <div>
            <h3>Popular local services on KAILA</h3>
            <ul>
              {[
                "Plumbing and repairs",
                "Electrical work",
                "Cleaning and housekeeping",
                "Beauty and personal care",
                "Tutoring and lessons",
                "Gadget and appliance repair",
                "Home maintenance",
                "Event and errand help",
              ].map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Find KAILA online</h3>
            <ul className={styles.seoLinks}>
              <li>
                <Link href="/community">Browse the KAILA Community feed</Link>
              </li>
              <li>
                <Link href="/faqs">Read KAILA FAQs</Link>
              </li>
              <li>
                <Link href="/download">Download the KAILA Android app</Link>
              </li>
              <li>
                <Link href="/privacy">Review the KAILA privacy policy</Link>
              </li>
              <li>
                <Link href="/terms">Review the KAILA terms of service</Link>
              </li>
              <li>
                <Link href="/account-deletion">Review KAILA account deletion</Link>
              </li>
            </ul>
            {recentPosts.length > 0 ? (
              <>
                <h3>Recent community posts</h3>
                <ul className={styles.seoLinks}>
                  {recentPosts.map((post) => (
                    <li key={post.id}>
                      <Link href={`/community/${post.id}`}>{post.title}</Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
