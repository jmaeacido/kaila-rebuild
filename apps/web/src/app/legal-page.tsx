import { BrandMark } from "../components/brand-mark";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./legal-page.module.css";

export type LegalSection = {
  heading: string;
  body: string;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
  children?: React.ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
  children,
}: LegalPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar} aria-label="Legal page navigation">
          <Link className={styles.brand} href="/" aria-label="KAILA home">
            <BrandMark priority />
          </Link>
          <Link className={styles.back} href="/">
            <ArrowLeft aria-hidden="true" />
            Back home
          </Link>
        </nav>

        <article className={styles.card}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p>Last updated {updated}</p>
          </header>

          {sections.map((section) => (
            <section className={styles.section} key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          {children}
        </article>

        <footer className={styles.footer}>
          <Link href="/faqs">FAQs</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/account-deletion">Account deletion</Link>
        </footer>
      </div>
    </main>
  );
}

export { styles as legalPageStyles };
