import type { Metadata } from "next";
import Link from "next/link";
import { AndroidDownloadSection } from "../../components/android-download-section";
import { BrandMark } from "../../components/brand-mark";
import { ThemeToggle } from "../../components/theme-toggle";
import { androidAppStructuredData, breadcrumbItems } from "../../lib/seo-structured-data";
import { publicPageMetadata, safeJsonLd } from "../seo";
import styles from "./page.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Download KAILA for Android",
  description:
    "Install the official KAILA Android app to post jobs, compare local provider offers, and manage service work in the Philippines.",
  path: "/download",
});

export default function DownloadPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              androidAppStructuredData(),
              {
                "@type": "BreadcrumbList",
                itemListElement: breadcrumbItems([
                  { name: "KAILA", path: "/" },
                  { name: "Download", path: "/download" },
                ]),
              },
            ],
          }),
        }}
      />
      <main className={styles.page}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/" aria-label="KAILA home">
            <BrandMark className={styles.brandLogo} priority showBull />
          </Link>
          <div className={styles.headerActions}>
            <ThemeToggle className={styles.headerTheme} />
            <Link className={styles.backLink} href="/">
              Back to home
            </Link>
          </div>
        </header>

        <AndroidDownloadSection showIntro={false} />
      </main>
    </>
  );
}
