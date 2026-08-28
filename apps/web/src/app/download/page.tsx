import type { Metadata } from "next";
import Link from "next/link";
import { AndroidDownloadSection } from "../../components/android-download-section";
import { BrandMark } from "../../components/brand-mark";
import { ThemeToggle } from "../../components/theme-toggle";
import { publicPageMetadata } from "../seo";
import styles from "./page.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: "Download KAILA for Android",
  description:
    "Install the official KAILA Android app. Download the APK or scan the QR code to get local help on your phone.",
  path: "/download",
});

export default function DownloadPage() {
  return (
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
  );
}
